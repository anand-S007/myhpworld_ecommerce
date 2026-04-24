const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User  = require('../models/User');

// Roles that grant admin-panel access. Kept in sync with the frontend so
// there's one definition of "staff" across the stack.
const STAFF_ROLES = new Set(['admin', 'superadmin', 'coordinator']);

// protectAdmin — accepts an admin-signed JWT that references EITHER:
//   • an Admin document (the original staff collection), or
//   • a User document whose `role` is one of STAFF_ROLES (promoted-from-
//     customer path — super-admin flips a customer's role in the admin
//     panel, they gain admin access on next login).
// If the User's role has since been changed back to something non-staff,
// the token is rejected so access is revoked immediately on the next call.
async function protectAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Admin not authorized, token missing' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
    let admin;
    if (decoded.kind === 'user') {
      admin = await User.findById(decoded.id).select('-password');
      if (!admin) return res.status(401).json({ message: 'Account no longer exists' });
      const role = String(admin.role || '').toLowerCase();
      if (!STAFF_ROLES.has(role)) {
        return res.status(403).json({ message: 'Admin role revoked. Please sign in again.' });
      }
    } else {
      admin = await Admin.findById(decoded.id).select('-password');
      if (!admin) return res.status(401).json({ message: 'Admin no longer exists' });
    }
    req.admin = admin;
    next();
  } catch {
    return res.status(401).json({ message: 'Admin not authorized, token invalid' });
  }
}

module.exports = { protectAdmin, STAFF_ROLES };
