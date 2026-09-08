const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  subscriptionTier: { 
    type: String, 
    enum: ['free', 'basic', 'standard', 'premium'], 
    default: 'free' 
  },
  tasteProfile: {
    genres: { type: Object, default: {} },
    languages: { type: [String], default: [] },
  },
  expoPushToken: { type: String },
  lastSeen: { type: Date, default: Date.now },
  dailyMessageCount: { type: Number, default: 0 },
  lastMessageDate: { type: Date, default: Date.now },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
