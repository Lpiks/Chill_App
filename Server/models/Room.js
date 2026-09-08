const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },   // 6-char e.g. "xK92mP"
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tmdbId: Number,
  mediaType: { type: String, enum: ['movie', 'tv'] },
  title: String,
  posterPath: String,
  season: Number,
  episode: Number,
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    peerId: String                           // PeerJS peer ID
  }],
  maxMembers: { type: Number, default: 5 },
  status: { type: String, enum: ['waiting', 'playing', 'ended'], default: 'waiting' },
  isLocked: { type: Boolean, default: false },
  playbackState: {
    isPlaying: { type: Boolean, default: false },
    currentTime: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24*60*60*1000) }  // 24h TTL
});

// Compound index for members query if needed
roomSchema.index({ 'members.userId': 1 });

module.exports = mongoose.model('Room', roomSchema);
