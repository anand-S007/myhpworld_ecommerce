const mongoose = require('mongoose');

// A Deal is a promotional row tied to a single product. Multiple active
// deals can exist at once — the storefront renders every deal whose `active`
// flag is on (and whose referenced product is still visible).
const dealSchema = new mongoose.Schema(
  {
    product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    series:   String,
    name:     String,
    price:    Number,
    mrp:      Number,
    savings:  Number,
    rating:   Number,
    reviews:  Number,
    discount: Number,
    endDate:  Date,
    perks:    String,
    // Admin-controlled visibility switch for this specific deal row.
    active:   { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Deal', dealSchema);
