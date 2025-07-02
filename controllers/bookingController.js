const Booking = require('../models/Booking');
const Restaurant = require('../models/Restaurant');
const { check, validationResult } = require('express-validator');

// Create booking
exports.createBooking = [
  check('restaurant', 'Restaurant ID is required').isMongoId(),
  check('date', 'Date is required').isISO8601().toDate(),
  check('time', 'Time is required').not().isEmpty(),
  check('partySize', 'Party size must be a positive number').isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { restaurant, date, time, partySize } = req.body;

    try {
      const restaurantExists = await Restaurant.findById(restaurant);
      if (!restaurantExists) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      // Check for conflicting bookings (simplified: same date and time)
      const conflictingBooking = await Booking.findOne({
        restaurant,
        date: new Date(date),
        time,
        status: { $in: ['pending', 'confirmed'] },
      });
      if (conflictingBooking) {
        return res.status(409).json({ message: 'Slot already booked' });
      }

      const booking = new Booking({
        user: req.user.id,
        restaurant,
        date: new Date(date),
        time,
        partySize,
      });

      await booking.save();
      res.status(201).json(booking);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Get booking by ID
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate('restaurant', 'name address');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Ensure user owns the booking or is the restaurant owner
    const restaurant = await Restaurant.findById(booking.restaurant);
    if (booking.user._id.toString() !== req.user.id && restaurant.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access forbidden' });
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Update booking status (owner only)
exports.updateBooking = [
  check('status', 'Status must be pending, confirmed, rejected, or cancelled')
    .isIn(['pending', 'confirmed', 'rejected', 'cancelled']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      const restaurant = await Restaurant.findById(booking.restaurant);
      if (restaurant.owner.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access forbidden' });
      }

      booking.status = req.body.status;
      await booking.save();
      res.json(booking);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Cancel booking
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Ensure user owns the booking
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access forbidden' });
    }

    booking.status = 'cancelled';
    await booking.save();
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};