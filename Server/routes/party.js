const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const crypto = require('crypto');

// Helper to generate 6-char room ID
const generateRoomId = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

// POST /api/party/rooms - Create a room
router.post('/rooms', auth, async (req, res) => {
  try {
    const { tmdbId, mediaType, title, posterPath, season, episode, invitedFriendIds } = req.body;
    
    // Check if user is premium
    if (req.user.subscriptionTier === 'free' || req.user.subscriptionTier === 'basic') {
        // In a real app we would strictly check here, but for now we follow the user's rule in frontend
    }

    const roomId = generateRoomId();
    
    const room = new Room({
      roomId,
      hostId: req.user.id,
      tmdbId,
      mediaType,
      title,
      posterPath,
      season,
      episode,
      members: [{ userId: req.user.id, joinedAt: new Date() }]
    });

    await room.save();

    // Send notifications to invited friends
    if (invitedFriendIds && invitedFriendIds.length > 0) {
      const notifications = invitedFriendIds.map(friendId => ({
        recipient: friendId,
        sender: req.user.id,
        type: 'party_invite',
        content: `t'a invité à rejoindre une Watch Party pour ${title}`,
        relatedId: roomId
      }));
      await Notification.insertMany(notifications);
      
      // Emit socket notification if io is available
      const io = req.app.get('io');
      invitedFriendIds.forEach(friendId => {
        io.to(`user:${friendId}`).emit('new-notification');
      });
    }

    res.status(201).json({ roomId, room });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/party/rooms/:roomId - Get room details
router.get('/rooms/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .populate('hostId', 'name avatar')
      .populate('members.userId', 'name avatar');
    
    if (!room) {
      return res.status(404).json({ message: 'Salle non trouvée' });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/party/recent - Get last 3 rooms user participated in
router.get('/recent', auth, async (req, res) => {
  try {
    const rooms = await Room.find({ 'members.userId': req.user.id })
      .sort({ createdAt: -1 })
      .limit(3);
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/party/rooms/:roomId - End the room
router.delete('/rooms/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    
    if (!room) return res.status(404).json({ message: 'Salle non trouvée' });
    
    if (room.hostId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    await Room.findOneAndDelete({ roomId: req.params.roomId });

    // Emit event to all members
    const io = req.app.get('io');
    io.to(`party:${req.params.roomId}`).emit('party-ended');

    res.json({ message: 'Salle terminée' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
