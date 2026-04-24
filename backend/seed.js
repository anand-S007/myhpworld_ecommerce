/**
 * Seed script — creates the demo admin + user accounts and baseline catalog
 * so the React app has something to render the first time it boots.
 *
 *   node seed.js         (keeps any existing data, upserts where possible)
 *   node seed.js --fresh (wipes collections first, then inserts)
 *
 * Default demo credentials (printed at the end):
 *   Admin:  admin@myhpworld.com / Admin@123
 *   User:   user@myhpworld.com  / User@123
 */

require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('./config/db');

const Admin = require('./models/Admin');
const User = require('./models/User');
const Category = require('./models/Category');
const NavCategory = require('./models/NavCategory');
const Banner = require('./models/Banner');
const Offer = require('./models/Offer');
const Product = require('./models/Product');
const FeaturedProduct = require('./models/FeaturedProduct');
const Deal = require('./models/Deal');
const Store = require('./models/Store');

const FRESH = process.argv.includes('--fresh');

// ── Demo credentials ─────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'admin@myhpworld.com';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_NAME = 'Admin';

const USER_EMAIL = 'user@myhpworld.com';
const USER_PASSWORD = 'User@123';
const USER_NAME = 'Demo User';

// ── Baseline content ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { slug: 'laptops',     name: 'Laptops',     icon: 'Laptop',   subtitle: '120+ models',        order: 1 },
  { slug: 'desktops',    name: 'Desktops',    icon: 'Monitor',  subtitle: 'All-in-ones & towers', order: 2 },
  { slug: 'printers',    name: 'Printers',    icon: 'Printer',  subtitle: 'Inkjet, Laser, Tank',  order: 3 },
  { slug: 'gaming',      name: 'Gaming',      icon: 'Gamepad2', subtitle: 'OMEN & Victus',        order: 4, accent: true },
  { slug: 'accessories', name: 'Accessories', icon: 'Mouse',    subtitle: 'Mice, keyboards, bags', order: 5 },
  { slug: 'ink-toner',   name: 'Ink & Toner', icon: 'Droplets', subtitle: 'Genuine supplies',     order: 6 },
];

const NAV_CATEGORIES = [
  { label: 'Laptops',     to: '/shop/laptops',  dropdown: true,  order: 1 },
  { label: 'Desktops',    to: '/shop/desktops', dropdown: true,  order: 2 },
  { label: 'Printers',    to: '/shop/printers', dropdown: true,  order: 3 },
  { label: 'Monitors',    to: '/shop/monitors', order: 4 },
  { label: 'Gaming',      to: '/shop/gaming',   badge: 'HOT',    order: 5 },
  { label: 'Accessories', to: '/shop/accessories', order: 6 },
  { label: 'Ink & Toner', to: '/shop/ink-toner',   order: 7 },
];

const BANNERS = [
  {
    badge: { label: 'New Launch', pulse: true },
    title: 'HP Spectre x360 Reimagined.',
    titleHighlight: 'Reimagined.',
    titleHighlightClass: 'text-hp-blue',
    titleLine2: null,
    desc: 'Intel® Core™ Ultra 9 processors, OLED touch display, AI-accelerated performance — crafted for creators who refuse to compromise.',
    cta: { primary: 'Shop Spectre', primaryLink: '/shop/laptops', secondary: 'Watch film', secondaryLink: '#' },
    features: [
      { icon: 'Zap',     label: 'Up to 22hr battery' },
      { icon: 'Cpu',     label: 'Intel Core Ultra 9' },
      { icon: 'Monitor', label: '2.8K OLED' },
    ],
    visual: 'laptop', order: 1, active: true,
  },
  {
    badge: { label: 'Limited Time', red: true },
    title: 'Up to ₹30,000 OFF',
    titleHighlight: '₹30,000 OFF',
    titleHighlightClass: 'text-accent-amber',
    titleLine2: 'on OMEN Gaming Laptops',
    desc: 'RTX 40-series graphics, 240Hz displays, and OMEN Tempest cooling. Engineered to dominate.',
    cta: { primary: 'Shop OMEN', primaryLink: '/shop/gaming', secondary: 'Compare Models', secondaryLink: '/shop/gaming' },
    features: [],
    visual: 'omen', order: 2, active: true,
  },
  {
    badge: { label: 'Back to Campus' },
    title: 'Student Pricing',
    titleHighlight: null,
    titleHighlightClass: null,
    titleLine2: '+ Free Backpack 🎒',
    desc: 'Exclusive savings for students & teachers on HP Pavilion, Victus, and Envy. Verification in 60 seconds.',
    cta: { primary: 'Verify & Save', primaryLink: '/shop/laptops', secondary: null, secondaryLink: null },
    features: [],
    visual: 'student', order: 3, active: true,
  },
];

