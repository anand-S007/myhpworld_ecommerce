const mongoose = require('mongoose');

// slugify — lowercase, replace non-alphanum with hyphen, trim edges, cap at 120 chars.
function slugify(parts) {
  return parts
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

const storeSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true },
    // URL-friendly identifier used by /stores/:slug pages. Auto-generated
    // from name + city + pincode on save, and auto-incremented on collision
    // so two "HP World Andheri" rows still get unique slugs.
    slug:    { type: String, unique: true, sparse: true, lowercase: true, trim: true, index: true },
    address: { type: String, required: true },
    city:    { type: String, required: true, index: true },
    state:   { type: String, required: true, index: true },
    pincode: { type: String, required: true, index: true },
    phone:   { type: String, default: '' },
    email:   { type: String, default: '' },
    // Hours accept either:
    //   • the legacy free-form string ("10:00 AM – 8:00 PM")
    //   • the new structured shape { days:['mon','tue',…], open:'09:00', close:'21:00' }
    // Mixed lets both shapes persist unchanged during the transition; the
    // storefront renderer handles each case explicitly.
    hours:    { type: mongoose.Schema.Types.Mixed, default: null },
    lat:      { type: Number, default: null },
    lng:      { type: Number, default: null },
    services: { type: [String], default: [] },
    // Optional short description shown on the store detail page.
    description: { type: String, default: '' },
    // Hero image for the store detail page. If empty, the page falls back
    // to a styled gradient banner — it never injects a placeholder photo.
    image:       { type: String, default: '' },
    // Google Maps URL shown as the "Get Directions" link. Previously the
    // admin form was saving this field, but it wasn't in the schema, so
    // Mongoose's default strict mode dropped it — which made the field
    // appear empty every time the admin re-opened an already-saved store.
    mapLink:  { type: String, default: '' },
    // Toggle for hiding a store without deleting it.
    active:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Pre-save — (re)generate slug when it's empty or when the name/city changes.
// Loops with a numeric suffix if another store already holds the same slug.
storeSchema.pre('save', async function (next) {
  try {
    const nameChanged = this.isModified('name') || this.isModified('city') || this.isModified('pincode');
    if (!this.slug || nameChanged) {
      const base = slugify([this.name, this.city, this.pincode]) || 'store';
      let candidate = base;
      let counter = 2;
      const Store = mongoose.models.Store;
      // Collision guard — append -2, -3… until we find a free slug.
      while (await Store.exists({ slug: candidate, _id: { $ne: this._id } })) {
        candidate = `${base}-${counter++}`;
        if (counter > 100) break;
      }
      this.slug = candidate;
    }
    next();
  } catch (e) {
    next(e);
  }
});

storeSchema.statics.slugify = slugify;

module.exports = mongoose.model('Store', storeSchema);
