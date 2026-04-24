const mongoose = require('mongoose');

const featuredSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    order:   { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeaturedProduct', featuredSchema);
