const Slot = require('../models/Slot');
const Restaurant = require('../models/Restaurant');
const { check, validationResult } = require('express-validator');
const moment = require('moment');

// Create slots for a restaurant
exports.createSlots = [
  check('date', 'Date is required').isISO8601().toDate(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { restaurantId } = req.params;
    const { date } = req.body;

    try {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      if (restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden' });
      }

      const start = moment(`${moment(date).format('YYYY-MM-DD')} ${restaurant.openingHours}`, 'YYYY-MM-DD HH:mm');
      const end = moment(`${moment(date).format('YYYY-MM-DD')} ${restaurant.closingHours}`, 'YYYY-MM-DD HH:mm');
      if (!end.isAfter(start)) {
        return res.status(400).json({ message: 'Closing hours must be after opening hours' });
      }

      const duration = restaurant.slotDuration;
      const slots = [];
      let current = start.clone();

      while (current.isBefore(end)) {
        const slotTime = current.format('HH:mm');
        const existingSlot = await Slot.findOne({ restaurant: restaurantId, date: new Date(date), time: slotTime });
        if (!existingSlot) {
          slots.push({
            restaurant: restaurantId,
            date: new Date(date),
            time: slotTime,
            isBooked: false,
          });
        } else {
          console.log(`Slot already exists for ${slotTime} on ${date}`);
        }
        current.add(duration, 'minutes');
      }

      if (slots.length === 0) {
        return res.status(200).json({ message: 'No new slots created; all slots already exist' });
      }

      const insertedSlots = await Slot.insertMany(slots);
      res.status(201).json({ message: `${insertedSlots.length} slots created`, slots: insertedSlots });
    } catch (err) {
      console.error('Create slots error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Get all slots for a restaurant
exports.getSlots = [
  check('restaurantId', 'Restaurant ID is required').isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { restaurantId } = req.params;
    const { date } = req.query;

    try {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      const query = { restaurant: restaurantId };
      if (date) query.date = new Date(date);

      const slots = await Slot.find(query)
        .sort({ date: 1, time: 1 });
      res.json(slots);
    } catch (err) {
      console.error('Get slots error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Delete slots for a restaurant
exports.deleteSlots = [
  check('restaurantId', 'Restaurant ID is required').isMongoId(),
  check('date', 'Date is required').optional().isISO8601().toDate(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { restaurantId } = req.params;
    const { date } = req.query;

    try {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      if (restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden' });
      }

      const query = { restaurant: restaurantId, isBooked: false };
      if (date) query.date = new Date(date);

      const result = await Slot.deleteMany(query);
      res.json({ message: `${result.deletedCount} unbooked slots deleted` });
    } catch (err) {
      console.error('Delete slots error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  },
];