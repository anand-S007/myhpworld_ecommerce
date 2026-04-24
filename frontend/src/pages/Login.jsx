import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Store } from 'lucide-react';
import { useUnifiedLogin } from '../hooks/queries.js';
import { useAdminStore } from '../store/adminStore.js';
import { useUserStore } from '../store/userStore.js';

// Staff roles that are allowed to land on the admin panel. Anything else
// (including an empty or missing role) is treated as a normal customer.
const STAFF_ROLES = new Set(['admin', 'superadmin', 'coordinator']);

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr]   = useState('');
  // After a staff login we hold the session here and ask where to go.
  const [pendingAdmin, setPendingAdmin] = useState(null);
  const navigate = useNavigate();
  const loginMutation = useUnifiedLogin();
  const adminLogin  = useAdminStore((s) => s.adminLogin);
  const adminLogout = useAdminStore((s) => s.adminLogout);
  const userLogin   = useUserStore((s) => s.login);
  const userLogout  = useUserStore((s) => s.logout);
  const loading = loginMutation.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const data = await loginMutation.mutateAsync(form);
      const role = String(data.role || '').toLowerCase();
      const isStaff = data.kind === 'admin' && STAFF_ROLES.has(role);

      if (isStaff) {
        // Staff roles live on User documents, so they also get a
        // customer-signed JWT (`userToken`). Populating userStore too means
        // the wishlist, orders, and other user-gated endpoints accept their
        // calls while the admin panel works off the admin session.
        adminLogin(data.account, data.token);
        if (data.userToken) {
          userLogin(data.account, data.userToken);
        } else {
          // Real Admin-collection accounts don't have a User, so clear any
          // stale customer session to avoid mixed state.
          userLogout();
        }
        setPendingAdmin({ name: data.account?.name, role });
      } else {
        // Normal customer login — drop any stale admin session so a
        // previous admin user on this device can't accidentally see the
        // admin pill after a customer signs in. data.account must be
        // present for kind:'user'; if it isn't we surface the error.
        if (!data.account) {
          setErr('Login succeeded but the server returned no user profile — please try again.');
          return;
        }
        adminLogout();
        userLogin(data.account, data.token);
        // replace so the Back button doesn't return to /login after signing in
        navigate('/account', { replace: true });
      }
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Login failed. Check your credentials.');
    }
  };

  return (
    <div className="min-h-[70vh] grid place-items-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-8 shadow-soft">
        <h1 className="font-display text-3xl font-bold text-hp-ink">Welcome back</h1>
        <p className="text-slate-500 text-sm mt-2">Sign in to your HP World account.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
          {err && <div className="text-sm text-accent-red">{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 rounded-full disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 text-right">
          <Link to="/forgot-password" className="text-sm text-hp-blue hover:underline">
            Forgot password?
          </Link>
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          New here?{' '}
          <Link to="/register" className="text-hp-blue font-semibold">
            Create an account
          </Link>
        </div>
      </div>

      {pendingAdmin && (
        <DestinationPicker
          name={pendingAdmin.name}
          role={pendingAdmin.role}
          onAdmin={() => navigate('/admin', { replace: true })}
          onStore={() => navigate('/', { replace: true })}
        />
      )}
    </div>
  );
}

function DestinationPicker({ name, role, onAdmin, onStore }) {
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Staff';
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-7 shadow-2xl">
        <div className="text-xs uppercase tracking-widest text-slate-400">Signed in</div>
        <h2 className="font-display text-2xl font-bold text-hp-ink mt-1">
          Welcome, {name || roleLabel}
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          You're signed in as <span className="font-semibold text-hp-ink">{roleLabel}</span>.
          Where would you like to go?
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={onAdmin}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-slate-200 hover:border-hp-blue hover:bg-hp-blue/5 text-left transition"
          >
            <div className="w-10 h-10 rounded-lg bg-hp-blue/10 text-hp-blue grid place-items-center">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-hp-ink text-sm">Admin Panel</div>
              <div className="text-xs text-slate-500">Manage products, orders, content and users.</div>
            </div>
          </button>

          <button
            type="button"
            onClick={onStore}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-slate-200 hover:border-hp-blue hover:bg-hp-blue/5 text-left transition"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 grid place-items-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-hp-ink text-sm">Store Homepage</div>
              <div className="text-xs text-slate-500">Browse the storefront the way customers see it.</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange }) {
  return (
    <label className="block text-sm">
      <div className="text-slate-600 mb-1">{label}</div>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none"
      />
    </label>
  );
}
