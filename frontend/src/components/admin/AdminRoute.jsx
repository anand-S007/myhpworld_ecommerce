import { Navigate } from 'react-router-dom';
import { useAdminStore } from '../../store/adminStore.js';

// AdminRoute — a guard component that protects every admin page.
// If the admin is not authenticated (no stored session), it redirects
// to /admin/login instead of rendering the protected page.
// Usage: <AdminRoute><AdminDashboard /></AdminRoute>
export default function AdminRoute({ children }) {
  const admin = useAdminStore((s) => s.admin);

  // Not logged in → send to admin login page
  if (!admin) return <Navigate to="/admin/login" replace />;

  // Logged in → render the wrapped admin page
  return children;
}
