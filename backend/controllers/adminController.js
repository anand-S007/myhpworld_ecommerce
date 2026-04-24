const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Category = require('../models/Category');
const Banner = require('../models/Banner');
const Offer = require('../models/Offer');
const FeaturedProduct = require('../models/FeaturedProduct');
const Deal = require('../models/Deal');
const Store = require('../models/Store');
const NavCategory = require('../models/NavCategory');
const Promotion = require('../models/Promotion');
const Setting = require('../models/Setting');

// ── Dashboard stats ─────────────────────────────────────────────────────────
// GET /api/admin/stats
async function getStats(req, res) {
  const [products, orders, users, revenueAgg, recentOrders] = await Promise.all([
    Product.countDocuments(),
    Order.countDocuments(),
    User.countDocuments(),
    Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),
    Order.find({}).populate('user', 'name email').sort({ createdAt: -1 }).limit(10),
  ]);
  const revenue = revenueAgg[0]?.total || 0;
  res.json({
    stats: { products, orders, users, revenue },
    recentOrders,
  });
}

// ── Generic CRUD factory ────────────────────────────────────────────────────
function crud(Model, opts = {}) {
  const sort = opts.sort || { createdAt: -1 };
  return {
    list: async (req, res) => {
      const items = await Model.find({}).sort(sort);
      res.json(items);
    },
    create: async (req, res) => {
      const item = await Model.create(req.body);
      res.status(201).json(item);
    },
    update: async (req, res) => {
      const item = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!item) return res.status(404).json({ message: `${Model.modelName} not found` });
      res.json(item);
    },
    remove: async (req, res) => {
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({ message: `${Model.modelName} not found` });
      res.json({ message: 'Deleted', id: item._id });
    },
  };
}

const categories   = crud(Category,   { sort: { order: 1, createdAt: 1 } });
const banners      = crud(Banner,     { sort: { order: 1, createdAt: 1 } });
const offers       = crud(Offer,      { sort: { order: 1, createdAt: 1 } });
const stores       = crud(Store,      { sort: { city: 1, name: 1 } });
const navCategories = crud(NavCategory, { sort: { order: 1, createdAt: 1 } });

// ── Products (with pagination + search + filter + sort) ─────────────────────
// GET /api/admin/products
const PRODUCT_SORTS = {
  newest:     { createdAt: -1 },
  oldest:     { createdAt: 1 },
  'price-asc':  { price: 1 },
  'price-desc': { price: -1 },
  'name-asc':   { name: 1 },
  'name-desc':  { name: -1 },
  'stock-asc':  { stock: 1 },
  'stock-desc': { stock: -1 },
};

