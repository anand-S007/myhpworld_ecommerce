// Frontend validators. Mirror backend/utils/validators.js so "looks valid in
// the form" and "accepted by the server" stay aligned. Server is the source
// of truth; these only exist to give the user instant feedback.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(v) {
  return typeof v === 'string' && EMAIL_RE.test(v.trim());
}

// Accepts Indian phone numbers with optional +91/91/0 prefix; returns the
// 10-digit national form, or null if it doesn't look like a real Indian
// mobile number (leading digit must be 6–9).
export function normalizePhoneIN(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return normalizePhoneIN(digits.slice(1));
  if (digits.length === 12 && digits.startsWith('91')) return normalizePhoneIN(digits.slice(2));
  if (digits.length === 13 && digits.startsWith('091')) return normalizePhoneIN(digits.slice(3));
  return null;
}

// Password policy: ≥6 chars, at least one letter, one digit, one special.
// Returns null when valid, otherwise a human-readable reason.
export function passwordIssue(v) {
  if (typeof v !== 'string' || v.length < 6) return 'At least 6 characters.';
  if (!/[A-Za-z]/.test(v))      return 'Add at least one letter.';
  if (!/\d/.test(v))            return 'Add at least one number.';
  if (!/[^A-Za-z0-9]/.test(v))  return 'Add at least one special character (e.g. @, #, !).';
  return null;
}
