const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/push');

// GET /api/posts - Get Feed
router.get('/', auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    // Basic algorithm: sorted by createdAt for now, 
    // but the requirement says: (likes * 0.4) + (comments * 0.3) + (recency * 0.3)
    // We'll use a simplified version for now or implement it via aggregation
    const posts = await Post.aggregate([
      {
        $addFields: {
          score: {
            $add: [
              { $multiply: ["$likesCount", 0.4] },
              { $multiply: ["$commentsCount", 0.3] },
              {
                $multiply: [
                  {
                    $divide: [
                      1,
                      { $add: [1, { $divide: [{ $subtract: [new Date(), "$createdAt"] }, 3600000] }] } // recency in hours
                    ]
                  },
                  0.3
                ]
              }
            ]
          },
          isLiked: { $in: [new mongoose.Types.ObjectId(req.user.id), "$likes"] }
        }
      },
      { $sort: { score: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          'user.password': 0,
          'user.email': 0,
          likes: 0
        }
      }
    ]);

    const total = await Post.countDocuments();

    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total
    });
  } catch (error) {
    console.error('[Feed] Error:', error);
    res.status(500).json({ message: 'Erreur lors du chargement du fil d\'actualité' });
  }
});

// POST /api/posts - Create Post
router.post('/', auth, async (req, res) => {
  const { tmdbId, mediaType, title, posterPath, backdropPath, rating, review, genres, year } = req.body;

  if (!tmdbId || !mediaType || !title || !posterPath || !rating) {
    return res.status(400).json({ message: 'Données manquantes' });
  }

  try {
    const post = new Post({
      userId: req.user.id,
      tmdbId,
      mediaType,
      title,
      posterPath,
      backdropPath,
      rating,
      review,
      genres,
      year
    });

    await post.save();
    
    // Populating user for the response
    const populatedPost = await Post.findById(post._id).populate('userId', 'name avatar');

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error('[CreatePost] Error:', error);
    res.status(500).json({ message: 'Erreur lors de la création du post' });
  }
});

// GET /api/posts/:id - Get Single Post
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('userId', 'name avatar username avatarUrl');
      
    if (!post) {
      return res.status(404).json({ message: 'Post introuvable' });
    }

    // Add isLiked field dynamically
    const postObj = post.toObject();
    postObj.isLiked = post.likes.includes(req.user.id);
    
    // Normalize user to match feed structure
    if (postObj.userId) {
      postObj.user = postObj.userId;
    }

    res.json(postObj);
  } catch (error) {
    console.error('[GetPost] Error:', error);
    res.status(500).json({ message: 'Erreur lors du chargement du post' });
  }
});

// POST /api/posts/:id/share - Share Post to Friends
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { friendIds } = req.body;
    if (!friendIds || !friendIds.length) {
      return res.status(400).json({ message: 'Aucun ami sélectionné' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post introuvable' });

    const io = req.app.get('io');
    const sender = await User.findById(req.user.id);

    for (let friendId of friendIds) {
      // Find or create direct conversation
      const allMembers = [req.user.id, friendId].sort();
      let conversation = await Conversation.findOne({
        type: 'direct',
        members: { $all: allMembers, $size: 2 }
      });

      if (!conversation) {
        conversation = new Conversation({
          type: 'direct',
          members: allMembers,
          creator: req.user.id,
          unreadCounts: allMembers.map(id => ({ userId: id, count: 0 }))
        });
        await conversation.save();
      }

      // Create Message
      const message = new Message({
        conversationId: conversation._id,
        senderId: req.user.id,
        type: 'post_share',
        sharedPost: post._id,
      });
      await message.save();

      // Update Conversation
      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: {
          content: '🎬 Publication partagée',
          type: 'post_share',
          senderId: req.user.id,
          createdAt: Date.now()
        },
        $inc: { 'unreadCounts.$[elem].count': 1 }
      }, {
        arrayFilters: [{ 'elem.userId': { $ne: req.user.id } }]
      });

      // Populate for socket
      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'name avatar')
        .populate({ path: 'sharedPost', populate: { path: 'userId', select: 'name username avatar avatarUrl' }});
      
      if (io) {
        io.to(`conversation:${conversation._id}`).emit('new-message', populatedMessage);
      }

      // Notification
      const notif = new Notification({
        userId: friendId,
        type: 'new_message',
        fromUser: req.user.id,
        data: { conversationId: conversation._id }
      });
      await notif.save();

      await sendPushNotification(
        friendId,
        sender ? sender.name : 'Nouveau message',
        '🎬 Publication partagée',
        { type: 'new_message', conversationId: conversation._id }
      );
    }

    res.json({ message: 'Publication partagée avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors du partage' });
  }
});

