const Review = require('../models/Review');
const Restaurant = require('../models/Restaurant');
const { check, validationResult, sanitize } = require('express-validator');

// Create review
exports.createReview = [
  check('restaurant', 'Restaurant ID is required').isMongoId(),
  check('rating', 'Rating must be between 1 and 5').isInt({ min: 1, max: 5 }),
  check('comment', 'Comment must be a string').optional().isString().trim().escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { restaurant, rating, comment, photos } = req.body;

    try {
      const restaurantExists = await Restaurant.findById(restaurant);
      if (!restaurantExists) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      const existingReview = await Review.findOne({ user: req.user.id, restaurant });
      if (existingReview) {
        return res.status(400).json({ message: 'User has already reviewed this restaurant' });
      }

      const review = new Review({
        user: req.user.id,
        restaurant,
        rating,
        comment,
        photos: photos || [],
      });

      await review.save();
      res.status(201).json(review);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Get reviews by restaurant
exports.getReviewsByRestaurant = async (req, res) => {
  try {
    const reviews = await Review.find({ restaurant: req.params.restaurantId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Update review
exports.updateReview = [
  check('rating', 'Rating must be between 1 and 5').optional().isInt({ min: 1, max: 5 }),
  check('comment', 'Comment must be a string').optional().isString().trim().escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }

      if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access forbidden' });
      }

      review.rating = req.body.rating || review.rating;
      review.comment = req.body.comment || review.comment;
      review.photos = req.body.photos || review.photos;

      await review.save();
      res.json(review);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// Delete review
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access forbidden' });
    }

    await review.remove();
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};