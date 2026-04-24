const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true, index: true },
    series:      { type: String, default: '' },
    category:    { type: String, required: true, lowercase: true, index: true },
    subcategory: { type: String, default: '', lowercase: true, trim: true, index: true },
    price:       { type: Number, required: true, min: 0 },
    mrp:         { type: Number, required: true, min: 0 },
    rating:      { type: Number, default: 0, min: 0, max: 5 },
    reviews:     { type: Number, default: 0, min: 0 },
    badge:       { type: String, default: '' },
    description: { type: String, default: '' },
    specs:       { type: mongoose.Schema.Types.Mixed, default: {} },
    stock:       { type: Number, default: 0, min: 0 },
    // Admin toggle — when false, the product is hidden from the storefront
    // (category pages, product detail, featured, deal of the day) but still
    // listed in the admin panel so it can be reviewed / re-enabled.
    visible:     { type: Boolean, default: true, index: true },
    images:      { type: [String], default: [] },
    imageUrl:    { type: String, default: '' },
    tint:        { type: String, default: 'from-slate-50 to-slate-100' },
    icon:        { type: String, default: 'Laptop' },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', series: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);
