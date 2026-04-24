const mongoose = require('mongoose');

// Subcategories live as a sub-document array on the parent Category so a
// single admin edit writes them atomically and product queries can still
// filter with a simple `{ category, subcategory }` index lookup.
const subcategorySchema = new mongoose.Schema(
  {
    slug:  { type: String, required: true, lowercase: true, trim: true },
    name:  { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: true, timestamps: false }
);

const categorySchema = new mongoose.Schema(
  {
    slug:          { type: String, required: true, unique: true, lowercase: true, trim: true },
    name:          { type: String, required: true, trim: true },
    icon:          { type: String, default: 'Laptop' },
    subtitle:      { type: String, default: '' },
    accent:        { type: Boolean, default: false },
    order:         { type: Number, default: 0 },
    subcategories: { type: [subcategorySchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
