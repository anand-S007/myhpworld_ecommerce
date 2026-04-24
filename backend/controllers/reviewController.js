const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');

// Recompute and persist the aggregate rating + review count on the parent
// product. Called after any create/update/delete of a review so the card
// and product-detail page always show up-to-date numbers.
async function recalcProductAggregate(productId) {
  const [result] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const rating = result ? Math.round(result.avg * 10) / 10 : 0;
  const reviews = result?.count || 0;
  await Product.findByIdAndUpdate(productId, { rating, reviews });
}

// GET /api/products/:id/reviews
async function listReviews(req, res) {
  const reviews = await Review.find({ product: req.params.id })
    .populate('user', 'name')
    .sort({ createdAt: -1 });
  res.json(reviews);
}

// POST /api/products/:id/reviews — requires authenticated user.
// Upserts the caller's review for this product so submitting twice updates
// the existing entry rather than producing duplicates.
async function upsertReview(req, res) {
  const { rating, title = '', comment = '' } = req.body;
  const ratingNum = Number(rating);
  if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
  }
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const review = await Review.findOneAndUpdate(
    { product: product._id, user: req.user._id },
    {
      rating: ratingNum,
      title,
      comment,
      user: req.user._id,
      product: product._id,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await recalcProductAggregate(product._id);
  const populated = await Review.findById(review._id).populate('user', 'name');
  res.status(201).json(populated);
}

// DELETE /api/products/:id/reviews/:reviewId — only the author can delete.
async function deleteReview(req, res) {
  const review = await Review.findOneAndDelete({
    _id: req.params.reviewId,
    user: req.user._id,
  });
  if (!review) return res.status(404).json({ message: 'Review not found' });
  await recalcProductAggregate(review.product);
  res.json({ message: 'Deleted', id: review._id });
}

module.exports = { listReviews, upsertReview, deleteReview };
