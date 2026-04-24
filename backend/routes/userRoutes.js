const express = require('express');
const { register, login, me } = require('../controllers/authController');
const wishlist = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);

// Wishlist — all entries are scoped to the authenticated user.
router.get   ('/me/wishlist',             protect, wishlist.list);
router.post  ('/me/wishlist/:productId',  protect, wishlist.add);
router.delete('/me/wishlist/:productId',  protect, wishlist.remove);

module.exports = router;
