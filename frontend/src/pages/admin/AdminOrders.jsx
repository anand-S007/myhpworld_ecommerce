import { useState } from 'react';
import { ShoppingCart, Search, X, ChevronDown } from 'lucide-react';
import { useAdminOrders, useUpdateOrder } from '../../hooks/queries.js';

// All possible order statuses the admin can set
const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

// Color mapping for order status badges
const STATUS_STYLES = {
  pending:    'bg-amber-100  text-amber-700',
  processing: 'bg-blue-100   text-blue-700',
  shipped:    'bg-purple-100 text-purple-700',
  delivered:  'bg-green-100  text-green-700',
  cancelled:  'bg-red-100    text-red-700',
};

function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-600'}`}>
      {status || 'pending'}
    </span>
  );
}

// OrderDetailModal — shows full order info including items and address
function OrderDetailModal({ order, onClose }) {
  const [status, setStatus] = useState(order.status || 'pending');
  const updateMutation = useUpdateOrder();
  const saving = updateMutation.isPending;

  // Save the new status for this order; cache invalidation refreshes the table
  const handleStatusSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id: order._id || order.id,
        data: { status },
      });
      onClose();
    } catch {
      alert('Status update failed.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-4">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-display font-bold text-hp-ink">
              Order #{(order._id || order.id)?.slice(-8).toUpperCase()}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : '–'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Customer info */}
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Customer</div>
            <div className="text-sm font-medium text-hp-ink">{order.user?.name || order.customerName || '–'}</div>
            <div className="text-xs text-slate-500">{order.user?.email || order.customerEmail || '–'}</div>
          </div>

          {/* Shipping address */}
          {order.address && (
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Shipping Address</div>
              <div className="text-sm text-slate-600">
                {[order.address.line1, order.address.line2, order.address.city, order.address.state, order.address.pincode]
                  .filter(Boolean).join(', ')}
              </div>
            </div>
          )}

          {/* Order items list */}
          {order.items?.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Items</div>
              <div className="space-y-1.5">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-hp-ink">{item.name}</span>
                    <span className="text-slate-500 shrink-0 ml-2">
                      ×{item.qty} · ₹{Number((item.price || 0) * item.qty).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order total */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="font-semibold text-hp-ink">Total</span>
            <span className="font-bold text-hp-ink text-lg">₹{Number(order.total || 0).toLocaleString('en-IN')}</span>
          </div>

          {/* Status updater dropdown */}
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Update Status</div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-10 pl-3 pr-8 rounded-lg border border-slate-200 text-sm bg-white focus:border-hp-blue outline-none appearance-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <button
                onClick={handleStatusSave}
                disabled={saving || status === order.status}
                className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminOrders() {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected]         = useState(null);
  const [page, setPage]                 = useState(1);

  const { data, isLoading: loading } = useAdminOrders({ page, limit: 20 });
  const orders     = Array.isArray(data) ? data : (data?.orders || []);
  const totalPages = Array.isArray(data) ? 1 : (data?.totalPages || 1);

  // Client-side filters
  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || (o._id || o.id)?.toLowerCase().includes(q)
      || o.user?.name?.toLowerCase().includes(q)
      || o.customerName?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <>
      {/* Page header with search and status filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-hp-blue" />
          <h1 className="font-display text-2xl font-bold text-hp-ink">Orders</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Search by order ID or customer name */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders…"
              className="h-9 pl-9 pr-4 rounded-full border border-slate-200 text-sm focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none w-44"
            />
          </div>
          {/* Filter by status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 pl-3 pr-7 rounded-full border border-slate-200 text-sm bg-white focus:border-hp-blue outline-none appearance-none"
            >
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Order ID</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                      {search || statusFilter !== 'all' ? 'No orders match your filters.' : 'No orders yet.'}
                    </td>
                  </tr>
                )}
                {filtered.map((o) => {
                  const id = o._id || o.id;
                  return (
                    <tr key={id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        #{id?.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 font-medium text-hp-ink">
                        {o.user?.name || o.customerName || '–'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell">
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '–'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-hp-ink">
                        ₹{Number(o.total || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {/* Open detail modal for this order */}
                        <button
                          onClick={() => setSelected(o)}
                          className="text-xs text-hp-blue hover:underline font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">← Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">Next →</button>
          </div>
        )}
      </div>

      {/* Order detail / status update modal */}
      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
