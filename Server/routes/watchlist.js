const express = require('express');
const router = express.Router();
const Watchlist = require('../models/Watchlist');
const auth = require('../middleware/auth');

// GET /api/watchlist - Returns all watchlist items for current user
router.get('/', auth, async (req, res) => {
  try {
    const watchlist = await Watchlist.find({ userId: req.user.id })
      .sort({ addedAt: -1 });
    res.json(watchlist);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/watchlist/check/:tmdbId - Check if a specific item is in user's watchlist
router.get('/check/:tmdbId', auth, async (req, res) => {
  try {
    const item = await Watchlist.findOne({ 
      userId: req.user.id, 
      tmdbId: req.params.tmdbId 
    });
    res.json({ inWatchlist: !!item });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/watchlist - Add to watchlist
router.post('/', auth, async (req, res) => {
  try {
    const { tmdbId, mediaType, title, posterPath, backdropPath, year, genres } = req.body;
    
    // check if already in watchlist
    const existing = await Watchlist.findOne({ userId: req.user.id, tmdbId });
    if (existing) {
      return res.status(400).json({ message: 'Déjà dans votre liste' });
    }

    const item = new Watchlist({
      userId: req.user.id,
      tmdbId,
      mediaType,
      title,
      posterPath,
      backdropPath,
      year,
      genres
    });
    
    await item.save();
    res.status(201).json({ message: "Ajouté à votre liste", item });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/watchlist/:tmdbId - Remove from watchlist
router.delete('/:tmdbId', auth, async (req, res) => {
  try {
    const { tmdbId } = req.params;

    await Watchlist.findOneAndDelete({ 
      userId: req.user.id, 
      tmdbId 
    });
    
    res.json({ message: 'Retiré de la liste' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
