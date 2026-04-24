const express = require('express');
const { listProducts, getProductById } = require('../controllers/productController');
const { listReviews, upsertReview, deleteReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', listProducts);
router.get('/:id', getProductById);

// Product reviews — listing is public, writing requires a logged-in user.
router.get('/:id/reviews', listReviews);
router.post('/:id/reviews', protect, upsertReview);
router.delete('/:id/reviews/:reviewId', protect, deleteReview);

module.exports = router;
