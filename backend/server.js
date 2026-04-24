require('dotenv').config();
require('express-async-errors');

const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes       = require('./routes/authRoutes');
const userRoutes       = require('./routes/userRoutes');
const homeRoutes       = require('./routes/homeRoutes');
const productRoutes    = require('./routes/productRoutes');
const storeRoutes      = require('./routes/storeRoutes');
const orderRoutes      = require('./routes/orderRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const adminRoutes      = require('./routes/adminRoutes');
const analyticsRoutes  = require('./routes/analyticsRoutes');

connectDB();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/', (req, res) => res.json({ ok: true, service: 'myhpworld-backend' }));
app.get('/api/health', (req, res) => res.json({ status: 'up' }));

// Serve files uploaded via the admin panel (banner images, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Unified login (customers + staff) — role drives post-login redirect on the client
app.use('/api/auth', authRoutes);

// Public customer routes
app.use('/api/users', userRoutes);
app.use('/api', homeRoutes); // categories, banners, offers, featured, deal, nav-categories
app.use('/api/products', productRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api',            analyticsRoutes);  // POST /api/visits

// Admin routes
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