async function listProducts(req, res) {
  const { search, category, subcategory, sort, minPrice, maxPrice, inStock } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

  const filter = {};
  if (search) filter.$or = [
    { name:   { $regex: search, $options: 'i' } },
    { series: { $regex: search, $options: 'i' } },
  ];
  if (category)    filter.category    = String(category).toLowerCase();
  if (subcategory) filter.subcategory = String(subcategory).toLowerCase();

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (inStock === 'true')  filter.stock = { $gt: 0 };
  if (inStock === 'false') filter.stock = { $lte: 0 };

  const sortBy = PRODUCT_SORTS[sort] || PRODUCT_SORTS.newest;

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);
  res.json({
    products,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  });
}
// Slugify a free-form category / subcategory value so "HP Omnibook" and
// "hp-omnibook" both land on the same canonical slug in the DB.
function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Shared validator + normaliser for BOTH the single-product form and the
// bulk CSV upload. Keeps the schema invariants in one place so the two
// paths can't drift out of sync.
//
// Throws a 400-style Error on any validation failure. Returns a clean
// payload ready for `Product.create(...)` on success.
//
// Options:
//   minImages — 3 for the admin form, 1 for bulk imports (legacy catalogs
//               often ship one photo; admins add more later). Max 8 everywhere.
function validateAndNormalizeProduct(body, { minImages = 3 } = {}) {
  const errors = [];

  const name        = String(body.name        || '').trim();
  const category    = slugify(body.category);
  const subcategory = slugify(body.subcategory);
  const series      = String(body.series      || '').trim();
  const badge       = String(body.badge       || '').trim();
  const description = String(body.description || '').trim();

  if (!name)              errors.push('Name is required');
  if (name.length > 200)  errors.push('Name must be under 200 characters');
  if (!category)          errors.push('Category is required');

  const priceN = Number(body.price);
  const mrpN   = Number(body.mrp);
  if (!Number.isFinite(priceN) || priceN <= 0) errors.push('Price must be a positive number');
  if (!Number.isFinite(mrpN)   || mrpN   <= 0) errors.push('MRP must be a positive number');
  if (Number.isFinite(priceN) && Number.isFinite(mrpN) && priceN > mrpN) {
    errors.push('Price cannot be greater than MRP');
  }

  const stockRaw = body.stock == null || body.stock === '' ? 0 : Number(body.stock);
  if (!Number.isFinite(stockRaw) || stockRaw < 0 || Math.floor(stockRaw) !== stockRaw) {
    errors.push('Stock must be a non-negative integer');
  }

  // Images — deduplicate while preserving order, strip empties.
  const seen = new Set();
  const images = (Array.isArray(body.images) ? body.images : [])
    .map((s) => (s == null ? '' : String(s).trim()))
    .filter((s) => {
      if (!s) return false;
      if (seen.has(s)) return false;
      seen.add(s); return true;
    });
  if (images.length < minImages) {
    errors.push(`At least ${minImages} image${minImages === 1 ? '' : 's'} required (got ${images.length})`);
  }
  if (images.length > 8) errors.push('No more than 8 images per product');

  // Specs — object with stringy keys and values; reject weird shapes.
  const specs = {};
  if (body.specs && typeof body.specs === 'object' && !Array.isArray(body.specs)) {
    for (const [k, v] of Object.entries(body.specs)) {
      const key = String(k || '').trim();
      const val = v == null ? '' : String(v).trim();
      if (key && val) specs[key] = val;
    }
  } else if (body.specs != null && !(typeof body.specs === 'object')) {
    errors.push('Specs must be an object of key → value pairs');
  }

  if (errors.length > 0) {
    const err = new Error(errors.join('; '));
    err.status = 400;
    throw err;
  }

  return {
    name,
    series,
    category,
    subcategory,
    price: priceN,
    mrp:   mrpN,
    stock: Math.max(0, Math.floor(stockRaw)),
    badge,
    description,
    specs,
    images,
    imageUrl: images[0],
    visible:  body.visible === false ? false : true,
  };
}

// Partial-update normaliser — only touches the fields the admin actually
// sent. Useful for PATCH-style PUTs (e.g. toggling `visible` inline).
function normalizeProductUpdate(body) {
  const payload = { ...body };
  if ('category'    in payload) payload.category    = slugify(payload.category);
  if ('subcategory' in payload) payload.subcategory = slugify(payload.subcategory);
  if (Array.isArray(payload.images)) {
    const seen = new Set();
    payload.images = payload.images
      .map((s) => (s == null ? '' : String(s).trim()))
      .filter((s) => {
        if (!s) return false;
        if (seen.has(s)) return false;
        seen.add(s); return true;
      });
    if (payload.images.length < 3 || payload.images.length > 8) {
      const err = new Error(
        `Product must have between 3 and 8 images (got ${payload.images.length}).`,
      );
      err.status = 400;
      throw err;
    }
    payload.imageUrl = payload.images[0];
  }
  return payload;
}

const createProduct = async (req, res) => {
  try {
    const payload = validateAndNormalizeProduct(req.body, { minImages: 3 });
    res.status(201).json(await Product.create(payload));
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ message: e.message });
    throw e;
  }
};
const updateProduct = async (req, res) => {
  try {
    const payload = normalizeProductUpdate(req.body);
    const p = await Product.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!p) return res.status(404).json({ message: 'Product not found' });
    res.json(p);
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ message: e.message });
    throw e;
  }
};
const deleteProduct = async (req, res) => {
  const p = await Product.findByIdAndDelete(req.params.id);
  if (!p) return res.status(404).json({ message: 'Product not found' });
  // Also clean up any featured reference to this product
  await FeaturedProduct.deleteMany({ product: p._id });
  res.json({ message: 'Deleted', id: p._id });
};

// POST /api/admin/products/bulk  body: { products: [...] }
// Reuses the same validator the single-create form uses (via
// validateAndNormalizeProduct) so both paths enforce identical invariants.
// Only difference: bulk imports accept 1+ images instead of 3+ for legacy
// catalogues; the admin can top up images on individual rows later.
async function bulkCreateProducts(req, res) {
  const rows = Array.isArray(req.body?.products) ? req.body.products : [];
  if (!rows.length)      return res.status(400).json({ message: 'No products provided.' });
  if (rows.length > 500) return res.status(400).json({ message: 'Max 500 products per upload.' });

  let created = 0;
  const failed = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const payload = validateAndNormalizeProduct(row, { minImages: 1 });
      await Product.create(payload);
      created++;
    } catch (e) {
      failed.push({
        row:   i + 1,
        name:  row?.name || '(unnamed)',
        error: e.message,
      });
    }
  }

  res.status(201).json({ created, failed, total: rows.length });
}

