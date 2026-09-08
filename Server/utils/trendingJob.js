const cron = require('node-cron');
const Post = require('../models/Post');
const Progress = require('../models/Progress');
const Trending = require('../models/Trending');

const updateTrending = async () => {
  console.log('[TrendingJob] Starting calculation...');
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Aggregate posts for ratingCount and postCount
    const postStats = await Post.aggregate([
      { $match: { createdAt: { $gte: oneWeekAgo } } },
      {
        $group: {
          _id: { tmdbId: "$tmdbId", mediaType: "$mediaType" },
          title: { $first: "$title" },
          posterPath: { $first: "$posterPath" },
          postCount: { $sum: 1 },
          ratingCount: { $sum: 1 }, // In this app, every post is a rating
          genres: { $first: "$genres" }
        }
      }
    ]);

    // Aggregate progress for streamCount
    const streamStats = await Progress.aggregate([
      { $match: { updatedAt: { $gte: oneWeekAgo } } },
      {
        $group: {
          _id: { tmdbId: "$tmdbId", mediaType: "$mediaType" },
          streamCount: { $sum: 1 }
        }
      }
    ]);

    // Combine stats
    const combinedStats = postStats.map(stat => {
      const streamStat = streamStats.find(s => 
        s._id.tmdbId === stat._id.tmdbId.toString() && 
        s._id.mediaType === (stat._id.mediaType === 'tv' ? 'series' : 'movie')
      );
      
      const streamCount = streamStat ? streamStat.streamCount : 0;
      const score = (stat.ratingCount * 0.4) + (stat.postCount * 0.3) + (streamCount * 0.3);

      let category = stat._id.mediaType;
      if (stat.genres && stat.genres.some(g => g.toLowerCase().includes('animation'))) category = 'anime';
      if (stat.genres && stat.genres.some(g => g.toLowerCase().includes('drama')) && stat._id.mediaType === 'tv') {
        // Simple logic for Kdrama - usually would need more metadata
        // But for this project, let's keep it simple or assume a specific genre tag
      }

      return {
        tmdbId: stat._id.tmdbId,
        mediaType: stat._id.mediaType,
        title: stat.title,
        posterPath: stat.posterPath,
        category: category,
        score: score,
        weekOf: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())), // Start of current week
        updatedAt: new Date()
      };
    });

    // Clear old trending and save top 20 per category
    const categories = ['movie', 'tv', 'kdrama', 'anime'];
    
    for (const cat of categories) {
      const top20 = combinedStats
        .filter(s => s.category === cat || (cat === 'tv' && s.mediaType === 'tv'))
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);

      if (top20.length > 0) {
        // Overwrite trending for this category
        await Trending.deleteMany({ category: cat });
        await Trending.insertMany(top20);
      }
    }

    console.log('[TrendingJob] Calculation complete.');
  } catch (error) {
    console.error('[TrendingJob] Error:', error);
  }
};

// Run every hour
cron.schedule('0 * * * *', updateTrending);

// Also run once on startup
updateTrending();

module.exports = { updateTrending };
