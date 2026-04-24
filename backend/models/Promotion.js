const mongoose = require('mongoose');

// Promotion — an admin-authored discount rule that applies a percentage off
// either a whole category, a list of specific products, or the entire
// catalogue. When the storefront fetches products, the server resolves the
// best matching active promotion and enriches each product with
// `discountedPrice` + `promoPercent` before sending it to the client.
const promotionSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true },
    percent:   { type: Number, required: true, min: 1, max: 90 },
    // 'all'      → applies to every product in the catalog
    // 'category' → `targets` holds one or more category slugs
    // 'product'  → `targets` holds product ObjectIds (as strings)
    appliesTo: {
      type: String,
      required: true,
      enum: ['all', 'category', 'product'],
      default: 'category',
    },
    targets:   { type: [String], default: [] },
    // Optional schedule — a missing start/end is treated as "no lower/upper
    // bound". An inactive promo never applies regardless of dates.
    startDate: { type: Date },
    endDate:   { type: Date },
    active:    { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Promotion', promotionSchema);
