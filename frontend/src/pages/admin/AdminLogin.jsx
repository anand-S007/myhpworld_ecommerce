import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminLogin } from '../../hooks/queries.js';
import { useAdminStore } from '../../store/adminStore.js';

// AdminLogin — the entry point to the admin panel.
// This page is publicly accessible but all other /admin/* routes are guarded.
// On successful login the admin's JWT and profile are stored via AdminContext.
export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr]   = useState('');

  const adminLogin = useAdminStore((s) => s.adminLogin);
  
  
  const navigate = useNavigate();
  const loginMutation = useAdminLogin();

  // Submit handler — calls POST /admin/login via TanStack Query, stores the
  // session via AdminContext, then redirects.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const data = await loginMutation.mutateAsync(form);
      adminLogin(data.admin || data.user, data.token);
      // replace so Back doesn't return to /admin/login after signing in
      navigate('/admin', { replace: true });
    } catch (e2) {
      console.log(e2);
      
      setErr(e2?.response?.data?.message || 'Invalid admin credentials.');
    }
  };

  const loading = loginMutation.isPending;

  return (
    <div className="min-h-screen bg-hp-navy grid place-items-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl">

        {/* HP World Admin branding */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-hp-blue grid place-items-center font-display font-extrabold text-white text-lg">
            hp
          </div>
          <div>
            <div className="font-display font-bold text-hp-ink text-lg">HP World Admin</div>
            <div className="text-xs text-slate-500">Restricted access · Admin only</div>
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold text-hp-ink mb-1">Sign in</h1>
        <p className="text-slate-500 text-sm mb-6">Enter your admin email and password to continue.</p>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email field */}
          <label className="block text-sm">
            <span className="text-slate-600 mb-1 block">Email address</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
              placeholder="admin@hpworld.com"
            />
          </label>

          {/* Password field */}
          <label className="block text-sm">
            <span className="text-slate-600 mb-1 block">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
            />
          </label>

          {/* Inline error message from API */}
          {err && (
            <div className="text-sm text-accent-red bg-red-50 border border-red-100 px-4 py-2.5 rounded-lg">
              {err}
            </div>
          )}

          {/* Submit button — disabled while the API call is in-flight */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 rounded-full text-sm font-semibold disabled:opacity-60 mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in to Admin Panel'}
          </button>
        </form>
      </div>
    </div>
  );
}
