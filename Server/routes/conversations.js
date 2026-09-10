const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendPushNotification } = require('../utils/push');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary Config (Should be in .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cinedz_voice',
    resource_type: 'auto',
    format: async (req, file) => 'm4a',
  },
});

const upload = multer({ storage: storage });

// Check Message Limit Middleware
const checkMessageLimit = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.subscriptionTier === 'premium') return next();

    const today = new Date().setHours(0, 0, 0, 0);
    const lastMessageDate = user.lastMessageDate ? new Date(user.lastMessageDate).setHours(0, 0, 0, 0) : 0;

    if (today > lastMessageDate) {
      user.dailyMessageCount = 0;
      user.lastMessageDate = Date.now();
    }

    if (user.dailyMessageCount >= 20) {
      return res.status(403).json({ message: 'Limite de messages atteinte. Passez à Premium !' });
    }

    req.userModel = user;
    next();
  } catch (error) {
    console.error('Limit Check Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/conversations
router.get('/', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ members: req.user.id })
      .populate('members', 'name avatar lastSeen')
      .sort({ 'lastMessage.createdAt': -1 });

    const populatedConversations = conversations.map(conv => {
      const convObj = conv.toObject();
      convObj.id = convObj._id;
      convObj.members = convObj.members.map(m => ({ ...m, id: m._id }));
      return convObj;
    });

    res.json(populatedConversations);
  } catch (error) {
    console.error('Fetch Conv Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/conversations
router.post('/', auth, async (req, res) => {
  try {
    const { memberIds, name } = req.body;
    const allMembers = [...new Set([...memberIds, req.user.id])];

    if (allMembers.length === 2) {
      const existing = await Conversation.findOne({
        type: 'direct',
        members: { $all: allMembers, $size: 2 }
      }).populate('members', 'name avatar lastSeen');

      if (existing) return res.json(existing);
    }

    const unreadCounts = allMembers.map(id => ({ userId: id, count: 0 }));

    const conversation = new Conversation({
      type: allMembers.length > 2 ? 'group' : 'direct',
      name,
      members: allMembers,
      creator: req.user.id,
      unreadCounts
    });

    await conversation.save();
    const populated = await Conversation.findById(conversation._id).populate('members', 'name avatar lastSeen');
    const convObj = populated.toObject();
    convObj.id = convObj._id;
    convObj.members = convObj.members.map(m => ({ ...m, id: m._id }));
    res.status(201).json(convObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/conversations/:id/messages
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const messages = await Message.find({ conversationId: req.params.id })
      .populate('senderId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/conversations/:id/messages
router.post('/:id/messages', [auth, checkMessageLimit], async (req, res) => {
  try {
    const { type, content, tmdbData } = req.body;
    const io = req.app.get('io');

    const message = new Message({
      conversationId: req.params.id,
      senderId: req.user.id,
      type,
      content,
      tmdbData
    });

    await message.save();

    await Conversation.findByIdAndUpdate(req.params.id, {
      lastMessage: {
        content: type === 'text' ? content : (type === 'voice' ? '🎤 Message vocal' : '🎬 Partage de film'),
        type,
        senderId: req.user.id,
        createdAt: Date.now()
      },
      $inc: { 'unreadCounts.$[elem].count': 1 }
    }, {
      arrayFilters: [{ 'elem.userId': { $ne: req.user.id } }]
    });

    if (req.userModel) {
      req.userModel.dailyMessageCount += 1;
      req.userModel.lastMessageDate = Date.now();
      await req.userModel.save();
    }

    const populatedMessage = await Message.findById(message._id).populate('senderId', 'name avatar');
    io.to(`conversation:${req.params.id}`).emit('new-message', populatedMessage);

    // Send Push Notifications & Save Notification Docs
    const conversation = await Conversation.findById(req.params.id);
    const sender = await User.findById(req.user.id);
    const notifications = [];
    conversation.members.forEach(memberId => {
      if (memberId.toString() !== req.user.id) {
        notifications.push({
          userId: memberId,
          type: 'new_message',
          fromUser: req.user.id,
          data: { conversationId: req.params.id }
        });
        sendPushNotification(
          memberId,
          sender ? sender.name : 'Nouveau message',
          type === 'text' ? content : (type === 'voice' ? '🎤 Message vocal' : '🎬 Partage de film'),
          { type: 'new_message', conversationId: req.params.id }
        );
      }
    });
    await Notification.insertMany(notifications);

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/conversations/:id/messages/voice
router.post('/:id/messages/voice', [auth, checkMessageLimit, upload.single('audio')], async (req, res) => {
  try {
    const io = req.app.get('io');
    const { duration } = req.body;

    const message = new Message({
      conversationId: req.params.id,
      senderId: req.user.id,
      type: 'voice',
      mediaUrl: req.file.path,
      duration: parseInt(duration)
    });

    await message.save();

    await Conversation.findByIdAndUpdate(req.params.id, {
      lastMessage: {
        content: '🎤 Message vocal',
        type: 'voice',
        senderId: req.user.id,
        createdAt: Date.now()
      },
      $inc: { 'unreadCounts.$[elem].count': 1 }
    }, {
      arrayFilters: [{ 'elem.userId': { $ne: req.user.id } }]
    });

    const populatedMessage = await Message.findById(message._id).populate('senderId', 'name avatar');
    io.to(`conversation:${req.params.id}`).emit('new-message', populatedMessage);

    // Send Push Notifications & Save Notification Docs
    const conversation = await Conversation.findById(req.params.id);
    const sender = await User.findById(req.user.id);
    const notifications = [];
    conversation.members.forEach(memberId => {
      if (memberId.toString() !== req.user.id) {
        notifications.push({
          userId: memberId,
          type: 'new_message',
          fromUser: req.user.id,
          data: { conversationId: req.params.id }
        });
        sendPushNotification(
          memberId,
          sender ? sender.name : 'Nouveau message',
          '🎤 Message vocal',
          { type: 'new_message', conversationId: req.params.id }
        );
      }
    });
    await Notification.insertMany(notifications);

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/conversations/:id/read
router.put('/:id/read', auth, async (req, res) => {
  try {
    await Conversation.findOneAndUpdate(
      { _id: req.params.id, 'unreadCounts.userId': req.user.id },
      { $set: { 'unreadCounts.$.count': 0 } }
    );
    
    await Message.updateMany(
      { conversationId: req.params.id, senderId: { $ne: req.user.id }, status: { $ne: 'seen' } },
      { status: 'seen' }
    );

    const io = req.app.get('io');
    io.to(`conversation:${req.params.id}`).emit('messages-seen', { conversationId: req.params.id, userId: req.user.id });

    res.json({ message: 'Marqué comme lu' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/conversations/:id/members
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    if (conversation.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Seul le créateur peut ajouter des membres' });
    }

    if (conversation.members.includes(userId)) {
      return res.status(400).json({ message: 'Déjà membre' });
    }

    conversation.members.push(userId);
    conversation.unreadCounts.push({ userId, count: 0 });
    await conversation.save();

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/conversations/:id/members/:userId
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    // Allow leaving or removal by creator
    if (req.user.id !== req.params.userId && conversation.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    conversation.members = conversation.members.filter(m => m.toString() !== req.params.userId);
    conversation.unreadCounts = conversation.unreadCounts.filter(u => u.userId.toString() !== req.params.userId);
    
    if (conversation.members.length === 0) {
      await conversation.deleteOne();
      return res.json({ message: 'Conversation supprimée' });
    }

    await conversation.save();
    res.json({ message: 'Membre retiré' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
