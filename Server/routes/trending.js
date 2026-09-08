const express = require('express');
const router = express.Router();
const Trending = require('../models/Trending');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// GET /api/trending?category=movie|tv|kdrama|anime
router.get('/', async (req, res) => {
  const { category } = req.query;
  
  try {
    const query = category ? { category } : {};
    let trending = await Trending.find(query).sort({ score: -1 }).limit(20);

    // FALLBACK: If database has less than 10 items, fetch real trending from TMDB
    if (trending.length < 10) {
      console.log(`[Trending] Database has less than 10 items for ${category || 'all'}. Fetching from TMDB...`);
      const tmdbType = (category === 'tv' || category === 'series') ? 'tv' : 'movie';
      const url = `https://api.themoviedb.org/3/trending/${tmdbType}/week?api_key=${process.env.TMDB_API_KEY}&language=fr-FR`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      // Transform TMDB format to our app format
      trending = (data.results || []).slice(0, 20).map(m => ({
        _id: m.id.toString(),
        tmdbId: m.id,
        mediaType: m.media_type || tmdbType,
        title: m.title || m.name,
        posterPath: m.poster_path,
        backdropPath: m.backdrop_path,
        year: (m.release_date || m.first_air_date || '').split('-')[0],
        score: m.vote_average || 0,
        category: category || 'movie'
      }));
    }

    res.json(trending);
  } catch (error) {
    console.error('[Trending] Error:', error);
    res.status(500).json({ message: 'Erreur lors du chargement des tendances' });
  }
});

module.exports = router;
