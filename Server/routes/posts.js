const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Report = require('../models/Report');

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
      .populate('userId', 'name avatar')
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

    await Post.findByIdAndUpdate(req.params.id, { $inc: { commentsCount: 1 } });

    const populatedComment = await Comment.findById(comment._id).populate('userId', 'name avatar');
    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'ajout du commentaire' });
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
