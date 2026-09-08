const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const StreamCache = require('../models/StreamCache');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { resolveTorrentio } = require('../utils/torrentResolver');

const QUALITY_MAP = {
  '4K': 2160,
  '1080p': 1080,
  '720p': 720,
  '480p': 480
};

const TIER_LIMITS = {
  'free': 480,
  'basic': 720,
  'standard': 1080,
  'premium': 9999 // Unlimited
};

router.get('/', auth, async (req, res) => {
  try {
    let { tmdbId, imdbId, type, season, episode } = req.query;
    const user = await User.findById(req.user.id);
    const userTier = user.subscriptionTier || 'free';
    const maxAllowedRes = TIER_LIMITS[userTier];

    // 0. Fetch IMDB ID if missing (Torrentio requirement)
    if (!imdbId && tmdbId) {
      const tmdbType = type === 'series' || type === 'tv' ? 'tv' : 'movie';
      const externalRes = await fetch(
        `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}/external_ids?api_key=${process.env.TMDB_API_KEY}`
      );
      const externalData = await externalRes.json();
      imdbId = externalData.imdb_id;
    }

    const mediaId = imdbId || tmdbId;
    const cacheKey = `${mediaId}-${type}-${season || 0}-${episode || 0}`;

    // 1. Check Cache (15 min expiry)
    const cached = await StreamCache.findOne({ cacheKey });
    if (cached && cached.expiresAt > new Date()) {
      return res.json(cached);
    }

    // 2. Resolve via Torrentio + Real-Debrid
    if (!imdbId) {
      return res.status(404).json({ error: "IMDB ID introuvable" });
    }

    const streams = await resolveTorrentio(imdbId, type, season, episode);
    
    if (!streams || streams.length === 0) {
      return res.status(404).json({ error: "Flux indisponible" });
    }

    // 3. Filter by User Tier & Sort by Quality
    const filteredStreams = streams.filter(s => {
      const resVal = QUALITY_MAP[s.quality] || 480;
      return resVal <= maxAllowedRes;
    }).sort((a, b) => (QUALITY_MAP[b.quality] || 0) - (QUALITY_MAP[a.quality] || 0));

    const bestStream = filteredStreams[0] || streams[streams.length - 1]; // Fallback to lowest if all filtered out

    // 4. Cache Result
    const streamData = {
      cacheKey,
      streamUrl: bestStream.streamUrl,
      quality: bestStream.quality,
      provider: bestStream.provider,
      title: type === 'movie' ? 'Movie' : `S${season} E${episode}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 min cache
    };

    await StreamCache.findOneAndUpdate({ cacheKey }, streamData, { upsert: true });

    res.json(streamData);

  } catch (error) {
    console.error('[StreamAPI] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
