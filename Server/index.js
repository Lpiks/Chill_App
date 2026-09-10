require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const browsingRoutes = require('./routes/browsing');
const streamRoutes = require('./routes/stream');
const subtitleRoutes = require('./routes/subtitles');
const postRoutes = require('./routes/posts');
const trendingRoutes = require('./routes/trending');
const progressRoutes = require('./routes/progress');
const watchlistRoutes = require('./routes/watchlist');
const friendsRoutes = require('./routes/friends');
const usersRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const conversationRoutes = require('./routes/conversations');
const partyRoutes = require('./routes/party');
const adminRoutes = require('./routes/admin');

const { updateTrending } = require('./utils/trendingJob');
const Room = require('./models/Room');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Pass io to app for use in routes
app.set('io', io);

// Socket.io logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User-specific room for notifications
  socket.on('register', (userId) => {
    socket.join(`user:${userId}`);
  });

  socket.on('join-conversations', (conversationIds) => {
    if (Array.isArray(conversationIds)) {
      conversationIds.forEach(id => socket.join(`conversation:${id}`));
    }
  });

  // Watch Party Sync Logic
  socket.on('party-join', async ({ roomId, userId, peerId }) => {
    socket.join(`party:${roomId}`);
    
    try {
      // Update member peerId in DB
      await Room.findOneAndUpdate(
        { roomId, 'members.userId': userId },
        { $set: { 'members.$.peerId': peerId } }
      );
      
      // Notify others
      socket.to(`party:${roomId}`).emit('party-member-joined', { userId, peerId });
      
      // Send current playback state to new member
      const room = await Room.findOne({ roomId });
      if (room) {
        socket.emit('party-sync-state', room.playbackState);
      }
    } catch (err) {
      console.error('party-join error:', err);
    }
  });

  socket.on('party-play', async ({ roomId, currentTime }) => {
    const room = await Room.findOne({ roomId });
    if (room) {
      room.playbackState = { isPlaying: true, currentTime, updatedAt: new Date() };
      await room.save();
      io.to(`party:${roomId}`).emit('party-play', { currentTime });
    }
  });

  socket.on('party-pause', async ({ roomId, currentTime }) => {
    const room = await Room.findOne({ roomId });
    if (room) {
      room.playbackState = { isPlaying: false, currentTime, updatedAt: new Date() };
      await room.save();
      io.to(`party:${roomId}`).emit('party-pause', { currentTime });
    }
  });

  socket.on('party-seek', async ({ roomId, currentTime }) => {
    const room = await Room.findOne({ roomId });
    if (room) {
      room.playbackState.currentTime = currentTime;
      room.playbackState.updatedAt = new Date();
      await room.save();
      io.to(`party:${roomId}`).emit('party-seek', { currentTime });
    }
  });

  socket.on('party-message', ({ roomId, message }) => {
    io.to(`party:${roomId}`).emit('party-message', message);
  });

  socket.on('party-reaction', ({ roomId, emoji, userId }) => {
    io.to(`party:${roomId}`).emit('party-reaction', { emoji, userId });
  });

  socket.on('party-lock', async ({ roomId, isLocked }) => {
    const room = await Room.findOne({ roomId });
    if (room) {
      room.isLocked = isLocked;
      await room.save();
      io.to(`party:${roomId}`).emit('party-lock', { isLocked });
    }
  });

  socket.on('party-leave', async ({ roomId, userId }) => {
    socket.leave(`party:${roomId}`);
    io.to(`party:${roomId}`).emit('party-member-left', { userId });
  });

  socket.on('party-end', async ({ roomId }) => {
    const room = await Room.findOne({ roomId });
    if (room) {
      await Room.findOneAndDelete({ roomId });
      io.to(`party:${roomId}`).emit('party-ended');
    }
  });

  socket.on('typing', ({ conversationId, userId }) => {
    socket.to(`conversation:${conversationId}`).emit('user-typing', { userId });
  });

  socket.on('stop-typing', ({ conversationId, userId }) => {
    socket.to(`conversation:${conversationId}`).emit('user-stop-typing', { userId });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/browsing', browsingRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/subtitles', subtitleRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/trending', trendingRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/party', partyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stealth', require('./routes/stealth'));

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Render Free Tier Keep-Alive Workaround
  // Render automatically sets the RENDER_EXTERNAL_URL environment variable.
  const KEEP_ALIVE_URL = process.env.RENDER_EXTERNAL_URL;
  if (KEEP_ALIVE_URL) {
    const https = require('https');
    setInterval(() => {
      https.get(KEEP_ALIVE_URL, (resp) => {
        if (resp.statusCode === 200) {
          console.log('✅ [Keep-Alive] Ping successful. Server stays awake.');
        }
      }).on("error", (err) => {
        console.log("❌ [Keep-Alive] Ping failed: " + err.message);
      });
    }, 10 * 60 * 1000); // Every 10 minutes
  }
});

// Catch unhandled rejections (like Puppeteer closing early) so the server doesn't crash
process.on('unhandledRejection', (reason, promise) => {
  console.error('[System] Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[System] Uncaught Exception:', err);
});
