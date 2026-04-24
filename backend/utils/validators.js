// Server-side validation helpers. Mirrors frontend/src/lib/validators.js so
// the rules stay consistent. Frontend validation improves UX; this is the
// authoritative gate — anything not enforced here can be bypassed with curl.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts Indian phone numbers with optional +91 / 91 / 0 prefixes. Returns
// the 10-digit national form or null if invalid.
function normalizePhoneIN(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return normalizePhoneIN(digits.slice(1));
  if (digits.length === 12 && digits.startsWith('91')) return normalizePhoneIN(digits.slice(2));
  if (digits.length === 13 && digits.startsWith('091')) return normalizePhoneIN(digits.slice(3));
  return null;
}

function isEmail(v) { return typeof v === 'string' && EMAIL_RE.test(v); }

// Password policy: minimum 6 characters, at least one letter, one digit,
// and one special character. Kept deliberately light — long enough to deter
// trivial guesses but not heavy enough to frustrate customers.
function isStrongPassword(v) {
  if (typeof v !== 'string' || v.length < 6) return false;
  if (!/[A-Za-z]/.test(v)) return false;
  if (!/\d/.test(v))       return false;
  if (!/[^A-Za-z0-9]/.test(v)) return false;
  return true;
}

module.exports = { isEmail, isStrongPassword, normalizePhoneIN };
