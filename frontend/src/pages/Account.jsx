import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Package, User, LogOut, Heart, MapPin, LayoutDashboard } from 'lucide-react';
import { useMyOrders } from '../hooks/queries.js';
import { useAdminStore } from '../store/adminStore.js';
import { useUserStore } from '../store/userStore.js';

// Staff roles that should see the "Open admin panel" shortcut on this page.
const STAFF_ROLES = new Set(['admin', 'superadmin', 'coordinator']);

export default function Account() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  // Both stores feed this page. A staff user whose User record also has a
  // role can be in both — in which case the customer session wins for the
  // orders view. A pure Admin-collection account only populates adminStore.
  const user        = useUserStore((s) => s.user);
  const admin       = useAdminStore((s) => s.admin);
  const userLogout  = useUserStore((s) => s.logout);
  const adminLogout = useAdminStore((s) => s.adminLogout);

  // "Active profile" — whichever session we have. Customer wins when both
  // exist because it carries more metadata (addresses, wishlist, etc.).
  const profile = user || admin;
  const isAdminOnly = !user && !!admin;
  const role = String((admin?.role) || (user?.role) || 'customer').toLowerCase();
  const isStaff = STAFF_ROLES.has(role);

  // Bounce to /login if neither a customer nor an admin session is live.
  // `replace: true` is critical here — without it, pressing Back returns
  // to /account, the effect fires again, and the user gets shoved forward,
  // making the Back button appear broken.
  useEffect(() => {
    if (!profile) navigate('/login', { replace: true });
  }, [profile, navigate]);

  // Customer-only data — admin-collection accounts can't fetch /me/orders.
  const { data: ordersData } = useMyOrders(!!user);
  const orders = Array.isArray(ordersData) ? ordersData : (ordersData?.orders || []);

  const logout = () => {
    userLogout();
    adminLogout();
    qc.clear();
    navigate('/');
  };

  if (!profile) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-14 grid lg:grid-cols-4 gap-8">
      <aside className="lg:col-span-1">
        <div className="bg-white border border-slate-100 rounded-2xl p-6">
          <div className="w-16 h-16 rounded-full bg-hp-blue text-white grid place-items-center font-display font-bold text-2xl">
            {profile.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="font-semibold mt-3 break-words">{profile.name}</div>
          <div className="text-xs text-slate-500 break-all">{profile.email}</div>
          {isStaff && (
            <span className="inline-block mt-2 text-[10px] uppercase tracking-widest bg-hp-blue/10 text-hp-blue px-2 py-0.5 rounded font-semibold">
              {role}
            </span>
          )}
        </div>
        <nav className="mt-4 space-y-1">
          {/* Staff get a shortcut to the admin panel from here — the
              Account nav is otherwise shared with customers so staff who
              also shop see the same tools. */}
          {isStaff && (
            <Link
              to="/admin"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-hp-blue/5 hover:bg-hp-blue/10 text-sm text-hp-blue font-semibold"
            >
              <LayoutDashboard className="w-4 h-4" /> Open admin panel
            </Link>
          )}
          <Link
            to="/wishlist"
            className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-sm"
          >
            <Heart className="w-4 h-4 text-hp-blue" /> Wishlist
          </Link>
          {[
            { icon: Package, label: 'Orders' },
            { icon: MapPin, label: 'Addresses' },
            { icon: User, label: 'Profile' },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              disabled
              aria-disabled="true"
              title="Coming soon"
              className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-400 cursor-not-allowed"
            >
              <Icon className="w-4 h-4 text-slate-300" /> {label}
              <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-400">Soon</span>
            </button>
          ))}
          <button
            onClick={logout}
            className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-sm text-accent-red"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </nav>
      </aside>

      <section className="lg:col-span-3">
        <h1 className="font-display text-3xl font-bold text-hp-ink">Your orders</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isAdminOnly
            ? 'Admin-only accounts don\'t place orders. Sign in with a customer account to see order history.'
            : 'Track, return, or reorder any item.'}
        </p>

        <div className="mt-6 space-y-4">
          {isAdminOnly ? (
            <div className="bg-slate-50 rounded-2xl p-10 text-center">
              <LayoutDashboard className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="font-semibold mt-3">You're signed in as {role}</div>
              <div className="text-sm text-slate-500 mt-1">
                Manage products, orders, users and content from the admin panel.
              </div>
              <Link
                to="/admin"
                className="btn-primary mt-5 inline-block px-5 py-2.5 rounded-full text-sm"
              >
                Open admin panel
              </Link>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl p-10 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="font-semibold mt-3">No orders yet</div>
              <div className="text-sm text-slate-500 mt-1">
                When you place an order, it will show up here.
              </div>
              <Link
                to="/shop"
                className="btn-primary mt-5 inline-block px-5 py-2.5 rounded-full text-sm"
              >
                Start shopping
              </Link>
            </div>
          ) : (
            orders.map((o, i) => (
              <div
                key={o._id || i}
                className="bg-white border border-slate-100 rounded-2xl p-5 flex justify-between items-center"
              >
                <div>
                  <div className="text-xs text-slate-400">Order #{o._id || 'DEMO123'}</div>
                  <div className="font-semibold mt-0.5">
                    {(o.items || []).length} items · ₹{(o.total || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Status: <span className="text-accent-mint font-medium">{o.status || 'Confirmed'}</span>
                  </div>
                </div>
                <button className="text-sm text-hp-blue font-semibold">View</button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
