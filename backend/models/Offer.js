const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    tag:       { type: String, required: true },
    title:     { type: String, required: true },
    desc:      { type: String, default: '' },
    cta:       { type: String, default: 'Shop now' },
    link:      { type: String, default: '#' },
    icon:      { type: String, default: 'CreditCard' },
    bg:        { type: String, default: 'linear-gradient(135deg,#0096D6,#00205B)' },
    textColor: { type: String, default: 'text-white' },
    tagStyle:  { type: String, default: 'opacity-80' },
    iconColor: { type: String, default: 'text-white/15' },
    order:     { type: Number, default: 0 },
    active:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Offer', offerSchema);
