const mongoose = require('mongoose');

// Settings — a single-document collection that holds site-wide branding.
// Anywhere the app needs the logo / brand name / tagline it reads from
// here. We upsert with a fixed `key` so there's always exactly one row.
const settingSchema = new mongoose.Schema(
  {
    key:        { type: String, required: true, unique: true, default: 'branding' },
    logoUrl:    { type: String, default: '' },  // empty → fall back to the stylised "hp" badge
    faviconUrl: { type: String, default: '' },  // empty → use the static /favicon.svg shipped in index.html
    brandName:  { type: String, default: 'HP World' },
    tagline:    { type: String, default: 'myhpworld.com' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
