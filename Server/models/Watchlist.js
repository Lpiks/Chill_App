const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tmdbId: { type: Number, required: true },
  mediaType: { type: String, enum: ['movie', 'tv'], required: true },
  title: String,
  posterPath: String,
  backdropPath: String,
  year: Number,
  genres: [String],
  addedAt: { type: Date, default: Date.now }
});

// Compound index: { userId: 1, tmdbId: 1 } — unique per user
watchlistSchema.index({ userId: 1, tmdbId: 1 }, { unique: true });

module.exports = mongoose.model('Watchlist', watchlistSchema);
