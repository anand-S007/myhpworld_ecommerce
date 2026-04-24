const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    rating:  { type: Number, required: true, min: 1, max: 5 },
    title:   { type: String, default: '', trim: true, maxlength: 120 },
    comment: { type: String, default: '', trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

// One review per user per product — upsert updates the existing one instead
// of creating a duplicate.
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
