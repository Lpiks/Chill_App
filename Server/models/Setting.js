const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  maintenanceMode: { type: Boolean, default: false },
  registrationsEnabled: { type: Boolean, default: true },
  trialEnabled: { type: Boolean, default: true },
  trialDays: { type: Number, default: 7 },
  pricing: {
    basic: { 
      monthly: { type: Number, default: 500 }, 
      yearly: { type: Number, default: 4800 },
      quality: { type: String, default: '720p' },
      maxScreens: { type: Number, default: 1 },
      adFree: { type: Boolean, default: false },
      offlineAccess: { type: Boolean, default: false }
    },
    standard: { 
      monthly: { type: Number, default: 900 }, 
      yearly: { type: Number, default: 8600 },
      quality: { type: String, default: '1080p' },
      maxScreens: { type: Number, default: 2 },
      adFree: { type: Boolean, default: true },
      offlineAccess: { type: Boolean, default: false }
    },
    premium: { 
      monthly: { type: Number, default: 1500 }, 
      yearly: { type: Number, default: 14000 },
      quality: { type: String, default: '4K+HDR' },
      maxScreens: { type: Number, default: 4 },
      adFree: { type: Boolean, default: true },
      offlineAccess: { type: Boolean, default: true }
    }
  },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Setting', settingSchema);
