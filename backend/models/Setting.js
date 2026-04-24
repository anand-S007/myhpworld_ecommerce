const mongoose = require('mongoose');

// One row in the admin-managed social links list. `platform` is a key the
// footer recognises (facebook, instagram, twitter, linkedin, youtube,
// pinterest, tiktok, whatsapp, telegram). Anything else — including the
// special `custom` value — renders a generic link icon in the footer so
// admins can add accounts on platforms the app doesn't ship an icon for.
const socialSchema = new mongoose.Schema(
  {
    platform: { type: String, required: true, lowercase: true, trim: true },
    label:    { type: String, default: '', trim: true },
    url:      { type: String, required: true, trim: true },
  },
  { _id: true, timestamps: false }
);

// Settings — a single-document collection that holds site-wide branding
// and contact details. Anywhere the app needs the logo / brand name /
// tagline / phone / email / socials, it reads from here. We upsert with
// a fixed `key` so there's always exactly one row.
const settingSchema = new mongoose.Schema(
  {
    key:        { type: String, required: true, unique: true, default: 'branding' },
    logoUrl:    { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    brandName:  { type: String, default: 'HP World' },
    tagline:    { type: String, default: 'myhpworld.com' },

    phone:          { type: String, default: '+91 99461 26608' },
    whatsappNumber: { type: String, default: '919946126608' },
    email:          { type: String, default: 'hello@myhpworld.com' },

    // Dynamic list — admin can add/remove rows in the branding page.
    socials: { type: [socialSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
