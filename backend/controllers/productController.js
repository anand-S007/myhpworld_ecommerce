const Product = require('../models/Product');
const { getActivePromotions, enrichProducts, enrichProduct } = require('../utils/applyPromotions');

// Public product listing — supports search, category + subcategory filters,
// price range, in-stock toggle, multiple sorts, and paging.
const PUBLIC_SORTS = {
  popular:      { rating: -1, createdAt: -1 },
  new:          { createdAt: -1 },
  newest:       { createdAt: -1 },
  oldest:       { createdAt: 1 },
  'price-asc':  { price: 1 },
  'price-desc': { price: -1 },
  rating:       { rating: -1 },
  'name-asc':   { name: 1 },
  'name-desc':  { name: -1 },
};

// GET /api/products?category=&subcategory=&search=&sort=&minPrice=&maxPrice=&inStock=&page=&limit=
async function listProducts(req, res) {
  const {
    category, subcategory, search, sort,
    minPrice, maxPrice, inStock,
  } = req.query;
  const page  = Math.max(parseInt(req.query.page, 10)  || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  // Storefront never sees admin-hidden products. `$ne: false` so legacy
  // products that predate the `visible` field (undefined) still show up.
  const filter = { visible: { $ne: false } };
  if (category)    filter.category    = String(category).toLowerCase();
  if (subcategory) filter.subcategory = String(subcategory).toLowerCase();
  // Search spans name, series, category, subcategory and description so a
  // single query from the Navbar returns results across all of them.
  if (search) {
    const re = { $regex: search, $options: 'i' };
    filter.$or = [
      { name: re }, { series: re }, { category: re },
      { subcategory: re }, { description: re },
    ];
  }
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (inStock === 'true')  filter.stock = { $gt: 0 };
  if (inStock === 'false') filter.stock = { $lte: 0 };

  const sortSpec = PUBLIC_SORTS[sort] || PUBLIC_SORTS.newest;

  const [products, total, promos] = await Promise.all([
    Product.find(filter).sort(sortSpec).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
    getActivePromotions(),
  ]);

  res.json({
    products: enrichProducts(products, promos),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  });
}

// GET /api/products/:id
async function getProductById(req, res) {
  const product = await Product.findById(req.params.id);
  if (!product || product.visible === false) {
    return res.status(404).json({ message: 'Product not found' });
  }
  const promos = await getActivePromotions();
  res.json(enrichProduct(product, promos));
}

module.exports = { listProducts, getProductById };
