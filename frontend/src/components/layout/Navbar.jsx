import { Link, NavLink } from 'react-router-dom';
import { User, Heart, ChevronDown, LayoutDashboard } from 'lucide-react';
import { CATEGORIES } from '../../data/mockData.js';
import { useCategories } from '../../hooks/queries.js';
import { useAdminStore } from '../../store/adminStore.js';
import { useUserStore } from '../../store/userStore.js';
import SearchBox from './SearchBox.jsx';
import Logo from '../common/Logo.jsx';

// Staff roles that are allowed to see the "Admin Panel" switcher. Any other
// value on the admin object means the stored session is not actually a
// staff account and the pill must stay hidden.
const STAFF_ROLES = new Set(['admin', 'superadmin', 'coordinator']);

export default function Navbar() {
  // Navbar entries are driven by the admin-managed Category collection so
  // any category an admin adds, renames, or reorders appears here without a
  // separate NavCategory table. We still fall back to the bundled mock list
  // if the fetch hasn't landed yet.
  //
  // The whole category object flows through so <CategoryNavItem> can
  // render a subcategory dropdown when available.
  const { data: categories } = useCategories();
  const navItems =
    Array.isArray(categories) && categories.length
      ? categories.map((c) => ({
          category: c,
          label: c.name,
          to: `/shop/${c.slug}`,
          // Flag "gaming" with a HOT badge the way the old mock list did —
          // purely cosmetic, preserved so the visual doesn't regress.
          badge: c.accent ? 'HOT' : undefined,
        }))
      : CATEGORIES.map((c) => ({
          category: { ...c, subcategories: [] },
          label: c.name,
          to: `/shop/${c.slug}`,
        }));

  // Subscribe to both session stores so the moment login/logout fires
  // anywhere in the app, this Navbar re-renders with the right state.
  const admin    = useAdminStore((s) => s.admin);
  const customer = useUserStore((s) => s.user);

  const isStaff      = !!admin && STAFF_ROLES.has(String(admin.role || '').toLowerCase());
  const showAdminPill = isStaff;

  // Decide where the Account icon should go + what label it shows.
  //   any session → /account (admin AND customer; each has its own view)
  //   no session  → /login ("Account")
  //
  // The admin panel has its own dedicated "Admin Panel" pill next to this
  // button, so the account button should never shortcut there — it would
  // hide the customer-side profile for staff who also shop on the store.
  let accountHref = '/login';
  let accountLabel = 'Account';
  if (customer) {
    accountHref  = '/account';
    accountLabel = customer.name?.split(' ')[0] || 'Account';
  } else if (isStaff) {
    accountHref  = '/account';
    accountLabel = admin.name?.split(' ')[0] || 'Admin';
  }

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="py-3 flex items-center gap-6">
          {/* Logo — driven by admin-managed branding settings */}
          <Logo to="/" variant="light" size="md" />

          {/* Search — debounced live dropdown over categories, subcategories
              and products. Submitting falls back to the Shop listing with
              ?search= applied. */}
          <div className="flex-1 hidden md:block">
            <SearchBox />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-4">
            {showAdminPill && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-full bg-hp-blue/10 text-hp-blue text-xs font-semibold hover:bg-hp-blue hover:text-white transition-colors"
                title={`Signed in as ${admin.role} — open the admin panel`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Admin Panel
              </Link>
            )}
            <Link to={accountHref} className="hidden sm:flex flex-col items-center text-xs text-slate-700 hover:text-hp-blue">
              <User className="w-5 h-5" />
              <span>{accountLabel}</span>
            </Link>
            <Link to={customer ? '/wishlist' : '/login'} className="hidden sm:flex flex-col items-center text-xs text-slate-700 hover:text-hp-blue">
              <Heart className="w-5 h-5" />
              <span>Wishlist</span>
            </Link>
          </div>
        </div>

        {/* Category nav — each item opens a subcategory dropdown on hover
            when its category has any, otherwise behaves like a plain link. */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-700 h-11 border-t border-slate-100">
          {navItems.map((item) => (
            <CategoryNavItem key={item.to} item={item} />
          ))}
        </nav>
      </div>
    </header>
  );
}

// CategoryNavItem — renders a top-level category link. When the category has
// subcategories, a chevron + hover/focus dropdown of those subcategories
// drops down below the link. Clicking the top link still navigates to
// /shop/<category> so the "whole category" entry point remains one click.
//
// We rely on Tailwind's `group` + `group-hover` / `group-focus-within` so
// there's zero JS state for the open/close — the hover bridge (pt-2) keeps
// the dropdown from closing when the cursor crosses the gap to the panel.
function CategoryNavItem({ item }) {
  const { category, label, to, badge } = item;
  const subs = Array.isArray(category?.subcategories) ? category.subcategories : [];
  const hasSubs = subs.length > 0;

  const linkClass = ({ isActive }) =>
    `hover:text-hp-blue flex items-center gap-1 h-full ${isActive ? 'text-hp-blue' : ''}`;

  if (!hasSubs) {
    return (
      <NavLink to={to} className={linkClass}>
        {label}
        {badge && (
          <span className="text-[10px] bg-accent-red text-white px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </NavLink>
    );
  }

  return (
    <div className="relative group h-full flex items-center">
      <NavLink to={to} className={linkClass}>
        {label}
        <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-180" />
        {badge && (
          <span className="text-[10px] bg-accent-red text-white px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </NavLink>

      {/* Dropdown — `pt-2` acts as a hover bridge so the panel doesn't
          collapse when the cursor crosses the gap from the link to the list.
          Purely hover-driven: opens on mouse enter, closes on mouse leave.
          Uses `invisible`/`opacity-0` instead of `hidden` so the fade-in
          transition has something to animate. */}
      <div
        className="absolute left-0 top-full pt-2 min-w-[220px] z-50
                   opacity-0 invisible translate-y-1 pointer-events-none
                   group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:pointer-events-auto
                   transition-all duration-150"
      >
        <div className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1.5">
          <Link
            to={to}
            className="block px-4 py-2 text-xs font-semibold text-hp-blue hover:bg-hp-blue/5"
          >
            View all {label} →
          </Link>
          <div className="border-t border-slate-100 my-1" />
          {subs.map((s) => (
            <Link
              key={s.slug}
              to={`${to}?sub=${encodeURIComponent(s.slug)}`}
              className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-hp-blue transition-colors"
            >
              {s.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
