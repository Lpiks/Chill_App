const mongoose = require('mongoose');

const trendingSchema = new mongoose.Schema({
  tmdbId: { type: Number, required: true },
  mediaType: { type: String, enum: ['movie', 'tv'], required: true },
  title: { type: String, required: true },
  posterPath: { type: String, required: true },
  backdropPath: { type: String },
  year: { type: String },
  category: { type: String, enum: ['movie', 'tv', 'kdrama', 'anime'], required: true },
  score: { type: Number, default: 0 },
  weekOf: { type: Date, required: true },
  updatedAt: { type: Date, default: Date.now }
});

trendingSchema.index({ category: 1, score: -1 });

module.exports = mongoose.model('Trending', trendingSchema);
