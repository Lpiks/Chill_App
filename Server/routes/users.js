const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const Post = require('../models/Post');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const streamifier = require('streamifier');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// PUT /api/users/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email, avatarUrl } = req.body;
    const updateData = { name };
    
    if (email) {
      updateData.email = email.toLowerCase().trim();
    }
    
    if (avatarUrl) {
      updateData.avatar = avatarUrl;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du profil' });
  }
});

// PUT /api/users/password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (error) {
    console.error('Password Update Error:', error);
    res.status(500).json({ message: 'Erreur lors du changement de mot de passe' });
  }
});

// POST /api/users/avatar
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'cinedz_avatars' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          return res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'image' });
        }
        res.json({ avatarUrl: result.secure_url });
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (error) {
    console.error('Avatar Upload Error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload de l\'avatar' });
  }
});

// GET /api/users/search?q=name
router.get('/search', auth, async (req, res) => {
// ... existing code
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.id } },
        { role: { $ne: 'admin' } },
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { phone: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    }).select('name avatar');

    // For each user, get friendship status
    const results = await Promise.all(users.map(async (u) => {
      const friendship = await Friendship.findOne({
        $or: [
          { requester: req.user.id, recipient: u._id },
          { requester: u._id, recipient: req.user.id }
        ]
      });

      let status = 'none';
      let requestId = null;
      if (friendship) {
        if (friendship.status === 'accepted') {
          status = 'friends';
        } else {
          status = friendship.requester.toString() === req.user.id ? 'pending_sent' : 'pending_received';
        }
        requestId = friendship._id;
      }

      return {
        id: u._id,
        _id: u._id,
        name: u.name,
        avatar: u.avatar,
        friendshipStatus: status,
        requestId
      };
    }));

    res.json(results);
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/suggestions
router.get('/suggestions', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const userGenres = Object.keys(currentUser.tasteProfile?.genres || {});

    // Users with existing relation
    const existingRelations = await Friendship.find({
      $or: [{ requester: req.user.id }, { recipient: req.user.id }]
    });
    const excludedIds = [
      req.user.id,
      ...existingRelations.map(f => f.requester.toString() === req.user.id ? f.recipient.toString() : f.requester.toString())
    ];

    // Simple suggestion: users with at least one common genre, explicitly hiding admins
    let query = { _id: { $nin: excludedIds }, role: { $ne: 'admin' } };
    if (userGenres.length > 0) {
      const genreQueries = userGenres.map(g => ({ [`tasteProfile.genres.${g}`]: { $exists: true } }));
      query.$or = genreQueries;
    }

    const suggestions = await User.find(query)
      .select('name avatar tasteProfile')
      .limit(10);

    const results = suggestions.map(u => ({
      id: u._id,
      _id: u._id,
      name: u.name,
      avatar: u.avatar,
      friendshipStatus: 'none'
    }));

    res.json(results);
  } catch (error) {
    console.error('Suggestions Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/:userId/profile
router.get('/:userId/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('name avatar createdAt tasteProfile');
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const stats = {
      posts: await Post.countDocuments({ userId: req.params.userId }),
      friends: await Friendship.countDocuments({
        $or: [{ requester: req.params.userId }, { recipient: req.params.userId }],
        status: 'accepted'
      }),
      watched: 0
    };

    // Friendship status
    const friendship = await Friendship.findOne({
      $or: [
        { requester: req.user.id, recipient: req.params.userId },
        { requester: req.params.userId, recipient: req.user.id }
      ]
    });

    let friendshipStatus = 'none';
    let requestId = null;
    if (friendship) {
      if (friendship.status === 'accepted') {
        friendshipStatus = 'friends';
      } else {
        friendshipStatus = friendship.requester.toString() === req.user.id ? 'pending_sent' : 'pending_received';
      }
      requestId = friendship._id;
    }

    const latestRating = await Post.findOne({ userId: req.params.userId }).sort({ rating: -1, createdAt: -1 });

    res.json({
      user,
      stats,
      friendshipStatus,
      requestId,
      coverBackdrop: latestRating ? latestRating.backdropPath : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
