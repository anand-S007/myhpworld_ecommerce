const express = require('express');
const {
  getCategories,
  getNavCategories,
  getBanners,
  getOffers,
  getFeaturedProducts,
  getDealOfTheDay,
  getSettings,
} = require('../controllers/homeController');

const router = express.Router();

router.get('/categories',        getCategories);
router.get('/nav-categories',    getNavCategories);
router.get('/banners',           getBanners);
router.get('/offers',            getOffers);
router.get('/featured-products', getFeaturedProducts);
router.get('/deal-of-the-day',   getDealOfTheDay);
router.get('/settings',          getSettings);

module.exports = router;
