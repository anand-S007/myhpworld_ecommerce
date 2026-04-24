const express = require('express');
const { listStores, searchByPincode, getStoreBySlug } = require('../controllers/storeController');

const router = express.Router();

router.get('/search',      searchByPincode);
router.get('/slug/:slug',  getStoreBySlug);
router.get('/',            listStores);

module.exports = router;
