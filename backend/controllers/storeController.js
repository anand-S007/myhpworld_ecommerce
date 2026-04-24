const Store = require('../models/Store');

// Lazy backfill — any legacy store that predates the `slug` field gets
// one saved the first time it's listed. Idempotent + cheap: after the
// first pageview per store, this loop is a no-op forever.
async function ensureSlugs(stores) {
  for (const s of stores) {
    if (!s.slug) {
      try { await s.save(); } catch (_e) { /* skip — slug will fill next round */ }
    }
  }
}

// GET /api/stores?city=&state=
async function listStores(req, res) {
  const { city, state } = req.query;
  const filter = {};
  if (city)  filter.city  = new RegExp(`^${city}$`, 'i');
  if (state) filter.state = new RegExp(`^${state}$`, 'i');
  const stores = await Store.find(filter).sort({ city: 1, name: 1 });
  await ensureSlugs(stores);
  res.json(stores);
}

// GET /api/stores/search?pincode=
async function searchByPincode(req, res) {
  const { pincode } = req.query;
  if (!pincode) return res.status(400).json({ message: 'pincode query param is required' });
  const stores = await Store.find({ pincode }).sort({ name: 1 });
  await ensureSlugs(stores);
  res.json(stores);
}

// GET /api/stores/slug/:slug
// Returns the store + up to 6 other nearby stores in the same city for
// the "Other stores in <city>" section on the detail page.
async function getStoreBySlug(req, res) {
  const slug = String(req.params.slug || '').toLowerCase().trim();
  if (!slug) return res.status(400).json({ message: 'slug is required' });

  const store = await Store.findOne({ slug });
  if (!store) return res.status(404).json({ message: 'Store not found' });

  const related = await Store.find({
    city: store.city,
    _id:  { $ne: store._id },
  })
    .sort({ name: 1 })
    .limit(6);
  await ensureSlugs(related);

  res.json({ store, related });
}

module.exports = { listStores, searchByPincode, getStoreBySlug };
