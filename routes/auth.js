const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const authController = require('../controllers/authController');

// Rate limit auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later',
});

router.post('/register', authLimiter, authController.register);
router.post('/verify-otp', authLimiter, authController.verifyOtp);
router.post('/login', authLimiter, authController.login);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/approve-owner/:id', auth, role(['admin']), authController.approveOwner);
router.post('/create-admin', authController.createAdmin);

module.exports = router;