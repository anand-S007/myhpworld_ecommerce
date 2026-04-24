const Category = require('../models/Category');
const NavCategory = require('../models/NavCategory');
const Banner = require('../models/Banner');
const Offer = require('../models/Offer');
const FeaturedProduct = require('../models/FeaturedProduct');
const Deal = require('../models/Deal');
const Setting = require('../models/Setting');
const { getActivePromotions, enrichProducts, enrichProduct } = require('../utils/applyPromotions');

// GET /api/categories
async function getCategories(req, res) {
  const categories = await Category.find({}).sort({ order: 1, createdAt: 1 });
  res.json(categories);
}

// GET /api/nav-categories
async function getNavCategories(req, res) {
  const nav = await NavCategory.find({}).sort({ order: 1, createdAt: 1 });
  res.json(nav);
}

// GET /api/banners
async function getBanners(req, res) {
  const banners = await Banner.find({ active: true }).sort({ order: 1, createdAt: 1 });
  res.json(banners);
}

// GET /api/offers
async function getOffers(req, res) {
  const offers = await Offer.find({ active: true }).sort({ order: 1, createdAt: 1 });
  res.json(offers);
}

// GET /api/featured-products
async function getFeaturedProducts(req, res) {
  const [featured, promos] = await Promise.all([
    FeaturedProduct.find({}).sort({ order: 1 }).populate('product'),
    getActivePromotions(),
  ]);
  // Drop slots where the referenced product has been hidden by the admin.
  const products = featured
    .map((f) => f.product)
    .filter((p) => p && p.visible !== false);
  res.json(enrichProducts(products, promos));
}

// GET /api/deal-of-the-day
// Returns every active, non-expired deal (each product enriched for any
// active promotion). Deals run for at most 24 hours so anything with an
// `endDate` in the past is filtered here instead of needing a cron job.
async function getDealOfTheDay(req, res) {
  const [deals, promos] = await Promise.all([
    Deal.find({
      active: true,
      endDate: { $gt: new Date() },
    }).sort({ createdAt: -1 }).populate('product'),
    getActivePromotions(),
  ]);
  const out = deals
    .filter((d) => d.product && d.product.visible !== false)
    .map((d) => {
      const obj = d.toObject();
      obj.product = enrichProduct(d.product, promos);
      return obj;
    });
  res.json(out);
}

// GET /api/settings — branding (logo, name, tagline). Upserts a default
// row on first read so the frontend always has something to render.
async function getSettings(req, res) {
  const existing = await Setting.findOne({ key: 'branding' });
  if (existing) return res.json(existing);
  const created = await Setting.create({ key: 'branding' });
  res.json(created);
}

module.exports = {
  getCategories,
  getNavCategories,
  getBanners,
  getOffers,
  getFeaturedProducts,
  getDealOfTheDay,
  getSettings,
};
