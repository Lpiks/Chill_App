const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text', 'voice', 'media', 'post_share'], default: 'text' },
  content: String,                        // text content
  mediaUrl: String,                       // Cloudinary URL for voice
  duration: Number,                       // voice message duration in seconds
  sharedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }, // For shared posts
  tmdbData: {                             // for movie/series card
    tmdbId: Number,
    mediaType: String,
    title: String,
    posterPath: String,
    rating: Number,
    year: Number
  },
  status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
  deletedAt: Date,                        // soft delete
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
