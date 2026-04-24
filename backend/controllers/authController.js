const User = require('../models/User');
const Admin = require('../models/Admin');
const { signUserToken, signAdminToken } = require('../utils/generateToken');
const { isEmail, isStrongPassword, normalizePhoneIN } = require('../utils/validators');
const { requireVerification } = require('./otpController');

// POST /api/users/register
// Requires:
//   name, email, phone, password, phoneVerificationToken
// The phoneVerificationToken is obtained by completing OTP verification on
// /api/auth/otp/verify with channel='phone', purpose='signup'. The phone on
// the request must match the identifier embedded in that token.
async function register(req, res) {
  const { name, email, phone, password, phoneVerificationToken } = req.body;
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: 'Name, email, phone and password are required.' });
  }
  if (!isEmail(email)) return res.status(400).json({ message: 'Invalid email address.' });
  const normalizedPhone = normalizePhoneIN(phone);
  if (!normalizedPhone) return res.status(400).json({ message: 'Invalid Indian phone number.' });
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      message: 'Password must be at least 6 characters and include a letter, a number and a special character.',
    });
  }

  // Confirm OTP verification completed for THIS phone number.
  try {
    requireVerification(phoneVerificationToken, {
      expectedIdentifier: normalizedPhone,
      expectedPurpose: 'signup',
      expectedChannel: 'phone',
    });
  } catch (e) {
    return res.status(e.status || 400).json({ message: e.message });
  }

  const emailExists = await User.findOne({ email: email.toLowerCase() });
  if (emailExists) return res.status(409).json({ message: 'Email already registered.' });
  const phoneExists = await User.findOne({ phone: normalizedPhone });
  if (phoneExists) return res.status(409).json({ message: 'Phone already registered.' });

  const user = await User.create({
    name,
    email,
    phone: normalizedPhone,
    password,
    mobileVerified: true,  // OTP just proved possession of the phone
  });
  const token = signUserToken({ id: user._id });
  res.status(201).json({ user: user.toSafeJSON(), token });
}

// POST /api/users/login — legacy, kept for backward compatibility.
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = signUserToken({ id: user._id });
  res.json({ user: user.toSafeJSON(), token });
}

// GET /api/users/me
async function me(req, res) {
  res.json({ user: req.user });
}

// Roles that grant admin-panel access. Any User whose `role` is in this set
// behaves as staff — they get an admin-signed JWT and kind:'admin' so the
// frontend treats them exactly like an entry from the Admin collection.
const STAFF_ROLES = new Set(['admin', 'superadmin', 'coordinator']);

// POST /api/auth/login — unified (staff first, then customer).
// A super-admin can promote a customer by flipping User.role via the admin
// panel; the next time that customer signs in, unifiedLogin notices the
// staff role, signs an admin token, and returns kind:'admin'. No separate
// Admin collection entry needed.
async function unifiedLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  if (!isEmail(email)) return res.status(400).json({ message: 'Invalid email address.' });
  const e = email.toLowerCase();

  const admin = await Admin.findOne({ email: e });
  if (admin && (await admin.matchPassword(password))) {
    const token = signAdminToken({ id: admin._id, role: admin.role, kind: 'admin' });
    return res.json({
      account: admin.toSafeJSON(),
      token,
      role: admin.role,
      kind: 'admin',
    });
  }

  const user = await User.findOne({ email: e });
  if (user && (await user.matchPassword(password))) {
    if (user.blocked) {
      return res.status(403).json({ message: 'This account has been blocked. Please contact support.' });
    }
    const role = String(user.role || 'customer').toLowerCase();
    const isStaff = STAFF_ROLES.has(role);
    // We always issue a customer-signed JWT so the user can access user-
    // facing endpoints (wishlist, orders, reviews). For staff roles we
    // additionally sign an admin JWT so the admin panel recognises them.
    // The primary `token` matches `kind` so existing clients keep working;
    // `userToken` is new and only populated for User-backed sessions.
    const userToken  = signUserToken({ id: user._id });
    const adminToken = isStaff ? signAdminToken({ id: user._id, role, kind: 'user' }) : null;
    return res.json({
      account: user.toSafeJSON(),
      token: isStaff ? adminToken : userToken,
      userToken,
      role,
      kind: isStaff ? 'admin' : 'user',
    });
  }

  return res.status(401).json({ message: 'Invalid credentials' });
}

// POST /api/auth/password/reset
// Body: { email, newPassword, resetToken } where resetToken was obtained
// from OTP verify with channel='email', purpose='forgot-password'.
async function resetPassword(req, res) {
  const { email, newPassword, resetToken } = req.body;
  if (!isEmail(email))                 return res.status(400).json({ message: 'Invalid email.' });
  if (!isStrongPassword(newPassword))  return res.status(400).json({
    message: 'Password must be at least 6 characters and include a letter, a number and a special character.',
  });
  const canonical = String(email).toLowerCase().trim();
  try {
    requireVerification(resetToken, {
      expectedIdentifier: canonical,
      expectedPurpose: 'forgot-password',
      expectedChannel: 'email',
    });
  } catch (e) {
    return res.status(e.status || 400).json({ message: e.message });
  }
  const user = await User.findOne({ email: canonical });
  if (!user) return res.status(404).json({ message: 'Account not found.' });
  user.password = newPassword;      // pre-save hook hashes it
  await user.save();
  res.json({ ok: true, message: 'Password updated. Please sign in with the new password.' });
}

module.exports = { register, login, me, unifiedLogin, resetPassword };