const OFFERS = [
  {
    tag: 'Bank Offer', title: '10% Instant Discount',
    desc: 'HDFC Bank credit & debit cards. Max ₹7,500 off.',
    cta: 'Shop now', link: '#', icon: 'CreditCard',
    bg: 'linear-gradient(135deg,#0096D6,#00205B)',
    textColor: 'text-white', tagStyle: 'opacity-80', iconColor: 'text-white/15',
    order: 1, active: true,
  },
  {
    tag: 'No-Cost EMI', title: 'Starting ₹2,999 / month',
    desc: 'On laptops, desktops & printers. Up to 24 months.',
    cta: 'Check eligibility', link: '#', icon: 'CalendarClock',
    bg: 'linear-gradient(135deg,#FCE7C8,#F59E0B)',
    textColor: 'text-hp-ink', tagStyle: 'opacity-80', iconColor: 'text-hp-ink/15',
    order: 2, active: true,
  },
  {
    tag: 'Exchange Bonanza', title: 'Up to ₹15,000 off on exchange',
    desc: 'Trade any working laptop. Doorstep pickup.',
    cta: 'Get a quote', link: '#', icon: 'Repeat',
    bg: 'linear-gradient(135deg,#0B1221,#1a2a44)',
    textColor: 'text-white', tagStyle: 'text-accent-amber', iconColor: 'text-white/15',
    order: 3, active: true,
  },
];

const PRODUCTS = [
  {
    name: 'HP Pavilion 15 · Core i5 · 16GB · 512GB', series: 'HP Pavilion',
    category: 'laptops', price: 62990, mrp: 79990, rating: 4.7, reviews: 1204,
    badge: 'BESTSELLER', stock: 24,
    tint: 'from-slate-50 to-slate-100', icon: 'Laptop',
    description: 'A dependable daily driver with long battery life, a 15.6" FHD display, and 16GB of RAM for multitasking.',
    specs: { Display: '15.6" FHD IPS', Processor: 'Intel Core i5-1335U', RAM: '16GB DDR4', Storage: '512GB NVMe SSD' },
  },
  {
    name: 'OMEN Transcend 14 · Ultra 9 · RTX 4070', series: 'OMEN by HP',
    category: 'gaming', price: 189990, mrp: 214990, rating: 4.8, reviews: 412,
    badge: 'NEW', stock: 9,
    tint: 'from-[#fff2f2] to-[#ffe0e0]', icon: 'Gamepad2',
    description: 'Flagship 14" gaming laptop with OLED display, OMEN Tempest cooling, and RTX 4070 graphics.',
    specs: { Display: '14" 2.8K OLED 120Hz', Processor: 'Intel Core Ultra 9', GPU: 'NVIDIA RTX 4070', RAM: '32GB' },
  },
  {
    name: 'HP Smart Tank 580 · All-in-One · WiFi', series: 'HP Smart Tank',
    category: 'printers', price: 14499, mrp: 17999, rating: 4.5, reviews: 3067, stock: 58,
    tint: 'from-[#ebf7ff] to-[#d3ecff]', icon: 'Printer',
    description: 'Ultra-low cost per page ink tank printer with wireless printing and scanning.',
    specs: { Type: 'Ink Tank All-in-One', Connectivity: 'WiFi, USB', 'Print speed': '12 ppm (Black)' },
  },
  {
    name: '27" QHD IPS Monitor · 100Hz · USB-C', series: 'HP Series 7 Pro',
    category: 'monitors', price: 22990, mrp: 29499, rating: 4.6, reviews: 820,
    badge: 'SAVE 22%', stock: 41,
    tint: 'from-[#f4f0ff] to-[#e6dcff]', icon: 'Monitor',
    description: 'Professional 27" QHD monitor with USB-C power delivery and 100Hz refresh rate.',
    specs: { Size: '27"', Resolution: '2560x1440 QHD', Panel: 'IPS', Ports: 'USB-C 65W, HDMI, DP' },
  },
  {
    name: 'HP Pavilion 14 · Core i7 · 16GB · 512GB', series: 'HP Pavilion 14',
    category: 'laptops', price: 74990, mrp: 103990, rating: 4.6, reviews: 2410, stock: 15,
    tint: 'from-slate-50 to-slate-100', icon: 'Laptop',
    description: 'Silver finish, MS Office 2024 Home & Student, 1-year onsite warranty, free HP Gaming Mouse.',
    specs: { Display: '14" FHD IPS', Processor: 'Intel Core i7-1355U', RAM: '16GB', Storage: '512GB SSD' },
  },
];

