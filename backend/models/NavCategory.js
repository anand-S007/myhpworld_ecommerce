const mongoose = require('mongoose');

const navCategorySchema = new mongoose.Schema(
  {
    label:    { type: String, required: true, trim: true },
    to:       { type: String, required: true, trim: true },
    dropdown: { type: Boolean, default: false },
    badge:    { type: String, default: '' },
    order:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NavCategory', navCategorySchema);
