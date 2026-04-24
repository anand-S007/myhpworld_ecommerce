const express = require('express');
const { trackVisit } = require('../controllers/analyticsController');

const router = express.Router();

// Public — fires on every client-side route change. No auth.
router.post('/visits', trackVisit);

module.exports = router;
