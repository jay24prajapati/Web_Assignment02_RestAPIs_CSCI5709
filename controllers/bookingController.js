const Booking = require('../models/Booking');
const Restaurant = require('../models/Restaurant');
const Slot = require('../models/Slot');
const moment = require('moment');
const { check, validationResult } = require('express-validator');

// Create booking
exports.createBooking = [
  check('restaurant', 'Restaurant ID is required').isMongoId(),
  check('slot', 'Slot ID is required').isMongoId(),
  check('partySize', 'Party size must be a positive number').isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { restaurant, slot, partySize } = req.body;

    try {
      const restaurantExists = await Restaurant.findById(restaurant);
      if (!restaurantExists) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      const slotExists = await Slot.findById(slot);
      if (!slotExists || slotExists.restaurant.toString() !== restaurant) {
        return res.status(404).json({ message: 'Slot not found' });
      }

      if (slotExists.isBooked) {
        return res.status(409).json({ message: 'Slot already booked' });
      }

      // Validate slot time against restaurant hours
      const slotTime = moment(slotExists.time, 'HH:mm');
      const opening = moment(restaurantExists.openingHours, 'HH:mm');
      const closing = moment(restaurantExists.closingHours, 'HH:mm');
      if (!slotTime.isBetween(opening, closing, null, '[)')) {
        return res.status(400).json({ message: 'Slot time is outside restaurant hours' });
      }

      const booking = new Booking({
        user: req.user.id,
        restaurant,
        slot,
        partySize,
        status: 'pending',
      });

      slotExists.isBooked = true;
      await slotExists.save();
      await booking.save();

      res.status(201).json(booking);
    } catch (err) {
      console.error('Create booking error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Get booking by ID
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate('restaurant', 'name address openingHours closingHours slotDuration')
      .populate('slot', 'date time isBooked');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const restaurant = await Restaurant.findById(booking.restaurant);
    if (booking.user._id.toString() !== req.user.id && restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access forbidden' });
    }

    res.json(booking);
  } catch (err) {
    console.error('Get booking error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all bookings for user or owner's restaurants
exports.getUserBookings = [
  check('status', 'Status must be pending, confirmed, rejected, or cancelled').optional().isIn(['pending', 'confirmed', 'rejected', 'cancelled']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.query;

    try {
      let bookings;
      if (req.user.role === 'customer') {
        const query = { user: req.user.id };
        if (status) query.status = status;
        bookings = await Booking.find(query)
          .populate('restaurant', 'name address openingHours closingHours slotDuration')
          .populate('slot', 'date time isBooked')
          .sort({ createdAt: -1 });
      } else if (req.user.role === 'owner') {
        const restaurants = await Restaurant.find({ owner: req.user.id });
        const restaurantIds = restaurants.map(r => r._id);
        const query = { restaurant: { $in: restaurantIds } };
        if (status) query.status = status;
        bookings = await Booking.find(query)
          .populate('user', 'name email')
          .populate('restaurant', 'name address openingHours closingHours slotDuration')
          .populate('slot', 'date time isBooked')
          .sort({ createdAt: -1 });
      } else if (req.user.role === 'admin') {
        const query = status ? { status } : {};
        bookings = await Booking.find(query)
          .populate('user', 'name email')
          .populate('restaurant', 'name address openingHours closingHours slotDuration')
          .populate('slot', 'date time isBooked')
          .sort({ createdAt: -1 });
      } else {
        return res.status(403).json({ message: 'Access forbidden' });
      }

      res.json(bookings);
    } catch (err) {
      console.error('Get user bookings error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Get all bookings for a restaurant
exports.getRestaurantBookings = [
  check('status', 'Status must be pending, confirmed, rejected, or cancelled').optional().isIn(['pending', 'confirmed', 'rejected', 'cancelled']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.query;
    const restaurantId = req.params.restaurantId;

    try {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      if (restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden' });
      }

      const query = { restaurant: restaurantId };
      if (status) query.status = status;

      const bookings = await Booking.find(query)
        .populate('user', 'name email')
        .populate('restaurant', 'name address openingHours closingHours slotDuration')
        .populate('slot', 'date time isBooked')
        .sort({ createdAt: -1 });

      res.json(bookings);
    } catch (err) {
      console.error('Get restaurant bookings error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Update booking status
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
      if (restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden' });
      }

      booking.status = req.body.status;
      if (booking.status === 'cancelled' || booking.status === 'rejected') {
        const slot = await Slot.findById(booking.slot);
        if (slot) {
          slot.isBooked = false;
          await slot.save();
        }
      }
      await booking.save();
      res.json(booking);
    } catch (err) {
      console.error('Update booking error:', err.message);
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

    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access forbidden' });
    }

    const slot = await Slot.findById(booking.slot);
    if (slot) {
      slot.isBooked = false;
      await slot.save();
    }

    booking.status = 'cancelled';
    await booking.save();
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    console.error('Cancel booking error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};