// ── Featured products (4 slots) ─────────────────────────────────────────────
// GET /api/admin/featured-products
async function getFeatured(req, res) {
  const featured = await FeaturedProduct.find({}).sort({ order: 1 }).populate('product');
  res.json(featured);
}
// PUT /api/admin/featured-products  body: { productIds: [] }
async function setFeatured(req, res) {
  const { productIds } = req.body;
  if (!Array.isArray(productIds)) return res.status(400).json({ message: 'productIds array required' });
  await FeaturedProduct.deleteMany({});
  const docs = productIds.map((id, i) => ({ product: id, order: i }));
  if (docs.length) await FeaturedProduct.insertMany(docs);
  const featured = await FeaturedProduct.find({}).sort({ order: 1 }).populate('product');
  res.json(featured);
}

// ── Deals (multiple) ────────────────────────────────────────────────────────
// Admins can set any number of deals. Each deal runs for at most 24 hours
// and each has its own `active` visibility toggle. The storefront only
// shows deals where `active: true` AND `endDate > now`.
const MAX_DEAL_HOURS = 24;

// Validates the body's endDate. Required — every deal has a 24-hour
// window. Returns a Date or throws a 400-style error.
function validateEndDate(endDate) {
  if (!endDate) {
    const e = new Error('An end date is required.'); e.status = 400; throw e;
  }
  const d = new Date(endDate);
  if (isNaN(d.getTime())) {
    const e = new Error('Invalid end date.'); e.status = 400; throw e;
  }
  if (d.getTime() <= Date.now()) {
    const e = new Error('End date must be in the future.'); e.status = 400; throw e;
  }
  const maxAhead = Date.now() + MAX_DEAL_HOURS * 60 * 60 * 1000;
  if (d.getTime() > maxAhead) {
    const e = new Error(`Deals can run for at most ${MAX_DEAL_HOURS} hours.`);
    e.status = 400; throw e;
  }
  return d;
}

// GET /api/admin/deals — all deals (active, hidden, or expired) so the
// admin sees the full picture.
async function listDeals(req, res) {
  const deals = await Deal.find({}).sort({ createdAt: -1 }).populate('product');
  res.json(deals);
}

async function createDeal(req, res) {
  try {
    const body = { ...req.body };
    if (!body.product) return res.status(400).json({ message: 'A product is required.' });
    body.endDate = validateEndDate(body.endDate);
    const deal = await Deal.create(body);
    const populated = await Deal.findById(deal._id).populate('product');
    res.status(201).json(populated);
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ message: e.message });
    throw e;
  }
}

async function updateDeal(req, res) {
  try {
    const body = { ...req.body };
    // Only validate the end date when the admin is actually changing it —
    // e.g. an inline "toggle visibility" PUT that only sends { active }
    // shouldn't fail a required-field check.
    if ('endDate' in body) body.endDate = validateEndDate(body.endDate);
    const deal = await Deal.findByIdAndUpdate(req.params.id, body, {
      new: true, runValidators: true,
    }).populate('product');
    if (!deal) return res.status(404).json({ message: 'Deal not found.' });
    res.json(deal);
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ message: e.message });
    throw e;
  }
}

async function deleteDeal(req, res) {
  const deal = await Deal.findByIdAndDelete(req.params.id);
  if (!deal) return res.status(404).json({ message: 'Deal not found.' });
  res.json({ message: 'Deleted', id: deal._id });
}

// ── Orders ──────────────────────────────────────────────────────────────────
// GET /api/admin/orders
async function listOrders(req, res) {
  const { status } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const filter = {};
  if (status) filter.status = status;
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('user', 'name email phone').sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ orders, total, page, totalPages: Math.ceil(total / limit) || 1 });
}
// PUT /api/admin/orders/:id
async function updateOrder(req, res) {
  const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
}

