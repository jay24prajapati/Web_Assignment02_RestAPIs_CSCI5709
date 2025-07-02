const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const restaurantController = require('../controllers/restaurantController');

router.post('/', auth, role(['owner']), restaurantController.createRestaurant);
router.get('/:id', restaurantController.getRestaurant);
router.put('/:id', auth, role(['owner']), restaurantController.updateRestaurant);
router.post('/:id/menu', auth, role(['owner']), restaurantController.addMenuItem);
router.put('/:id/menu/:itemId', auth, role(['owner']), restaurantController.updateMenuItem);
router.delete('/:id/menu/:itemId', auth, role(['owner']), restaurantController.deleteMenuItem);

module.exports = router;