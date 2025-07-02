const Restaurant = require('../models/Restaurant');
const { check, validationResult, sanitize } = require('express-validator');

// Create restaurant (owner only)
exports.createRestaurant = [
  check('name', 'Restaurant name is required').not().isEmpty().trim().escape(),
  check('address', 'Address is required').not().isEmpty().trim().escape(),
  check('cuisine', 'Cuisine must be a string').optional().isString().trim().escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address, cuisine } = req.body;

    try {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ message: 'Access forbidden: only owners can create restaurants' });
      }

      const restaurant = new Restaurant({
        name,
        address,
        owner: req.user.id,
        cuisine,
        menu: [],
      });

      await restaurant.save();
      res.status(201).json(restaurant);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Get all restaurants (public with pagination)
exports.getAllRestaurants = [
  check('page', 'Page must be a positive number').optional().isInt({ min: 1 }),
  check('limit', 'Limit must be a positive number').optional().isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
      const restaurants = await Restaurant.find()
        .populate('owner', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      const total = await Restaurant.countDocuments();

      res.json({
        restaurants,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Get restaurant details
exports.getRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate('owner', 'name email');
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Update restaurant details
exports.updateRestaurant = [
  check('name', 'Name is required').optional().not().isEmpty().trim().escape(),
  check('address', 'Address is required').optional().not().isEmpty().trim().escape(),
  check('cuisine', 'Cuisine must be a string').optional().isString().trim().escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const restaurant = await Restaurant.findById(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      if (restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden' });
      }

      restaurant.name = req.body.name || restaurant.name;
      restaurant.address = req.body.address || restaurant.address;
      restaurant.cuisine = req.body.cuisine || restaurant.cuisine;

      await restaurant.save();
      res.json(restaurant);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Add menu item
exports.addMenuItem = [
  check('name', 'Menu item name is required').not().isEmpty().trim().escape(),
  check('price', 'Price must be a positive number').isFloat({ min: 0 }),
  check('description', 'Description must be a string').optional().isString().trim().escape(),
  check('category', 'Category must be a string').optional().isString().trim().escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const restaurant = await Restaurant.findById(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      if (restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden' });
      }

      const { name, description, price, category } = req.body;
      restaurant.menu.push({ name, description, price, category });
      await restaurant.save();
      res.status(201).json(restaurant);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Update menu item
exports.updateMenuItem = [
  check('name', 'Menu item name is required').optional().not().isEmpty().trim().escape(),
  check('price', 'Price must be a positive number').optional().isFloat({ min: 0 }),
  check('description', 'Description must be a string').optional().isString().trim().escape(),
  check('category', 'Category must be a string').optional().isString().trim().escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const restaurant = await Restaurant.findById(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      if (restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden' });
      }

      const menuItem = restaurant.menu.id(req.params.itemId);
      if (!menuItem) {
        return res.status(404).json({ message: 'Menu item not found' });
      }

      menuItem.name = req.body.name || menuItem.name;
      menuItem.description = req.body.description || menuItem.description;
      menuItem.price = req.body.price || menuItem.price;
      menuItem.category = req.body.category || menuItem.category;

      await restaurant.save();
      res.json(restaurant);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Delete menu item
exports.deleteMenuItem = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    if (restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access forbidden' });
    }

    const menuItem = restaurant.menu.id(req.params.itemId);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    menuItem.remove();
    await restaurant.save();
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};