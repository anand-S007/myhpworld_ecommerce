import axios from 'axios';

// ─── Customer-facing API ─────────────────────────────────────────────────────

// Shared Axios instance for all customer-facing requests
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach customer JWT token to every request if the user is logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('myhpworld_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Homepage content (controlled from admin panel) ───────────────────────────
export const fetchCategories      = () => api.get('/categories').then((r) => r.data);
export const fetchBanners         = () => api.get('/banners').then((r) => r.data);
export const fetchOffers          = () => api.get('/offers').then((r) => r.data);
export const fetchDealOfTheDay    = () => api.get('/deal-of-the-day').then((r) => r.data);
export const fetchFeaturedProducts= () => api.get('/featured-products').then((r) => r.data);
export const fetchNavCategories   = () => api.get('/nav-categories').then((r) => r.data);
export const fetchSettings        = () => api.get('/settings').then((r) => r.data);

// ── Products ─────────────────────────────────────────────────────────────────
// params can include: category, sort, page, limit, search
export const fetchProducts    = (params = {}) => api.get('/products', { params }).then((r) => r.data);
export const fetchProductById = (id) => api.get(`/products/${id}`).then((r) => r.data);

// ── Product reviews ──────────────────────────────────────────────────────────
// Listing is public; submit/delete require a logged-in customer (JWT is
// attached automatically by the request interceptor above).
export const fetchProductReviews  = (productId) =>
  api.get(`/products/${productId}/reviews`).then((r) => r.data);
export const submitProductReview  = (productId, data) =>
  api.post(`/products/${productId}/reviews`, data).then((r) => r.data);
export const deleteProductReview  = (productId, reviewId) =>
  api.delete(`/products/${productId}/reviews/${reviewId}`).then((r) => r.data);

// ── Stores ───────────────────────────────────────────────────────────────────
export const fetchStores            = (params = {}) => api.get('/stores', { params }).then((r) => r.data);
export const searchStoresByPincode  = (pincode) =>
  api.get('/stores/search', { params: { pincode } }).then((r) => r.data);
// Detail page — returns { store, related } for a single store slug.
export const fetchStoreBySlug       = (slug) =>
  api.get(`/stores/slug/${encodeURIComponent(slug)}`).then((r) => r.data);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const register = (data) => api.post('/users/register', data).then((r) => r.data);
export const login    = (data) => api.post('/users/login', data).then((r) => r.data);

// Unified login — checks staff accounts first, then customer accounts.
// Response: { account, token, role, kind: 'admin' | 'user' }
export const unifiedLogin = (data) => api.post('/auth/login', data).then((r) => r.data);

// ── OTP & password reset ────────────────────────────────────────────────────
// sendOtp  → request a code over phone or email.
//   body: { channel: 'phone'|'email', identifier, purpose: 'signup'|'forgot-password' }
// verifyOtp → exchange the code for a short-lived verification token.
//   body: { channel, identifier, purpose, code }
// resetPassword → set a new password using that verification token.
//   body: { email, newPassword, resetToken }
export const sendOtp       = (data) => api.post('/auth/otp/send',       data).then((r) => r.data);
export const verifyOtp     = (data) => api.post('/auth/otp/verify',     data).then((r) => r.data);
export const resetPassword = (data) => api.post('/auth/password/reset', data).then((r) => r.data);

// ── Orders ───────────────────────────────────────────────────────────────────
export const createOrder   = (data) => api.post('/orders', data).then((r) => r.data);
export const fetchMyOrders = () => api.get('/orders/me').then((r) => r.data);

// ── Wishlist ─────────────────────────────────────────────────────────────────
// Server returns { items: Product[], ids: ObjectId[] }. Every write also
// returns the new list so the frontend doesn't need a second fetch.
export const fetchWishlist       = ()          => api.get   ('/users/me/wishlist').then((r) => r.data);
export const addToWishlist       = (productId) => api.post  (`/users/me/wishlist/${productId}`).then((r) => r.data);
export const removeFromWishlist  = (productId) => api.delete(`/users/me/wishlist/${productId}`).then((r) => r.data);

// ── Newsletter ───────────────────────────────────────────────────────────────
export const subscribeNewsletter = (email) =>
  api.post('/newsletter', { email }).then((r) => r.data);

// ── Analytics ────────────────────────────────────────────────────────────────
// Fire-and-forget visit logger. Uses the shared `api` axios instance (no
// admin JWT needed). Swallows errors so a tracking blip can't break the
// page — analytics failure must never be user-visible.
export const trackVisit = (payload) =>
  api.post('/visits', payload).then((r) => r.data).catch(() => null);

export default api;

// ─── Admin API ───────────────────────────────────────────────────────────────

// Separate Axios instance for admin endpoints - uses a different JWT token
// stored as 'hpworld_admin_token' to keep admin sessions separate from customers
const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach admin JWT to every admin request
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('hpworld_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Admin Authentication ─────────────────────────────────────────────────────
// Returns { admin, token } on success
export const adminLogin = (data) => adminApi.post('/admin/login', data).then((r) => r.data);

// ── Admin Image Upload ──────────────────────────────────────────────────────
// Sends a file as multipart/form-data and gets back { url, filename, ... }.
// The returned url is relative (e.g. "/uploads/foo.png") — the Vite dev
// proxy passes /uploads through to the backend just like /api, and in
// production the same origin serves both, so this path works in both envs.
export const adminUploadImage = (file) => {
  const form = new FormData();
  form.append('image', file);
  return adminApi
    .post('/admin/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);
};

// ── Dashboard Stats ──────────────────────────────────────────────────────────
// Returns { stats: { products, orders, users, revenue }, recentOrders: [] }
export const adminGetStats = () => adminApi.get('/admin/stats').then((r) => r.data);

// ── Categories CRUD ──────────────────────────────────────────────────────────
// Categories appear in the navbar, homepage grid, and product filter
export const adminGetCategories    = ()        => adminApi.get('/admin/categories').then((r) => r.data);
export const adminCreateCategory   = (data)    => adminApi.post('/admin/categories', data).then((r) => r.data);
export const adminUpdateCategory   = (id, data)=> adminApi.put(`/admin/categories/${id}`, data).then((r) => r.data);
export const adminDeleteCategory   = (id)      => adminApi.delete(`/admin/categories/${id}`).then((r) => r.data);

// ── Banners CRUD ─────────────────────────────────────────────────────────────
// Banners are the rotating hero carousel slides on the homepage
export const adminGetBanners    = ()        => adminApi.get('/admin/banners').then((r) => r.data);
export const adminCreateBanner  = (data)    => adminApi.post('/admin/banners', data).then((r) => r.data);
export const adminUpdateBanner  = (id, data)=> adminApi.put(`/admin/banners/${id}`, data).then((r) => r.data);
export const adminDeleteBanner  = (id)      => adminApi.delete(`/admin/banners/${id}`).then((r) => r.data);

// ── Offers CRUD ──────────────────────────────────────────────────────────────
// Offers are the 3-column promo cards below the hero (bank offers, EMI, exchange)
export const adminGetOffers    = ()        => adminApi.get('/admin/offers').then((r) => r.data);
export const adminCreateOffer  = (data)    => adminApi.post('/admin/offers', data).then((r) => r.data);
export const adminUpdateOffer  = (id, data)=> adminApi.put(`/admin/offers/${id}`, data).then((r) => r.data);
export const adminDeleteOffer  = (id)      => adminApi.delete(`/admin/offers/${id}`).then((r) => r.data);

// ── Products CRUD ────────────────────────────────────────────────────────────
// Full product catalog management
export const adminGetProducts    = (params = {}) => adminApi.get('/admin/products', { params }).then((r) => r.data);
export const adminCreateProduct  = (data)        => adminApi.post('/admin/products', data).then((r) => r.data);
export const adminUpdateProduct  = (id, data)    => adminApi.put(`/admin/products/${id}`, data).then((r) => r.data);
export const adminDeleteProduct  = (id)          => adminApi.delete(`/admin/products/${id}`).then((r) => r.data);
export const adminBulkCreateProducts = (products)=> adminApi.post('/admin/products/bulk', { products }).then((r) => r.data);

// ── Featured Products ────────────────────────────────────────────────────────
// The 4 products shown in the homepage featured grid
export const adminGetFeatured = ()     => adminApi.get('/admin/featured-products').then((r) => r.data);
export const adminSetFeatured = (data) => adminApi.put('/admin/featured-products', data).then((r) => r.data);

// ── Deals of the Day (multiple) ──────────────────────────────────────────────
// Admins can create any number of deals. Each has its own visibility toggle
// and a 24-hour end-date cap. Expired deals auto-hide from the storefront.
export const adminGetDeals    = ()          => adminApi.get('/admin/deals').then((r) => r.data);
export const adminCreateDeal  = (data)      => adminApi.post('/admin/deals', data).then((r) => r.data);
export const adminUpdateDeal  = (id, data)  => adminApi.put(`/admin/deals/${id}`, data).then((r) => r.data);
export const adminDeleteDeal  = (id)        => adminApi.delete(`/admin/deals/${id}`).then((r) => r.data);

// ── Orders ───────────────────────────────────────────────────────────────────
// Admin can view all orders and update their status (pending → shipped → delivered)
export const adminGetOrders   = (params = {}) => adminApi.get('/admin/orders', { params }).then((r) => r.data);
export const adminUpdateOrder = (id, data)    => adminApi.put(`/admin/orders/${id}`, data).then((r) => r.data);

// ── Stores CRUD ──────────────────────────────────────────────────────────────
// Physical store locations shown on the Store Locator page
export const adminGetStores    = ()        => adminApi.get('/admin/stores').then((r) => r.data);
export const adminCreateStore  = (data)    => adminApi.post('/admin/stores', data).then((r) => r.data);
export const adminUpdateStore  = (id, data)=> adminApi.put(`/admin/stores/${id}`, data).then((r) => r.data);
export const adminDeleteStore  = (id)      => adminApi.delete(`/admin/stores/${id}`).then((r) => r.data);

// ── Users ────────────────────────────────────────────────────────────────────
// Admin can view and search all registered users, and super-admin can edit
// each user's role label.
export const adminGetUsers      = (params = {}) => adminApi.get('/admin/users', { params }).then((r) => r.data);
export const adminSetUserRole   = (id, role)    =>
  adminApi.put(`/admin/users/${id}/role`, { role }).then((r) => r.data);
export const adminSetUserBlocked = (id, blocked) =>
  adminApi.put(`/admin/users/${id}/block`, { blocked }).then((r) => r.data);

// ── Promotions ───────────────────────────────────────────────────────────────
// Percentage discounts that apply to the whole catalogue, a category or a
// list of specific products. Applied server-side at product read time, so
// toggling `active` instantly changes storefront pricing.
export const adminGetPromotions    = ()        => adminApi.get('/admin/promotions').then((r) => r.data);
export const adminCreatePromotion  = (data)    => adminApi.post('/admin/promotions', data).then((r) => r.data);
export const adminUpdatePromotion  = (id, data)=> adminApi.put(`/admin/promotions/${id}`, data).then((r) => r.data);
export const adminDeletePromotion  = (id)      => adminApi.delete(`/admin/promotions/${id}`).then((r) => r.data);

// ── Branding / site settings ────────────────────────────────────────────────
// Single-document collection holding the logo URL, brand name, and tagline.
// Everywhere the Navbar / Footer / AdminLayout renders a logo, it reads from
// here via the public `fetchSettings` endpoint.
export const adminGetSettings    = ()     => adminApi.get('/admin/settings').then((r) => r.data);
export const adminUpdateSettings = (data) => adminApi.put('/admin/settings', data).then((r) => r.data);

// ── Admin analytics ──────────────────────────────────────────────────────────
// Visitor counts with 1h / 1d / 1m / 1y range filter.
export const adminGetVisitStats = (range = '1d') =>
  adminApi.get('/admin/analytics/visits', { params: { range } }).then((r) => r.data);
