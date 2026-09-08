const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');

// Register
router.post('/register', async (req, res) => {
  console.log('📝 Register Request received:', req.body);
  try {
    const { name, email, phone, password, method } = req.body;
    const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
    const normalizedPhone = phone ? phone.trim() : undefined;

    // Check if user exists
    const query = method === 'email' ? { email: normalizedEmail } : { phone: normalizedPhone };
    const existingUser = await User.findOne(query);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email: method === 'email' ? normalizedEmail : undefined,
      phone: method === 'phone' ? normalizedPhone : undefined,
      password: hashedPassword,
    });
    await user.save();

    // Invalidate old OTPs for this identifier
    await Otp.updateMany({ identifier: method === 'email' ? normalizedEmail : normalizedPhone }, { used: true });

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const otp = new Otp({
      identifier: method === 'email' ? normalizedEmail : normalizedPhone,
      otp: otpCode, // In production, hash this too
      expiresAt,
    });
    await otp.save();

    // Mock send OTP
    console.log(`[OTP] Sent to ${otp.identifier}: ${otpCode}`);

    res.status(201).json({ message: 'OTP sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, phone, otp, method } = req.body;
    const identifier = method === 'email' ? email.toLowerCase().trim() : phone.trim();

    const otpDoc = await Otp.findOne({
      identifier,
      otp,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpDoc) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    otpDoc.used = true;
    await otpDoc.save();

    const user = await User.findOne({ [method]: identifier });
    user.isVerified = true;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, phone, password, method } = req.body;
    let identifier = method === 'email' ? email.toLowerCase().trim() : phone.trim();

    const user = await User.findOne({ [method]: identifier });
    if (!user) {
      return res.status(400).json({ message: 'Identifiants incorrects' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Identifiants incorrects' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, phone, method } = req.body;
    const identifier = method === 'email' ? email.toLowerCase().trim() : phone.trim();

    // Invalidate old OTPs
    await Otp.updateMany({ identifier }, { used: true });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const otp = new Otp({
      identifier,
      otp: otpCode,
      expiresAt,
    });
    await otp.save();

    console.log(`[OTP] Resent to ${identifier}: ${otpCode}`);

    res.json({ message: 'OTP resent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

const auth = require('../middleware/auth');

// Update Push Token
router.post('/update-push-token', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { expoPushToken: req.body.token });
    res.json({ message: 'Token mis à jour' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Last Seen
router.post('/update-last-seen', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { lastSeen: Date.now() });
    res.json({ message: 'Last seen mis à jour' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
