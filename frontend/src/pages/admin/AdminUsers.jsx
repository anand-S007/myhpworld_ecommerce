import { useState } from 'react';
import { Users, Search, X, Mail, Phone, Calendar, ShoppingBag, Pencil, Check, Loader2, ShieldOff, ShieldCheck } from 'lucide-react';
import { useAdminUsers, useSetUserRole, useSetUserBlocked } from '../../hooks/queries.js';
import { useAdminStore } from '../../store/adminStore.js';

// Quick-pick chips. Labels show cleanly; the value stored on the user is
// the slug on the right. The slug is what the server validates
// (`^[a-z0-9_-]{2,30}$`), so "super admin" with a space becomes `superadmin`.
const ROLE_SUGGESTIONS = [
  { label: 'Super admin', value: 'superadmin' },
  { label: 'Admin',       value: 'admin' },
  { label: 'Coordinator', value: 'coordinator' },
  { label: 'Customer',    value: 'customer' },
];

// AdminUsers — read-only view of all registered customer accounts.
// Deletion is intentionally not available here to prevent accidental data loss.
// Admins can view customer details and their order count.
export default function AdminUsers() {
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);
  const [page, setPage]         = useState(1);

  const { data, isLoading: loading } = useAdminUsers({ page, limit: 25 });
  const users      = Array.isArray(data) ? data : (data?.users || []);
  const totalPages = Array.isArray(data) ? 1 : (data?.totalPages || 1);

  // Role editing is a super-admin-only power.
  const admin     = useAdminStore((s) => s.admin);
  const canEditRole = admin?.role === 'superadmin';

  // Client-side search across name, email, and phone
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q
      || u.name?.toLowerCase().includes(q)
      || u.email?.toLowerCase().includes(q)
      || u.phone?.includes(q);
  });

  return (
    <>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-hp-blue" />
          <h1 className="font-display text-2xl font-bold text-hp-ink">Users</h1>
          {!loading && (
            <span className="text-sm text-slate-400 ml-1">({users.length} loaded)</span>
          )}
        </div>
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="h-9 pl-9 pr-4 rounded-full border border-slate-200 text-sm focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Users table ── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-3">Name</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">Email</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Phone</th>
                      <th className="text-left px-4 py-3 hidden lg:table-cell">Joined</th>
                      <th className="text-left px-4 py-3 hidden lg:table-cell">Orders</th>
                      <th className="px-4 py-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                          {search ? 'No users match your search.' : 'No users yet.'}
                        </td>
                      </tr>
                    )}
                    {filtered.map((u) => {
                      const id = u._id || u.id;
                      const isSelected = (selected?._id || selected?.id) === id;
                      return (
                        <tr
                          key={id}
                          className={`border-t border-slate-100 cursor-pointer transition-colors ${isSelected ? 'bg-hp-blue/5' : 'hover:bg-slate-50'}`}
                          onClick={() => setSelected(isSelected ? null : u)}
                        >
                          <td className="px-4 py-3">
                            {/* User avatar initials */}
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-hp-blue/10 grid place-items-center text-hp-blue font-semibold text-xs shrink-0">
                                {u.name?.[0]?.toUpperCase() || '?'}
                              </div>
                              <span className="font-medium text-hp-ink">{u.name}</span>
                              {u.blocked && (
                                <span className="text-[10px] bg-accent-red/10 text-accent-red px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">
                                  Blocked
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{u.email}</td>
                          <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{u.phone || '–'}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '–'}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {/* Order count badge */}
                            <span className="text-xs bg-hp-blue/10 text-hp-blue px-2 py-0.5 rounded font-medium">
                              {u.orderCount ?? u.orders?.length ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelected(isSelected ? null : u); }}
                              className="text-xs text-hp-blue hover:underline font-medium"
                            >
                              {isSelected ? 'Close' : 'View'}
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
        </div>

        {/* ── User detail panel ── */}
        <div>
          {selected ? (
            <div className="bg-white rounded-xl shadow-sm p-5">
              {/* Header with close button */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-hp-ink">User Details</h2>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Avatar and name */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-full bg-hp-blue/10 grid place-items-center text-hp-blue font-bold text-lg">
                  {selected.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-hp-ink truncate">{selected.name}</div>
                  <div className="text-xs text-slate-400 capitalize">{selected.role || 'customer'}</div>
                </div>
              </div>

              {/* Role editor — super-admin only */}
              <RoleEditor
                user={selected}
                canEdit={canEditRole}
                onSaved={(u) => setSelected(u)}
              />

              {/* Block / unblock — any admin can do this */}
              <BlockToggle
                user={selected}
                onSaved={(u) => setSelected(u)}
              />

              {/* Contact details */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="break-all">{selected.email || '–'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selected.phone || '–'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Joined {selected.createdAt
                      ? new Date(selected.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })
                      : '–'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600">
                  <ShoppingBag className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selected.orderCount ?? selected.orders?.length ?? 0} orders placed</span>
                </div>
              </div>

              {/* Saved addresses if available */}
              {selected.addresses?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Saved Addresses</div>
                  {selected.addresses.map((addr, i) => (
                    <div key={i} className="text-xs text-slate-500 mb-1">
                      {[addr.line1, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                    </div>
                  ))}
                </div>
              )}

              {/* Note explaining read-only policy */}
              <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
                Names, emails and phone numbers are read-only here — only a super-admin can change a user's role.
              </p>
            </div>
          ) : (
            // Placeholder when no user is selected
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Click a user row to view their details.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// RoleEditor — inline editor for User.role. Disabled for non-super-admins.
// The input is free-form: typing a new slug creates a new role label on the
// fly, and the suggestion chips below just pre-fill common choices.
function RoleEditor({ user, canEdit, onSaved }) {
  const [value, setValue] = useState((user.role || 'customer').toLowerCase());
  const [err, setErr] = useState('');
  const mutation = useSetUserRole();
  const id = user._id || user.id;
  const dirty = value !== (user.role || 'customer');

  const save = async () => {
    setErr('');
    const slug = value.trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,30}$/.test(slug)) {
      setErr('2–30 chars · lowercase letters, digits, _ and - only.');
      return;
    }
    try {
      const updated = await mutation.mutateAsync({ id, role: slug });
      onSaved?.(updated);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Could not update role.');
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 mb-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
        <Pencil className="w-3.5 h-3.5" /> Role
        {!canEdit && (
          <span className="ml-auto text-[10px] text-slate-400 uppercase tracking-widest">Super-admin only</span>
        )}
      </div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.toLowerCase())}
        disabled={!canEdit}
        placeholder="customer"
        className={`w-full h-9 px-3 rounded-lg border text-sm outline-none transition-colors ${
          canEdit
            ? 'bg-white border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10'
            : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
        }`}
      />
      {canEdit && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {ROLE_SUGGESTIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setValue(r.value)}
              className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                value === r.value
                  ? 'bg-hp-blue text-white border-hp-blue'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-hp-blue hover:text-hp-blue'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
      {err && <div className="text-xs text-accent-red mt-2">{err}</div>}
      {canEdit && (
        <button
          type="button"
          disabled={!dirty || mutation.isPending}
          onClick={save}
          className="btn-primary mt-3 px-3 py-1.5 rounded-full text-xs inline-flex items-center gap-1 disabled:opacity-50"
        >
          {mutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Save role
        </button>
      )}
    </div>
  );
}

// BlockToggle — flips the user's `blocked` flag. A blocked user cannot sign
// in, and existing JWTs are rejected by the auth middleware. Confirms before
// both block and unblock so it can't happen by accident.
function BlockToggle({ user, onSaved }) {
  const mutation = useSetUserBlocked();
  const id = user._id || user.id;
  const isBlocked = !!user.blocked;

  const handle = async () => {
    const verb = isBlocked ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${verb} ${user.name}?`)) return;
    try {
      const updated = await mutation.mutateAsync({ id, blocked: !isBlocked });
      onSaved?.(updated);
    } catch {
      alert('Could not update the user. Please try again.');
    }
  };

  return (
    <div className={`border rounded-lg px-3 py-3 mb-4 ${
      isBlocked ? 'bg-accent-red/5 border-accent-red/20' : 'bg-slate-50 border-slate-200'
    }`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
        {isBlocked
          ? <ShieldOff className="w-3.5 h-3.5 text-accent-red" />
          : <ShieldCheck className="w-3.5 h-3.5 text-accent-mint" />
        }
        Account status
        <span className={`ml-auto text-[10px] uppercase tracking-widest ${
          isBlocked ? 'text-accent-red' : 'text-accent-mint'
        }`}>
          {isBlocked ? 'Blocked' : 'Active'}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        {isBlocked
          ? 'This user cannot sign in. Existing tokens are also rejected.'
          : 'User can sign in and use the site normally.'}
      </p>
      <button
        type="button"
        onClick={handle}
        disabled={mutation.isPending}
        className={`w-full py-1.5 rounded-full text-xs font-medium inline-flex items-center justify-center gap-1 transition-colors disabled:opacity-50 ${
          isBlocked
            ? 'bg-accent-mint/10 text-accent-mint hover:bg-accent-mint/20'
            : 'bg-accent-red/10 text-accent-red hover:bg-accent-red/20'
        }`}
      >
        {mutation.isPending
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : (isBlocked ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />)
        }
        {isBlocked ? 'Unblock user' : 'Block user'}
      </button>
    </div>
  );
}
