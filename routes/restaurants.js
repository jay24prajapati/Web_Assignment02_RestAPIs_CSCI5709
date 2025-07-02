const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const restaurantController = require('../controllers/restaurantController');

router.post('/', auth, role(['owner']), restaurantController.createRestaurant);
router.get('/', restaurantController.getAllRestaurants);
router.get('/:id', restaurantController.getRestaurant);
router.put('/:id', auth, role(['owner', 'admin']), restaurantController.updateRestaurant);
router.post('/:id/menu', auth, role(['owner', 'admin']), restaurantController.addMenuItem);
router.put('/:id/menu/:itemId', auth, role(['owner', 'admin']), restaurantController.updateMenuItem);
router.delete('/:id/menu/:itemId', auth, role(['owner', 'admin']), restaurantController.deleteMenuItem);

module.exports = router;