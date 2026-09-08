const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  type: { type: String, enum: ['direct', 'group'], default: 'direct' },
  name: String,                           // group name only
  avatar: String,                         // group avatar only
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // group creator
  lastMessage: {
    content: String,
    type: { type: String, enum: ['text', 'voice', 'media'] },
    senderId: mongoose.Schema.Types.ObjectId,
    createdAt: Date
  },
  unreadCounts: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    count: { type: Number, default: 0 }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Conversation', conversationSchema);