// ── Users ───────────────────────────────────────────────────────────────────
// GET /api/admin/users
async function listUsers(req, res) {
  const { search } = req.query;
  const filter = {};
  if (search) filter.$or = [
    { name:  { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
    { phone: { $regex: search, $options: 'i' } },
  ];
  const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
  res.json(users);
}

// PUT /api/admin/users/:id/block  body: { blocked: boolean }
// Flips the user's block flag. Blocked users can't sign in and existing
// tokens are rejected by the customer auth middleware.
async function setUserBlocked(req, res) {
  const blocked = !!req.body?.blocked;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { blocked },
    { new: true },
  ).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json(user);
}

// ── Promotions ──────────────────────────────────────────────────────────────
// Admin CRUD for product / category discounts. The storefront applies any
// active promo at read time via enrichProducts() — products are never
// mutated, so toggling or removing a promo instantly affects pricing.
async function listPromotions(req, res) {
  const promos = await Promotion.find({}).sort({ createdAt: -1 });
  res.json(promos);
}
async function createPromotion(req, res) {
  const promo = await Promotion.create(req.body);
  res.status(201).json(promo);
}
async function updatePromotion(req, res) {
  const promo = await Promotion.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!promo) return res.status(404).json({ message: 'Promotion not found.' });
  res.json(promo);
}
// ── Branding / Settings ─────────────────────────────────────────────────────
// GET /api/admin/settings — mirror of the public endpoint, returned here so
// the admin panel always reads through its own JWT-protected axios instance.
async function getBranding(req, res) {
  const existing = await Setting.findOne({ key: 'branding' });
  if (existing) return res.json(existing);
  const created = await Setting.create({ key: 'branding' });
  res.json(created);
}

// PUT /api/admin/settings — upsert the single branding doc. Accepts
// logoUrl / faviconUrl / brandName / tagline and only touches whichever
// are provided.
async function updateBranding(req, res) {
  const { logoUrl, faviconUrl, brandName, tagline } = req.body || {};
  const update = {};
  if (typeof logoUrl    === 'string') update.logoUrl    = logoUrl;
  if (typeof faviconUrl === 'string') update.faviconUrl = faviconUrl;
  if (typeof brandName  === 'string') update.brandName  = brandName.trim();
  if (typeof tagline    === 'string') update.tagline    = tagline.trim();
  const doc = await Setting.findOneAndUpdate(
    { key: 'branding' },
    { $set: update, $setOnInsert: { key: 'branding' } },
    { new: true, upsert: true, runValidators: true },
  );
  res.json(doc);
}

async function deletePromotion(req, res) {
  const promo = await Promotion.findByIdAndDelete(req.params.id);
  if (!promo) return res.status(404).json({ message: 'Promotion not found.' });
  res.json({ message: 'Deleted', id: promo._id });
}

// PUT /api/admin/users/:id/role  body: { role }
// Super-admin only. Sets the customer's role label. Any non-empty slug is
// allowed, so super-admin can mint new roles on the fly without a separate
// "role catalog" table. Whitespace is trimmed and the value lowercased.
async function updateUserRole(req, res) {
  if (req.admin?.role !== 'superadmin') {
    return res.status(403).json({ message: 'Only a super-admin can change user roles.' });
  }
  const role = String(req.body?.role || '').trim().toLowerCase();
  if (!role) return res.status(400).json({ message: 'Role value required.' });
  if (!/^[a-z0-9_-]{2,30}$/.test(role)) {
    return res.status(400).json({ message: 'Role must be 2–30 chars, lowercase letters/digits/underscore/dash.' });
  }
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json(user);
}

module.exports = {
  getStats,
  // Categories
  listCategories:   categories.list,
  createCategory:   categories.create,
  updateCategory:   categories.update,
  deleteCategory:   categories.remove,
  // Nav categories
  listNavCategories:  navCategories.list,
  createNavCategory:  navCategories.create,
  updateNavCategory:  navCategories.update,
  deleteNavCategory:  navCategories.remove,
  // Banners
  listBanners:      banners.list,
  createBanner:     banners.create,
  updateBanner:     banners.update,
  deleteBanner:     banners.remove,
  // Offers
  listOffers:       offers.list,
  createOffer:      offers.create,
  updateOffer:      offers.update,
  deleteOffer:      offers.remove,
  // Stores
  listStores:       stores.list,
  createStore:      stores.create,
  updateStore:      stores.update,
  deleteStore:      stores.remove,
  // Products
  listProducts, createProduct, updateProduct, deleteProduct, bulkCreateProducts,
  // Featured / Deal
  getFeatured, setFeatured,
  listDeals, createDeal, updateDeal, deleteDeal,
  // Orders / Users
  listOrders, updateOrder,
  listUsers, updateUserRole, setUserBlocked,
  // Promotions
  listPromotions, createPromotion, updatePromotion, deletePromotion,
  // Branding
  getBranding, updateBranding,
};
