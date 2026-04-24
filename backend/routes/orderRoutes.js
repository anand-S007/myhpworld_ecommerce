const express = require('express');
const { createOrder, listMyOrders } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/me', protect, listMyOrders);

module.exports = router;
