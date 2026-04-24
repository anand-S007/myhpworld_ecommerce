const express = require('express');
const { adminLogin } = require('../controllers/adminAuthController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const { uploadImage } = require('../middleware/upload');
const c = require('../controllers/adminController');
const { getVisitStats } = require('../controllers/analyticsController');

const router = express.Router();

// Public admin auth
router.post('/login', adminLogin);

// All routes below require a valid admin JWT
router.use(protectAdmin);

// Generic image upload — returns { url } pointing at the static /uploads path.
// Used by any admin form that offers "Upload" as an alternative to "Paste URL".
router.post('/upload', uploadImage.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image file received' });
  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
});

// Dashboard
router.get('/stats', c.getStats);

// Categories
router.get('/categories',        c.listCategories);
router.post('/categories',       c.createCategory);
router.put('/categories/:id',    c.updateCategory);
router.delete('/categories/:id', c.deleteCategory);

// Nav categories (navbar menu items)
router.get('/nav-categories',        c.listNavCategories);
router.post('/nav-categories',       c.createNavCategory);
router.put('/nav-categories/:id',    c.updateNavCategory);
router.delete('/nav-categories/:id', c.deleteNavCategory);

// Banners
router.get('/banners',        c.listBanners);
router.post('/banners',       c.createBanner);
router.put('/banners/:id',    c.updateBanner);
router.delete('/banners/:id', c.deleteBanner);

// Offers
router.get('/offers',        c.listOffers);
router.post('/offers',       c.createOffer);
router.put('/offers/:id',    c.updateOffer);
router.delete('/offers/:id', c.deleteOffer);

// Products
router.get('/products',        c.listProducts);
router.post('/products',       c.createProduct);
router.post('/products/bulk',  c.bulkCreateProducts);
router.put('/products/:id',    c.updateProduct);
router.delete('/products/:id', c.deleteProduct);

// Featured products
router.get('/featured-products', c.getFeatured);
router.put('/featured-products', c.setFeatured);

// Deals of the Day — multiple allowed. Each has its own visibility toggle
// and a 24h end-date cap. Expired deals auto-hide from the storefront.
router.get('/deals',        c.listDeals);
router.post('/deals',       c.createDeal);
router.put('/deals/:id',    c.updateDeal);
router.delete('/deals/:id', c.deleteDeal);

// Orders
router.get('/orders',     c.listOrders);
router.put('/orders/:id', c.updateOrder);

// Stores
router.get('/stores',        c.listStores);
router.post('/stores',       c.createStore);
router.put('/stores/:id',    c.updateStore);
router.delete('/stores/:id', c.deleteStore);

// Users
router.get('/users',            c.listUsers);
router.put('/users/:id/role',   c.updateUserRole);
router.put('/users/:id/block',  c.setUserBlocked);

// Promotions (category / product percentage discounts)
router.get('/promotions',         c.listPromotions);
router.post('/promotions',        c.createPromotion);
router.put('/promotions/:id',     c.updatePromotion);
router.delete('/promotions/:id',  c.deletePromotion);

// Branding — site-wide logo, brand name, tagline
router.get('/settings', c.getBranding);
router.put('/settings', c.updateBranding);

// Analytics — visitor counts with 1h / 1d / 1m / 1y range filter
router.get('/analytics/visits', getVisitStats);

module.exports = router;
