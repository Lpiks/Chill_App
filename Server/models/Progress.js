const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tmdbId: { type: String, required: true },
  mediaType: { type: String, enum: ['movie', 'series'], required: true },
  title: { type: String, required: true },
  posterPath: { type: String, required: true },
  season: { type: Number },
  episode: { type: Number },
  timestamp: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

// Unique index for upserting
progressSchema.index({ userId: 1, tmdbId: 1, mediaType: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);