// PUT /api/posts/:id - Edit Post
router.put('/:id', auth, async (req, res) => {
  const { rating, review } = req.body;

  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.user.id });
    if (!post) {
      return res.status(404).json({ message: 'Post non trouvé ou non autorisé' });
    }

    if (rating !== undefined) post.rating = rating;
    if (review !== undefined) post.review = review;

    await post.save();
    
    const populatedPost = await Post.findById(post._id).populate('userId', 'name avatar');
    res.json(populatedPost);
  } catch (error) {
    console.error('[EditPost] Error:', error);
    res.status(500).json({ message: 'Erreur lors de la modification' });
  }
});

// DELETE /api/posts/:id - Delete Post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.user.id });
    if (!post) {
      return res.status(404).json({ message: 'Post non trouvé ou non autorisé' });
    }

    await Post.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ postId: req.params.id });

    res.json({ message: 'Post supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
});

// POST /api/posts/:id/like - Toggle Like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post non trouvé' });

    const isLiked = post.likes.includes(req.user.id);
    
    if (isLiked) {
      post.likes = post.likes.filter(id => id.toString() !== req.user.id);
      post.likesCount = Math.max(0, post.likesCount - 1);
    } else {
      post.likes.push(req.user.id);
      post.likesCount += 1;

      // Only send notification if liking someone else's post
      if (post.userId.toString() !== req.user.id.toString()) {
        const notif = new Notification({
          userId: post.userId,
          type: 'post_like',
          fromUser: req.user.id,
          data: { postId: post._id, title: post.title }
        });
        await notif.save();
        
        await sendPushNotification(
          post.userId, 
          'Nouveau Like', 
          `Quelqu'un a aimé votre avis sur ${post.title}`,
          { type: 'post_like', postId: post._id }
        );
      }
    }

    await post.save();
    res.json({ liked: !isLiked, likesCount: post.likesCount });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du like' });
  }
});

// GET /api/posts/:id/comments - Get Comments
router.get('/:id/comments', auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  try {
    const comments = await Comment.find({ postId: req.params.id })
      .populate('userId', 'name avatar username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du chargement des commentaires' });
  }
});

// POST /api/posts/:id/comments - Add Comment
router.post('/:id/comments', auth, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: 'Texte requis' });

  try {
    const comment = new Comment({
      postId: req.params.id,
      userId: req.user.id,
      text
    });

    await comment.save();

    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { commentsCount: 1 } });
    const sender = await User.findById(req.user.id);

    // Send Notification if commenting on someone else's post
    if (post && post.userId.toString() !== req.user.id.toString()) {
      const notif = new Notification({
        userId: post.userId,
        type: 'post_comment',
        fromUser: req.user.id,
        data: { postId: post._id, title: post.title }
      });
      await notif.save();
      
      await sendPushNotification(
        post.userId, 
        'Nouveau Commentaire', 
        `${sender ? sender.name : "Quelqu'un"} a commenté votre avis sur ${post.title}`,
        { type: 'post_comment', postId: post._id }
      );
    }

    // Handle Mentions
    const mentions = text.match(/@([\w.-]+)/g);
    if (mentions) {
      // Regex /@([\w.-]+)/ might miss non-ascii handle chars. We can use /@(\S+)/g, but let's just make it case-insensitive regex for the handles
      const usernames = [...new Set(mentions.map(m => m.slice(1)))];
      
      // Use aggregation to find users whose name without spaces matches the handle case-insensitively
      const mentionedUsers = await User.aggregate([
        {
          $addFields: {
            strippedName: {
              $replaceAll: { input: "$name", find: " ", replacement: "" }
            }
          }
        },
        {
          $match: {
            strippedName: { $in: usernames.map(u => new RegExp(`^${u}$`, 'i')) }
          }
        }
      ]);
      
      for (const user of mentionedUsers) {
        if (user._id.toString() !== req.user.id.toString()) {
          const notif = new Notification({
            userId: user._id,
            type: 'post_mention',
            fromUser: req.user.id,
            data: { postId: post._id, title: post.title }
          });
          await notif.save();
          
          await sendPushNotification(
            user._id,
            'Nouvelle mention',
            `${sender ? sender.name : "Quelqu'un"} vous a mentionné dans un commentaire`,
            { type: 'post_mention', postId: post._id }
          );
        }
      }
    }

    const populatedComment = await Comment.findById(comment._id).populate('userId', 'name avatar username');
    res.status(201).json(populatedComment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de l'ajout du commentaire" });
  }
});

// DELETE /api/posts/:postId/comments/:commentId
router.delete('/:postId/comments/:commentId', auth, async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.commentId, userId: req.user.id });
    if (!comment) return res.status(404).json({ message: 'Commentaire non trouvé' });

    await Comment.findByIdAndDelete(req.params.commentId);
    await Post.findByIdAndUpdate(req.params.postId, { $inc: { commentsCount: -1 } });

    res.json({ message: 'Commentaire supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
});

// POST /api/posts/:id/report
router.post('/:id/report', auth, async (req, res) => {
  const { reason } = req.body;
  try {
    const report = new Report({
      reporterId: req.user.id,
      targetType: 'post',
      targetId: req.params.id,
      reason
    });
    await report.save();
    res.json({ message: 'Signalement envoyé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du signalement' });
  }
});

module.exports = router;
