import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Tag, Image, Gift, Package, Star, Percent,
  Flame, ShoppingCart, MapPin, Users, LogOut, Menu, X, ChevronRight, Store,
  Palette,
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore.js';
import Logo from '../common/Logo.jsx';

// Sidebar navigation items — each maps to an admin section
const NAV_ITEMS = [
  { to: '/admin',            label: 'Dashboard',        icon: LayoutDashboard, end: true },
  { to: '/admin/categories', label: 'Categories',       icon: Tag },
  { to: '/admin/banners',    label: 'Banners',          icon: Image },
  { to: '/admin/offers',     label: 'Offers',           icon: Gift },
  { to: '/admin/products',   label: 'Products',         icon: Package },
  { to: '/admin/featured',   label: 'Featured Products',icon: Star },
  { to: '/admin/deal',       label: 'Deal of the Day',  icon: Flame },
  { to: '/admin/promotions', label: 'Promotions',       icon: Percent },
  { to: '/admin/orders',     label: 'Orders',           icon: ShoppingCart },
  { to: '/admin/stores',     label: 'Stores',           icon: MapPin },
  { to: '/admin/users',      label: 'Users',            icon: Users },
  { to: '/admin/branding',   label: 'Branding',         icon: Palette },
];

// Small fallback shown inside <main> while the next admin chunk streams in.
// Scoped to the content area so sidebar + header stay painted — a full-screen
// fallback would blank the entire admin UI on every route change.
function AdminPageFallback() {
  return (
    <div className="min-h-[60vh] grid place-items-center text-slate-400 text-sm">
      Loading…
    </div>
  );
}

// AdminLayout — shared chrome for every admin route. Used as a *route layout*
// (not as a per-page wrapper), so the sidebar and header stay mounted across
// admin navigations. Only the content inside <main> swaps via <Outlet />.
export default function AdminLayout() {
  const admin = useAdminStore((s) => s.admin);
  const adminLogout = useAdminStore((s) => s.adminLogout);
  const navigate = useNavigate();
  // `key={pathname}` on <main> forces the content to re-mount on every admin
  // route change, which replays the `.page-fade` animation and makes the
  // transition feel intentional.
  const { pathname } = useLocation();

  // Controls whether the sidebar is visible on small screens
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Log the admin out and return to the unified sign-in page
  const handleLogout = () => {
    adminLogout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">

      {/* ── Mobile overlay: dims the page when sidebar is open ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-hp-navy flex flex-col z-40
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        `}
      >
        {/* Sidebar header: branding from admin settings */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <Logo
            to="/admin"
            variant="dark"
            size="sm"
            nameOverride="HP World Admin"
            subtitle="Control Panel"
          />
          {/* Close button — visible only on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-white/60 hover:text-white lg:hidden shrink-0"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links — each highlights when its route is active */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}  // close sidebar on mobile after navigation
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-hp-blue text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-30" />
            </NavLink>
          ))}
        </nav>

        {/* Admin info + logout — pinned to the bottom of the sidebar */}
        <div className="px-5 py-4 border-t border-white/10">
          <div className="mb-3">
            <div className="text-sm font-semibold text-white truncate">
              {admin?.name || 'Admin'}
            </div>
            <div className="text-xs text-white/50 truncate">{admin?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content area (offset by sidebar width on desktop) ── */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">

        {/* Top header bar — stays mounted across admin navigations */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-3 sm:px-4 lg:px-6 h-14 flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-600 hover:text-hp-blue shrink-0 p-1 -ml-1"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <span className="font-display font-semibold text-hp-ink truncate">Admin Panel</span>

          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-600 hover:border-hp-blue hover:text-hp-blue transition-colors shrink-0"
            title="Open the customer storefront"
            aria-label="View storefront"
          >
            <Store className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View Storefront</span>
          </Link>

          <span className="text-sm text-slate-400 hidden lg:block shrink-0">
            {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}
          </span>
        </header>

        {/* Page content — swaps on route change while sidebar/header stay put.
            `key={pathname}` replays the fade animation on every navigation.
            <Suspense> is scoped here so lazy chunks don't blank the chrome. */}
        <main key={pathname} className="page-fade flex-1 p-3 sm:p-4 lg:p-6">
          <Suspense fallback={<AdminPageFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
