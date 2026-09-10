const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Progress = require('../models/Progress');
const Watchlist = require('../models/Watchlist');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// --- SEARCH ROUTES ---
router.get('/search', async (req, res) => {
  const { query, type } = req.query;
  if (!query) return res.json([]);

  try {
    const tmdbType = type === 'series' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/search/${tmdbType}?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=fr-FR`;
    
    const response = await fetch(url);
    const data = await response.json();
    res.json(data.results || []);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Error searching movies' });
  }
});

router.get('/discover', async (req, res) => {
  const { type, year, language, country, genres, page } = req.query;
  
  try {
    const tmdbType = (type === 'series' || type === 'tv') ? 'tv' : 'movie';
    const baseUrl = `https://api.themoviedb.org/3/discover/${tmdbType}?api_key=${process.env.TMDB_API_KEY}&language=fr-FR`;
    
    let queryParams = `&sort_by=popularity.desc&page=${page || 1}`;
    
    if (year) {
      if (tmdbType === 'movie') {
        queryParams += `&primary_release_year=${year}`;
      } else {
        queryParams += `&first_air_date_year=${year}`;
      }
    }
    if (language) queryParams += `&with_original_language=${language}`;
    if (country) queryParams += `&with_origin_country=${country}`;
    if (genres) queryParams += `&with_genres=${genres}`;

    const url = baseUrl + queryParams;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data.results || []);
  } catch (error) {
    console.error('Discover error:', error);
    res.status(500).json({ message: 'Error discovering media' });
  }
});

// GET Progress
router.get('/progress', auth, async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST/Update Progress
router.post('/progress', auth, async (req, res) => {
  try {
    const { tmdbId, mediaType, title, posterPath, season, episode, timestamp } = req.body;
    
    const filter = { userId: req.userId, tmdbId, mediaType };
    const update = { 
      title, 
      posterPath, 
      season, 
      episode, 
      timestamp, 
      updatedAt: new Date() 
    };

    const doc = await Progress.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true
    });

    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- WATCHLIST ROUTES ---

// GET Watchlist
router.get('/watchlist', auth, async (req, res) => {
  try {
    const watchlist = await Watchlist.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(watchlist);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Watchlist
router.post('/watchlist', auth, async (req, res) => {
  try {
    const { tmdbId, mediaType, title, posterPath } = req.body;
    
    const existing = await Watchlist.findOne({ userId: req.userId, tmdbId, mediaType });
    if (existing) return res.status(400).json({ message: 'Déjà dans la liste' });

    const item = new Watchlist({
      userId: req.userId,
      tmdbId,
      mediaType,
      title,
      posterPath
    });
    await item.save();

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE Watchlist
router.delete('/watchlist/:tmdbId', auth, async (req, res) => {
  try {
    const { tmdbId } = req.params;
    await Watchlist.findOneAndDelete({ userId: req.userId, tmdbId });
    res.json({ message: 'Supprimé de la liste' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
