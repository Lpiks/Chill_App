const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['friend_request', 'request_accepted', 'post_like', 'post_comment', 'post_mention', 'watch_party_invite', 'new_message', 'system_alert', 'party_invite'],
    required: true
  },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  data: { type: Object },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
