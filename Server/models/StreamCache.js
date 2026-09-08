const mongoose = require('mongoose');

const streamCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true },
  streamUrl: { type: String, required: true },
  quality: { type: String, required: true },
  provider: { type: String, default: 'Torrentio' },
  headers: { type: Map, of: String },
  expiresAt: { type: Date, required: true }
});

// TTL Index for automatic deletion
streamCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('StreamCache', streamCacheSchema);
