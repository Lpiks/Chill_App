const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tmdbId: { type: Number, required: true },
  mediaType: { type: String, enum: ['movie', 'tv'], required: true },
  title: { type: String, required: true },
  posterPath: { type: String, required: true },
  backdropPath: { type: String },
  rating: { type: Number, min: 1, max: 5, required: true },
  review: { type: String, maxlength: 280 },
  genres: [String],
  year: { type: Number },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  isHidden: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Index for feed performance
postSchema.index({ createdAt: -1 });
postSchema.index({ userId: 1 });

module.exports = mongoose.model('Post', postSchema);
