const Promotion = require('../models/Promotion');

// Returns the list of promotions that are currently in effect (active flag
// on, and optional start/end dates bracket "now"). Called once per request
// so we don't pay the Mongo round-trip per product.
async function getActivePromotions() {
  const now = new Date();
  return Promotion.find({
    active: true,
    $and: [
      { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate:   { $exists: false } }, { endDate:   null }, { endDate:   { $gte: now } }] },
    ],
  }).sort({ percent: -1 }); // highest discount first — wins ties
}

// Given a product (mongoose doc or plain object) and a list of active
// promotions, returns the best applicable promotion or null. Product-level
// matches beat category-level matches; within each, the highest percent wins.
function pickPromotion(product, promos) {
  const pid = String(product._id || product.id || '');
  const cat = String(product.category || '').toLowerCase();
  const byProduct  = promos.filter((p) => p.appliesTo === 'product'  && p.targets.map(String).includes(pid));
  const byCategory = promos.filter((p) => p.appliesTo === 'category' && p.targets.map((t) => t.toLowerCase()).includes(cat));
  const byAll      = promos.filter((p) => p.appliesTo === 'all');
  // Because getActivePromotions() already sorts by -percent, the first hit
  // in each tier is the winner.
  return byProduct[0] || byCategory[0] || byAll[0] || null;
}

// Enriches a product object with `discountedPrice` + `promoPercent` +
// `promoName` when a promotion applies. Accepts either a mongoose doc
// (converted to plain object before enriching) or a plain object.
function enrichProduct(product, promos) {
  const plain = typeof product.toObject === 'function' ? product.toObject() : { ...product };
  const promo = pickPromotion(plain, promos);
  if (!promo) return plain;
  const price = Number(plain.price) || 0;
  plain.promoPercent    = promo.percent;
  plain.promoName       = promo.name;
  plain.discountedPrice = Math.round(price * (1 - promo.percent / 100));
  return plain;
}

// Enriches an array of products. Cheap when the promo list is empty.
function enrichProducts(products, promos) {
  if (!promos || promos.length === 0) {
    return products.map((p) =>
      typeof p.toObject === 'function' ? p.toObject() : p
    );
  }
  return products.map((p) => enrichProduct(p, promos));
}

module.exports = { getActivePromotions, pickPromotion, enrichProduct, enrichProducts };
