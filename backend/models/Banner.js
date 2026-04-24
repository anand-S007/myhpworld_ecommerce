const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    badge: {
      label: String,
      pulse: { type: Boolean, default: false },
      red:   { type: Boolean, default: false },
    },
    title:               { type: String, required: true },
    titleHighlight:      { type: String, default: null },
    titleHighlightClass: { type: String, default: null },
    titleLine2:          { type: String, default: null },
    desc:                { type: String, default: '' },
    cta: {
      primary:       String,
      primaryLink:   String,
      secondary:     String,
      secondaryLink: String,
    },
    features: [
      {
        icon:  String,
        label: String,
      },
    ],
    visual:   { type: String, default: 'laptop' },
    imageUrl: { type: String, default: null },
    order:    { type: Number, default: 0 },
    active:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);