const STORES = [
  { name: 'HP World Koramangala', address: '80ft Road, Koramangala 4th Block',
    city: 'Bengaluru', state: 'Karnataka', pincode: '560034',
    phone: '+91 80 1234 5678', email: 'blr.kora@myhpworld.com',
    hours: '10:00 AM – 9:00 PM', services: ['Service Center', 'Student Store', 'Trade-In'] },
  { name: 'HP World MG Road', address: 'Brigade Road Junction',
    city: 'Bengaluru', state: 'Karnataka', pincode: '560001',
    phone: '+91 80 2345 6789', email: 'blr.mg@myhpworld.com',
    hours: '11:00 AM – 9:00 PM', services: ['Service Center', 'EMI'] },
  { name: 'HP World Connaught Place', address: 'Block N, Connaught Place',
    city: 'New Delhi', state: 'Delhi', pincode: '110001',
    phone: '+91 11 3456 7890', email: 'del.cp@myhpworld.com',
    hours: '10:00 AM – 9:00 PM', services: ['Service Center', 'Student Store'] },
  { name: 'HP World Bandra', address: 'Linking Road, Bandra West',
    city: 'Mumbai', state: 'Maharashtra', pincode: '400050',
    phone: '+91 22 4567 8901', email: 'mum.bandra@myhpworld.com',
    hours: '10:30 AM – 9:30 PM', services: ['Service Center', 'EMI', 'Trade-In'] },
  { name: 'HP World T Nagar', address: 'Usman Road, T Nagar',
    city: 'Chennai', state: 'Tamil Nadu', pincode: '600017',
    phone: '+91 44 5678 9012', email: 'chn.tnagar@myhpworld.com',
    hours: '10:00 AM – 9:00 PM', services: ['Service Center'] },
];

// ── Seed runner ──────────────────────────────────────────────────────────────
async function seed() {
  await connectDB();

  if (FRESH) {
    console.log('--fresh: wiping existing collections…');
    await Promise.all([
      Admin.deleteMany({}), User.deleteMany({}),
      Category.deleteMany({}), NavCategory.deleteMany({}),
      Banner.deleteMany({}), Offer.deleteMany({}),
      Product.deleteMany({}), FeaturedProduct.deleteMany({}),
      Deal.deleteMany({}), Store.deleteMany({}),
    ]);
  }

  // Admin
  let admin = await Admin.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    admin = await Admin.create({
      name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'superadmin',
    });
    console.log(`✓ Admin created: ${ADMIN_EMAIL}`);
  } else {
    console.log(`• Admin already exists: ${ADMIN_EMAIL} (password unchanged)`);
  }

  // Demo user
  let user = await User.findOne({ email: USER_EMAIL });
  if (!user) {
    user = await User.create({
      name: USER_NAME, email: USER_EMAIL, phone: '+91 90000 00000', password: USER_PASSWORD,
    });
    console.log(`✓ User created:  ${USER_EMAIL}`);
  } else {
    console.log(`• User already exists:  ${USER_EMAIL} (password unchanged)`);
  }

  // Categories / nav / banners / offers (upsert by a natural key)
  for (const c of CATEGORIES) {
    await Category.updateOne({ slug: c.slug }, { $setOnInsert: c }, { upsert: true });
  }
  for (const n of NAV_CATEGORIES) {
    await NavCategory.updateOne({ label: n.label }, { $setOnInsert: n }, { upsert: true });
  }
  if ((await Banner.countDocuments()) === 0) await Banner.insertMany(BANNERS);
  if ((await Offer.countDocuments())  === 0) await Offer.insertMany(OFFERS);

  // Products — insert only if the collection is empty (avoid duplicates on re-run)
  if ((await Product.countDocuments()) === 0) {
    const inserted = await Product.insertMany(PRODUCTS);
    console.log(`✓ Inserted ${inserted.length} products`);

    // Featured = first 4
    await FeaturedProduct.insertMany(
      inserted.slice(0, 4).map((p, i) => ({ product: p._id, order: i }))
    );

    // Deal of the day = HP Pavilion 14
    const deal = inserted.find((p) => p.name.includes('Pavilion 14')) || inserted[0];
    await Deal.create({
      product: deal._id,
      series: deal.series, name: deal.name,
      price: deal.price, mrp: deal.mrp,
      savings: deal.mrp - deal.price,
      rating: deal.rating, reviews: deal.reviews,
      discount: Math.round(((deal.mrp - deal.price) / deal.mrp) * 100),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      perks: 'Silver finish · MS Office 2024 Home & Student · 1-year onsite warranty · Free HP Gaming Mouse.',
      deliveryText: '🚚 Delivery by tomorrow · 🎁 Free gift worth ₹1,499',
      active: true,
    });
    console.log('✓ Seeded featured products + deal of the day');
  } else {
    console.log(`• Products already exist (${await Product.countDocuments()}) — skipped`);
  }

  // Stores
  for (const s of STORES) {
    await Store.updateOne({ name: s.name }, { $setOnInsert: s }, { upsert: true });
  }

  console.log('\n──────────────────────────────────────────────');
  console.log('  Seed complete. Login credentials:');
  console.log('──────────────────────────────────────────────');
  console.log(`  Admin:  ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  User:   ${USER_EMAIL} / ${USER_PASSWORD}`);
  console.log('──────────────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
