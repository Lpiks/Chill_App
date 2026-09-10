const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

const expo = new Expo();

// Global Helper to send push notification
async function sendPushNotification(userId, title, body, data) {
  try {
    const user = await User.findById(userId);
    if (!user || !user.expoPushToken) return;

    if (!Expo.isExpoPushToken(user.expoPushToken)) {
      console.error(`Push token ${user.expoPushToken} is not a valid Expo push token`);
      return;
    }

    const messages = [{
      to: user.expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    }];

    await expo.sendPushNotificationsAsync(messages);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

module.exports = { sendPushNotification };
