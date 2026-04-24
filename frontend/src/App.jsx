import { lazy, Suspense } from 'react';
import { Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';

// ── Layout (eager) ───────────────────────────────────────────────────────────
// Layout pieces render on every customer route so lazy-loading them would only
// add a round-trip and cause a flash of empty chrome on first paint.
import AnnouncementBar from './components/layout/AnnouncementBar.jsx';
import Navbar          from './components/layout/Navbar.jsx';
import Footer          from './components/layout/Footer.jsx';
import ScrollToTop     from './components/layout/ScrollToTop.jsx';
import FaviconManager  from './components/layout/FaviconManager.jsx';
import VisitTracker    from './components/layout/VisitTracker.jsx';
import AdminRoute      from './components/admin/AdminRoute.jsx';
import AdminLayout     from './components/admin/AdminLayout.jsx';

// ── Customer-facing pages (lazy — one chunk per route) ───────────────────────
const Home           = lazy(() => import('./pages/Home.jsx'));
const ProductListing = lazy(() => import('./pages/ProductListing.jsx'));
const ProductDetail  = lazy(() => import('./pages/ProductDetail.jsx'));
const StoreLocator   = lazy(() => import('./pages/StoreLocator.jsx'));
const StoreDetail    = lazy(() => import('./pages/StoreDetail.jsx'));
const Login          = lazy(() => import('./pages/Login.jsx'));
const Register       = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const Account        = lazy(() => import('./pages/Account.jsx'));
const Wishlist       = lazy(() => import('./pages/Wishlist.jsx'));
const NotFound       = lazy(() => import('./pages/NotFound.jsx'));

// ── Admin pages (lazy — keeps admin-only UI out of the storefront bundle) ────
const AdminDashboard  = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories.jsx'));
const AdminBanners    = lazy(() => import('./pages/admin/AdminBanners.jsx'));
const AdminOffers     = lazy(() => import('./pages/admin/AdminOffers.jsx'));
const AdminProducts   = lazy(() => import('./pages/admin/AdminProducts.jsx'));
const AdminFeatured   = lazy(() => import('./pages/admin/AdminFeatured.jsx'));
const AdminDeal       = lazy(() => import('./pages/admin/AdminDeal.jsx'));
const AdminOrders     = lazy(() => import('./pages/admin/AdminOrders.jsx'));
const AdminStores     = lazy(() => import('./pages/admin/AdminStores.jsx'));
const AdminUsers      = lazy(() => import('./pages/admin/AdminUsers.jsx'));
const AdminPromotions = lazy(() => import('./pages/admin/AdminPromotions.jsx'));
const AdminBranding   = lazy(() => import('./pages/admin/AdminBranding.jsx'));

// Customer-side fallback: scoped to <main>, so the Navbar/Footer stay visible
// while a page chunk streams in — avoids a full-screen flash on route change.
function PageFallback() {
  return (
    <div className="min-h-[60vh] grid place-items-center text-slate-400 text-sm">
      Loading…
    </div>
  );
}

// ClientLayout — shared chrome for every customer route. The inner <Suspense>
// keeps Navbar/Footer painted while the next page chunk downloads.
//
// `key={pathname}` forces <main> to re-mount on every route change, which
// replays the `.page-fade` animation and makes the transition feel
// intentional instead of a harsh instant swap.
function ClientLayout() {
  const { pathname } = useLocation();
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main key={pathname} className="page-fade">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <>
      {/* Resets window scroll on every route change so new pages start at
          the top instead of inheriting the scroll offset of the previous one. */}
      <ScrollToTop />
      {/* Keeps the browser tab favicon in sync with admin branding. */}
      <FaviconManager />
      {/* Logs every customer-side route change for the admin dashboard. */}
      <VisitTracker />
      <Routes>
        {/* ── Admin routes ─────────────────────────────────────────────────
            Grouped under a single layout route so the sidebar + header stay
            mounted across admin navigations. The Suspense boundary lives
            inside <AdminLayout> and is scoped to <main>, so lazy chunks
            don't blank the chrome on every click. */}
        {/* Legacy alias — all roles now sign in via the unified /login page */}
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route path="/admin"            element={<AdminDashboard />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/banners"    element={<AdminBanners />} />
          <Route path="/admin/offers"     element={<AdminOffers />} />
          <Route path="/admin/featured"   element={<AdminFeatured />} />
          <Route path="/admin/deal"       element={<AdminDeal />} />
          <Route path="/admin/products"   element={<AdminProducts />} />
          <Route path="/admin/orders"     element={<AdminOrders />} />
          <Route path="/admin/stores"     element={<AdminStores />} />
          <Route path="/admin/users"      element={<AdminUsers />} />
          <Route path="/admin/promotions" element={<AdminPromotions />} />
          <Route path="/admin/branding"   element={<AdminBranding />} />
        </Route>

        {/* ── Customer routes ─────────────────────────────────────────────── */}
        <Route element={<ClientLayout />}>
          <Route path="/"                 element={<Home />} />
          <Route path="/shop"             element={<ProductListing />} />
          <Route path="/shop/:category"   element={<ProductListing />} />
          <Route path="/product/:id"      element={<ProductDetail />} />
          <Route path="/stores"           element={<StoreLocator />} />
          <Route path="/stores/:slug"     element={<StoreDetail />} />
          <Route path="/login"            element={<Login />} />
          <Route path="/register"         element={<Register />} />
          <Route path="/forgot-password"  element={<ForgotPassword />} />
          <Route path="/account"          element={<Account />} />
          <Route path="/wishlist"         element={<Wishlist />} />
          <Route path="*"                 element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
