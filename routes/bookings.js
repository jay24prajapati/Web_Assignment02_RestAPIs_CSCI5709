const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const bookingController = require('../controllers/bookingController');

router.post('/', auth, bookingController.createBooking);
router.get('/user', auth, bookingController.getUserBookings);
router.get('/restaurant/:restaurantId', auth, role(['owner', 'admin']), bookingController.getRestaurantBookings);
router.get('/:id', auth, bookingController.getBooking);
router.put('/:id', auth, role(['owner', 'admin']), bookingController.updateBooking);
router.delete('/:id', auth, bookingController.deleteBooking);

module.exports = router;