const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Friendship = require('../models/Friendship');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/push');

// GET /api/friends - Get friends list
router.get('/', auth, async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [
        { requester: req.user.id, status: 'accepted' },
        { recipient: req.user.id, status: 'accepted' }
      ]
    }).populate('requester recipient', 'name avatar lastSeen');

    const friends = friendships.map(f => {
      const friend = f.requester._id.toString() === req.user.id ? f.recipient : f.requester;
      return {
        id: friend._id,
        name: friend.name,
        avatar: friend.avatar,
        lastSeen: friend.lastSeen,
        friendshipId: f._id
      };
    });

    res.json(friends);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/friends/requests - Get pending requests (received + sent)
router.get('/requests', auth, async (req, res) => {
  try {
    const received = await Friendship.find({ recipient: req.user.id, status: 'pending' })
      .populate('requester', 'name avatar');
    const sent = await Friendship.find({ requester: req.user.id, status: 'pending' })
      .populate('recipient', 'name avatar');

    res.json({ received, sent });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/friends/request/:userId - Send request
router.post('/request/:userId', auth, async (req, res) => {
  try {
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ message: 'Impossible de s\'ajouter soi-même' });
    }

    // Check existing
    const existing = await Friendship.findOne({
      $or: [
        { requester: req.user.id, recipient: req.params.userId },
        { requester: req.params.userId, recipient: req.user.id }
      ]
    });

    if (existing) {
      return res.status(400).json({ message: 'Relation déjà existante' });
    }

    const friendship = new Friendship({
      requester: req.user.id,
      recipient: req.params.userId,
      status: 'pending'
    });

    await friendship.save();
    console.log(`🤝 Friend Request created: ${req.user.id} -> ${req.params.userId}`);

    // Create Notification
    const requester = await User.findById(req.user.id);
    const notification = new Notification({
      userId: req.params.userId,
      type: 'friend_request',
      fromUser: req.user.id,
      data: { friendshipId: friendship._id }
    });
    await notification.save();

    // Push Notification
    await sendPushNotification(
      req.params.userId,
      'Nouvelle demande d\'ami',
      `${requester.name} veut vous ajouter`,
      { type: 'friend_request', friendshipId: friendship._id }
    );

    res.status(201).json(friendship);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/friends/request/:requestId/accept
router.put('/request/:requestId/accept', auth, async (req, res) => {
  try {
    const friendship = await Friendship.findOne({
      _id: req.params.requestId,
      recipient: req.user.id,
      status: 'pending'
    });

    if (!friendship) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    friendship.status = 'accepted';
    friendship.updatedAt = Date.now();
    await friendship.save();

    // Notification to requester
    const recipient = await User.findById(req.user.id);
    const notification = new Notification({
      userId: friendship.requester,
      type: 'request_accepted',
      fromUser: req.user.id
    });
    await notification.save();

    // Push Notification
    await sendPushNotification(
      friendship.requester,
      'Demande acceptée',
      `${recipient.name} a accepté votre demande d'ami`,
      { type: 'request_accepted' }
    );

    res.json(friendship);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/friends/request/:requestId/decline
router.delete('/request/:requestId/decline', auth, async (req, res) => {
  try {
    const friendship = await Friendship.findOneAndDelete({
      _id: req.params.requestId,
      recipient: req.user.id,
      status: 'pending'
    });

    if (!friendship) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    res.json({ message: 'Demande refusée' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/friends/request/:requestId/cancel
router.delete('/request/:requestId/cancel', auth, async (req, res) => {
  try {
    const friendship = await Friendship.findOneAndDelete({
      _id: req.params.requestId,
      requester: req.user.id,
      status: 'pending'
    });

    if (!friendship) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    res.json({ message: 'Demande annulée' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/friends/:userId - Unfriend
router.delete('/:userId', auth, async (req, res) => {
  try {
    const friendship = await Friendship.findOneAndDelete({
      $or: [
        { requester: req.user.id, recipient: req.params.userId, status: 'accepted' },
        { requester: req.params.userId, recipient: req.user.id, status: 'accepted' }
      ]
    });

    if (!friendship) {
      return res.status(404).json({ message: 'Ami non trouvé' });
    }

    res.json({ message: 'Ami supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
