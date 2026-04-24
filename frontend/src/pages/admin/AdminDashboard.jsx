import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, ShoppingCart, Users, IndianRupee, Tag, Image,
  Gift, MapPin, Star, Flame, ArrowRight, TrendingUp, Eye,
} from 'lucide-react';
import { useAdminStats, useVisitStats } from '../../hooks/queries.js';

// ── Sub-components ────────────────────────────────────────────────────────────

// StatCard — top-row KPI cards (Products, Orders, Users, Revenue)
function StatCard({ icon: Icon, label, value, colorClass, to }) {
  return (
    <Link
      to={to}
      className="bg-white rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow group"
    >
      {/* Colored icon tile */}
      <div className={`w-12 h-12 rounded-xl grid place-items-center shrink-0 ${colorClass}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-display font-bold text-hp-ink">{value ?? '–'}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
      {/* Arrow indicates the card is clickable */}
      <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-hp-blue transition-colors" />
    </Link>
  );
}

// QuickLink — grid of shortcuts to every admin content section
function QuickLink({ icon: Icon, label, to, desc }) {
  return (
    <Link
      to={to}
      className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md hover:border-hp-blue border border-transparent transition-all"
    >
      <div className="w-9 h-9 rounded-lg bg-hp-blue/10 grid place-items-center shrink-0">
        <Icon className="w-5 h-5 text-hp-blue" />
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-sm text-hp-ink">{label}</div>
        <div className="text-xs text-slate-400 truncate">{desc}</div>
      </div>
    </Link>
  );
}

// ── Visitor analytics ─────────────────────────────────────────────────────
// Fetches aggregated visit counts for the selected range and renders them
// as a headline + CSS bar chart. No external chart library — each bar is a
// flex item whose height is a percentage of the busiest bucket in the
// range, which scales cleanly regardless of traffic volume.

const RANGE_TABS = [
  { value: '1h', label: 'Last hour' },
  { value: '1d', label: 'Last 24h' },
  { value: '1m', label: 'Last 30 days' },
  { value: '1y', label: 'Last year' },
];

function VisitorsPanel() {
  const [range, setRange] = useState('1d');
  const { data, isLoading } = useVisitStats(range);

  const total    = data?.total   ?? 0;
  const unique   = data?.unique  ?? 0;
  const buckets  = data?.buckets ?? [];
  const maxValue = Math.max(1, ...buckets.map((b) => b.total));

  return (
    <section className="bg-white rounded-xl shadow-sm p-5 mb-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-hp-blue/10 grid place-items-center">
            <Eye className="w-5 h-5 text-hp-blue" />
          </div>
          <div>
            <div className="text-sm text-slate-500">Website visitors</div>
            <div className="font-display text-2xl font-bold text-hp-ink leading-tight">
              {isLoading ? '…' : unique.toLocaleString('en-IN')}
              <span className="text-sm text-slate-400 font-normal ml-2">
                unique · {total.toLocaleString('en-IN')} views
              </span>
            </div>
          </div>
        </div>

        {/* Range tabs */}
        <div className="inline-flex bg-slate-100 rounded-full p-1 text-xs font-medium">
          {RANGE_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setRange(t.value)}
              className={`px-3 py-1.5 rounded-full transition-colors ${
                range === t.value
                  ? 'bg-white text-hp-ink shadow-sm'
                  : 'text-slate-500 hover:text-hp-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bar chart — plain CSS. Each bar height is max(2%, value/maxValue).
          The 2% floor keeps zero-traffic buckets visible as thin pegs. */}
      <div className="relative">
        {isLoading ? (
          <div className="h-32 rounded-lg bg-slate-50 animate-pulse" />
        ) : buckets.length === 0 ? (
          <div className="h-32 rounded-lg bg-slate-50 grid place-items-center text-xs text-slate-400">
            No visits recorded in this range yet.
          </div>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {buckets.map((b) => {
              const pct = Math.max(2, Math.round((b.total / maxValue) * 100));
              return (
                <div
                  key={b.time}
                  className="group flex-1 relative"
                  title={`${formatBucket(b.time, range)} · ${b.total} views · ${b.unique} unique`}
                >
                  <div
                    style={{ height: `${pct}%` }}
                    className="w-full bg-hp-blue/80 hover:bg-hp-blue rounded-t-md transition-colors min-h-[2px]"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* X-axis labels — first, middle, last bucket only so the row stays
          readable on mobile. */}
      {!isLoading && buckets.length > 1 && (
        <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
          <span>{formatBucket(buckets[0].time, range)}</span>
          <span>{formatBucket(buckets[Math.floor(buckets.length / 2)].time, range)}</span>
          <span>{formatBucket(buckets[buckets.length - 1].time, range)}</span>
        </div>
      )}
    </section>
  );
}

// Formats a bucket timestamp per the range granularity: 1h → hh:mm,
// 1d → ha, 1m → d MMM, 1y → MMM.
function formatBucket(iso, range) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  if (range === '1h') {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  if (range === '1d') {
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true }).replace(/\s/g, '');
  }
  if (range === '1m') {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('en-IN', { month: 'short' });
}

// Color-coded badge for order status values
function StatusBadge({ status }) {
  const styles = {
    pending:    'bg-amber-100  text-amber-700',
    processing: 'bg-blue-100   text-blue-700',
    shipped:    'bg-purple-100 text-purple-700',
    delivered:  'bg-green-100  text-green-700',
    cancelled:  'bg-red-100    text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
      {status || 'pending'}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { data, isLoading } = useAdminStats();
  const stats = data?.stats || {};
  const recentOrders = data?.recentOrders || [];
  const loading = isLoading;

  return (
    <>
      {/* Page heading */}
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-6 h-6 text-hp-blue" />
        <h1 className="font-display text-2xl font-bold text-hp-ink">Dashboard</h1>
      </div>

      {/* ── KPI stats row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Package}
          label="Total Products"
          value={stats.products}
          colorClass="bg-hp-blue"
          to="/admin/products"
        />
        <StatCard
          icon={ShoppingCart}
          label="Total Orders"
          value={stats.orders}
          colorClass="bg-accent-amber"
          to="/admin/orders"
        />
        <StatCard
          icon={Users}
          label="Registered Users"
          value={stats.users}
          colorClass="bg-accent-mint"
          to="/admin/users"
        />
        <StatCard
          icon={IndianRupee}
          label="Total Revenue"
          value={stats.revenue != null ? `₹${Number(stats.revenue).toLocaleString('en-IN')}` : undefined}
          colorClass="bg-accent-red"
          to="/admin/orders"
        />
      </div>

      {/* ── Visitors panel ── */}
      <VisitorsPanel />

      {/* ── Quick navigation to all content sections ── */}
      <h2 className="font-display text-lg font-semibold text-hp-ink mb-3">Manage Content</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        <QuickLink icon={Tag}          label="Categories"        to="/admin/categories" desc="Add, edit, and delete product categories" />
        <QuickLink icon={Image}        label="Banners"           to="/admin/banners"    desc="Control the hero carousel on the homepage" />
        <QuickLink icon={Gift}         label="Offers"            to="/admin/offers"     desc="Bank offers, EMI, and exchange deals" />
        <QuickLink icon={Star}         label="Featured Products" to="/admin/featured"   desc="Select products for the homepage grid" />
        <QuickLink icon={Flame}        label="Deal of the Day"   to="/admin/deal"       desc="Set the daily featured deal with timer" />
        <QuickLink icon={MapPin}       label="Stores"            to="/admin/stores"     desc="Manage physical store locations" />
        <QuickLink icon={Package}      label="Products"          to="/admin/products"   desc="Full product catalog management" />
        <QuickLink icon={ShoppingCart} label="Orders"            to="/admin/orders"     desc="View and update order statuses" />
        <QuickLink icon={Users}        label="Users"             to="/admin/users"      desc="View registered customer accounts" />
      </div>

      {/* ── Recent orders table ── */}
      <h2 className="font-display text-lg font-semibold text-hp-ink mb-3">Recent Orders</h2>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          // Loading skeleton placeholder
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Order ID</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => {
                  const id = order._id || order.id;
                  return (
                    <tr key={id} className="border-t border-slate-100 hover:bg-slate-50">
                      {/* Show last 8 chars of MongoDB ObjectId for brevity */}
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        #{id?.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {order.user?.name || order.customerName || '–'}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        ₹{Number(order.total || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString('en-IN')
                          : '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer link to the full orders page */}
        <div className="px-4 py-3 border-t border-slate-100 text-right">
          <Link to="/admin/orders" className="text-sm text-hp-blue font-medium hover:underline">
            View all orders →
          </Link>
        </div>
      </div>
    </>
  );
}
