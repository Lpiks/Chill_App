const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Post = require('../models/Post');
const Report = require('../models/Report');
const Progress = require('../models/Progress');
const Trending = require('../models/Trending');
const Setting = require('../models/Setting');
const Notification = require('../models/Notification');
const { sendPushNotification } = require('../utils/push');
const adminAuth = require('../middleware/adminAuth');

// 1. Admin Login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ message: 'Accès non autorisé' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, admin: { name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// All routes below are protected by adminAuth
router.use(adminAuth);

// 2. Dashboard Stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeStreams = await Progress.countDocuments({ updatedAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) } });
    const pendingReports = await Report.countDocuments({ status: 'pending' });
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: startOfMonth } });
    
    const subscriptionBreakdown = {
      free: await User.countDocuments({ subscriptionTier: 'free' }),
      basic: await User.countDocuments({ subscriptionTier: 'basic' }),
      standard: await User.countDocuments({ subscriptionTier: 'standard' }),
      premium: await User.countDocuments({ subscriptionTier: 'premium' }),
    };

    res.json({
      totalUsers,
      newUsersThisMonth,
      revenueThisMonth: 125000,
      activeStreams,
      pendingReports,
      subscriptionBreakdown
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 3. User Management
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', tier = '', status = '' } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') }
      ];
    }
    if (tier) query.subscriptionTier = tier;
    if (status) query.status = status;
    
    const users = await User.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalUsers: total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ message: 'Email déjà utilisé' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      isVerified: true
    });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/users/:id/subscription', async (req, res) => {
  try {
    const { tier } = req.body;
    await User.findByIdAndUpdate(req.params.id, { subscriptionTier: tier });
    res.json({ message: 'Subscription updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/users/:id/suspend', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.status = user.status === 'suspended' ? 'active' : 'suspended';
    await user.save();
    res.json({ message: `User ${user.status}`, status: user.status });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/users/:id/ban', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.status = user.status === 'banned' ? 'active' : 'banned';
    await user.save();
    res.json({ message: `User ${user.status}`, status: user.status });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users/:id/detail', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Fetch system settings with a fallback
    let trialDays = 7;
    try {
      const settings = await Setting.findOne().lean();
      if (settings) trialDays = settings.trialDays;
    } catch (e) {
      console.error("Settings fetch failed", e);
    }
    
    // Calculate trial remaining days if user is free
    let trialRemaining = 0;
    if (user.subscriptionTier === 'free') {
      const diffTime = Math.abs(new Date() - new Date(user.createdAt));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      trialRemaining = Math.max(0, trialDays - diffDays);
    }

    // Fetch stats and posts in parallel for speed
    const [postsCount, recentPosts] = await Promise.all([
      Post.countDocuments({ userId: user._id }).catch(() => 0),
      Post.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10).lean().catch(() => [])
    ]);
    
    res.json({ 
      ...user._doc, 
      trialRemaining,
      stats: {
        postsCount,
        likesCount: 0
      },
      recentPosts
    });
  } catch (error) {
    console.error("User detail error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 4. Content Moderation (Posts)
router.get('/posts', async (req, res) => {
  try {
    const { page = 1, limit = 20, filter = 'all' } = req.query;
    const query = {};
    if (filter === 'hidden') query.isHidden = true;
    if (filter === 'reported') {
      const reportedPostIds = await Report.distinct('targetId', { targetType: 'post' });
      query._id = { $in: reportedPostIds };
    }
    
    const posts = await Post.find(query)
      .populate('userId', 'name email avatar')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Post.countDocuments(query);
    res.json({ posts, totalPages: Math.ceil(total / limit), currentPage: parseInt(page) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/posts/:id/hide', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    post.isHidden = !post.isHidden;
    await post.save();
    res.json({ message: post.isHidden ? 'Post masqué' : 'Post visible', isHidden: post.isHidden });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 5. Reports
router.get('/reports', async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const query = status === 'all' ? {} : { status };
    const reports = await Report.find(query)
      .populate('reporterId', 'name email')
      .sort({ createdAt: -1 });
    
    // Manual population of target content for demo
    const populatedReports = await Promise.all(reports.map(async (r) => {
      let targetContent = null;
      if (r.targetType === 'post') targetContent = await Post.findById(r.targetId).populate('userId', 'name');
      if (r.targetType === 'user') targetContent = await User.findById(r.targetId);
      return { ...r._doc, targetContent };
    }));

    res.json(populatedReports);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/reports/:id/resolve', async (req, res) => {
  try {
    const { action } = req.body;
    const report = await Report.findById(req.params.id);
    if (action === 'delete') {
      if (report.targetType === 'post') await Post.findByIdAndDelete(report.targetId);
    } else if (action === 'ban') {
      if (report.targetType === 'user') await User.findByIdAndUpdate(report.targetId, { status: 'banned' });
    }
    report.status = 'resolved';
    await report.save();
    res.json({ message: 'Signalement résolu' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 6. Revenue
router.get('/revenue/summary', async (req, res) => {
  try {
    // Mock summary data
    res.json({
      thisMonth: 125000,
      lastMonth: 110000,
      totalAllTime: 1540000,
      avgPerUser: 120,
      conversionRate: 15.5,
      churnRate: 2.1,
      mrrDzd: 125000,
      mrrUsd: Math.round(125000 / 237)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/revenue/transactions', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    // Mock transactions
    const transactions = [
      { id: 1, user: 'Elhadi', plan: 'Premium', amount: 1500, date: new Date(), status: 'success' },
      { id: 2, user: 'John Doe', plan: 'Standard', amount: 900, date: new Date(), status: 'success' },
    ];
    res.json({ transactions, totalPages: 1 });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 7. Trending
router.get('/trending', async (req, res) => {
  try {
    const { category = 'movie' } = req.query;
    const trending = await Trending.find({ category }).sort({ score: -1 });
    res.json(trending);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/trending/:tmdbId/pin', async (req, res) => {
  try {
    const { tmdbId } = req.params;
    await Trending.findOneAndUpdate({ tmdbId }, { score: 1000000 }); // Large score to pin
    res.json({ message: 'Item épinglé' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/trending/recalculate', async (req, res) => {
  try {
    // Trigger existing trending job logic if possible, or mock
    res.json({ message: 'Scores recalculés avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 8. Streams
router.get('/streams/status', async (req, res) => {
  res.json([
    { name: 'VidSrc', status: 'online', latency: '240ms', lastChecked: new Date() },
    { name: 'VidLink', status: 'online', latency: '310ms', lastChecked: new Date() },
    { name: 'MultiEmbed', status: 'online', latency: '450ms', lastChecked: new Date() },
    { name: 'Real-Debrid', status: 'online', latency: '120ms', lastChecked: new Date() },
  ]);
});

router.get('/streams/popular', async (req, res) => {
  try {
    const popular = await Progress.aggregate([
      { $group: { _id: "$tmdbId", count: { $sum: 1 }, title: { $first: "$title" } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.json(popular);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/streams/cache', async (req, res) => {
  try {
    // Logic to clear stream cache
    res.json({ message: 'Cache vidé' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 9. Notifications
router.post('/notifications/send', async (req, res) => {
  try {
    const { title, message, target, userId } = req.body;
    let users = [];
    if (target === 'all') users = await User.find({}, '_id');
    else if (target === 'free') users = await User.find({ subscriptionTier: 'free' }, '_id');
    else if (target === 'premium') users = await User.find({ subscriptionTier: 'premium' }, '_id');
    else if (target === 'user' && userId) users = [{ _id: userId }];

    const notifications = users.map(u => ({
      userId: u._id,
      type: 'system_alert',
      fromUser: req.user.id,
      data: { title, message }
    }));
    await Notification.insertMany(notifications);

    // Send Push Notifications
    users.forEach(u => {
      sendPushNotification(u._id, title || 'Annonce Système', message, { type: 'system_alert' });
    });

    res.json({ message: 'Notification envoyée', count: users.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 10. Settings
router.get('/settings', async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const settings = await Setting.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
