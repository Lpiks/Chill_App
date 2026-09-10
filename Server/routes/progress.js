const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');
const auth = require('../middleware/auth');

// GET /api/progress - Returns all Progress documents for the current user
router.get('/', auth, async (req, res) => {
  try {
    const { tmdbId } = req.query;
    const query = { userId: req.user.id };
    if (tmdbId) query.tmdbId = tmdbId;

    let progressQuery = Progress.find(query).sort({ updatedAt: -1 });
    if (!tmdbId) progressQuery = progressQuery.limit(10); // Only limit if fetching global history

    const progress = await progressQuery;
    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/progress - Upsert progress
router.post('/', auth, async (req, res) => {
  try {
    const { tmdbId, mediaType, title, posterPath, season, episode, timestamp, duration } = req.body;
    
    const progress = await Progress.findOneAndUpdate(
      { userId: req.user.id, tmdbId, mediaType },
      { 
        title, 
        posterPath, 
        season, 
        episode, 
        timestamp, 
        duration,
        updatedAt: new Date() 
      },
      { upsert: true, new: true }
    );
    
    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/progress/:id - Delete a progress entry
router.delete('/:id', auth, async (req, res) => {
  try {
    await Progress.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
