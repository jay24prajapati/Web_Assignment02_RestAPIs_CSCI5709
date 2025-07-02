const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const bookingController = require('../controllers/bookingController');

router.post('/', auth, bookingController.createBooking);
router.get('/:id', auth, bookingController.getBooking);
router.put('/:id', auth, role(['owner']), bookingController.updateBooking);
router.delete('/:id', auth, bookingController.deleteBooking);

module.exports = router;