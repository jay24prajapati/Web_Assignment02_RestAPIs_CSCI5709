const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const slotController = require('../controllers/slotController');

router.post('/:restaurantId', auth, role(['owner', 'admin']), slotController.createSlots);
router.get('/:restaurantId', slotController.getSlots);
router.delete('/:restaurantId', auth, role(['owner', 'admin']), slotController.deleteSlots);

module.exports = router;