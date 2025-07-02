const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { check, validationResult, sanitize } = require('express-validator');
const User = require('../models/User');
const Otp = require('../models/Otp');

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP email
const sendOtpEmail = async (email, otp) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email configuration missing in environment variables');
    }
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'DineBook Registration OTP',
      text: `Your OTP for DineBook registration is ${otp}. It expires in 10 minutes.`,
    };
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}`);
  } catch (err) {
    console.error('Error sending OTP email:', err.message);
    throw new Error(`Failed to send OTP: ${err.message}`);
  }
};

// Register user with OTP
exports.register = [
  check('email', 'Please include a valid email').isEmail().normalizeEmail(),
  check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
  check('name', 'Name is required').not().isEmpty().trim().escape(),
  check('role', 'Role must be customer or owner').isIn(['customer', 'owner']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role } = req.body;

    try {
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Generate and save OTP
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await new Otp({ email, otp, expiresAt }).save();

      // Send OTP
      await sendOtpEmail(email, otp);

      // Return user data for verification step
      res.status(200).json({ message: 'OTP sent to email', email, name, role, password });
    } catch (err) {
      console.error('Register error:', err.message);
      res.status(500).json({ message: err.message || 'Server error' });
    }
  },
];

// Verify OTP and complete registration
exports.verifyOtp = [
  check('email', 'Please include a valid email').isEmail().normalizeEmail(),
  check('otp', 'OTP is required').not().isEmpty(),
  check('name', 'Name is required').not().isEmpty().trim().escape(),
  check('role', 'Role must be customer or owner').isIn(['customer', 'owner']),
  check('password', 'Password is required').exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp, name, role, password } = req.body;

    try {
      const otpRecord = await Otp.findOne({ email, otp });
      if (!otpRecord || otpRecord.expiresAt < new Date()) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      const user = new User({ email, password, name, role });
      user.password = await bcrypt.hash(password, 10);
      await user.save();

      await Otp.deleteOne({ email, otp });

      const payload = { id: user._id, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.status(201).json({ token, user: { id: user._id, email, name, role, isApproved: user.isApproved } });
    } catch (err) {
      console.error('Verify OTP error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Login user
exports.login = [
  check('email', 'Please include a valid email').isEmail().normalizeEmail(),
  check('password', 'Password is required').exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      if (user.role === 'owner' && !user.isApproved) {
        return res.status(403).json({ message: 'Account not approved by admin' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const payload = { id: user._id, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.json({ token, user: { id: user._id, email, name: user.name, role: user.role, isApproved: user.isApproved } });
    } catch (err) {
      console.error('Login error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Approve owner (admin only)
exports.approveOwner = [
  check('id', 'User ID is required').isMongoId(),
  async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden: admin only' });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.role !== 'owner') {
        return res.status(400).json({ message: 'User is not an owner' });
      }

      if (user.isApproved) {
        return res.status(400).json({ message: 'Owner already approved' });
      }

      user.isApproved = true;
      await user.save();

      res.json({ message: 'Owner approved', user: { id: user._id, email: user.email, name: user.name, role: user.role, isApproved: user.isApproved } });
    } catch (err) {
      console.error('Approve owner error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Create admin (restricted to initial setup or existing admin)
exports.createAdmin = [
  check('email', 'Please include a valid email').isEmail().normalizeEmail(),
  check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
  check('name', 'Name is required').not().isEmpty().trim().escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    try {
      // Allow creation if no admins exist or if called by an admin
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount > 0 && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden: admin creation restricted' });
      }

      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      user = new User({ email, password, name, role: 'admin', isApproved: true });
      user.password = await bcrypt.hash(password, 10);
      await user.save();

      const payload = { id: user._id, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.status(201).json({ token, user: { id: user._id, email, name, role: user.role, isApproved: user.isApproved } });
    } catch (err) {
      console.error('Create admin error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Reset password (placeholder)
exports.resetPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Password reset link sent (not implemented)' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};