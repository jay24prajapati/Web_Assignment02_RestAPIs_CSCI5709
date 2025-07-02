const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { check, validationResult } = require('express-validator');

// Register user
exports.register = [
  // Validation
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
  check('name', 'Name is required').not().isEmpty(),
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

      user = new User({ email, password, name, role });
      user.password = await bcrypt.hash(password, 10);
      await user.save();

      const payload = { id: user._id, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.status(201).json({ token, user: { id: user._id, email, name, role } });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Login user
exports.login = [
  check('email', 'Please include a valid email').isEmail(),
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

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const payload = { id: user._id, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.json({ token, user: { id: user._id, email, name: user.name, role: user.role } });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Reset password (placeholder for email-based reset)
exports.resetPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // In a real app, send email with reset link (not implemented here)
    res.json({ message: 'Password reset link sent (not implemented)' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};