const jwt = require('jsonwebtoken');
const OtpCode = require('../models/OtpCode');
const User = require('../models/User');
const { isEmail, normalizePhoneIN } = require('../utils/validators');
const { sendMail } = require('../utils/mailer');

const OTP_TTL_MS       = 10 * 60 * 1000; // codes are valid for 10 minutes
const OTP_MAX_ATTEMPTS = 5;              // wrong codes allowed per OTP doc
const VERIFY_TTL       = '15m';          // how long the "verified" token stays usable

// Result shape:
//   { delivered: true }                                         → real provider sent it
//   { delivered: false }                                        → dev log only
//   { delivered: false, reason: 'not-configured' }              → SMTP not set up
//   { delivered: false, reason: 'send-failed', error: string }  → provider rejected us
// The caller uses this to decide the API response message + whether to
// echo `devCode` to the client in dev.
async function deliverCode({ channel, identifier, code, purpose }) {
  const logDev = (extra = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[OTP:${purpose}] ${channel}=${identifier} → code ${code} (valid 10 min)`);
    }
    return { delivered: false, ...extra };
  };

  // Emails go through nodemailer when SMTP is configured in .env:
  //   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
  //   SMTP_FROM (optional), SMTP_SECURE (optional, true by default on 465).
  if (channel === 'email') {
    const subject = purpose === 'signup'
      ? 'Your HP World verification code'
      : 'Reset your HP World password';
    const text = `Your verification code is ${code}. It expires in 10 minutes.
If you did not request this, ignore this message.`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
        <div style="font-weight:700;font-size:18px;color:#0B1221">HP World</div>
        <p style="color:#475569">${purpose === 'signup'
          ? 'Thanks for signing up. Enter the code below to verify your email.'
          : 'Use the code below to reset your HP World password.'}</p>
        <div style="font-size:28px;letter-spacing:6px;font-weight:700;color:#0096D6;
                    background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;
                    padding:14px;text-align:center;margin:16px 0">${code}</div>
        <p style="color:#64748b;font-size:12px">This code expires in 10 minutes. If you did not request it, ignore this email.</p>
      </div>`;
    const result = await sendMail({ to: identifier, subject, text, html });
    if (result.ok) return { delivered: true };
    return logDev({ reason: result.reason, error: result.error });
  }

  // TODO: wire Twilio / MSG91 here for SMS delivery. Until then, phone OTPs
  // fall back to the dev console log.
  //   if (channel === 'phone') await twilio.messages.create({ to: '+91'+identifier, body: `HP World OTP: ${code}` });
  return logDev();
}

function generateCode() {
  // 6-digit, zero-padded so "001234" is a valid display.
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}

// Normalize + validate the identifier for a given channel.
// Returns the canonical form (10-digit phone / lowercased email) or null.
function canonicalize(channel, raw) {
  if (channel === 'phone') return normalizePhoneIN(raw);
  if (channel === 'email') return isEmail(raw) ? String(raw).toLowerCase().trim() : null;
  return null;
}

// POST /api/auth/otp/send  body: { identifier, channel, purpose }
async function sendOtp(req, res) {
  const { channel, identifier, purpose } = req.body;
  if (!['phone', 'email'].includes(channel))
    return res.status(400).json({ message: 'Invalid channel' });
  if (!['signup', 'forgot-password'].includes(purpose))
    return res.status(400).json({ message: 'Invalid purpose' });

  const canonical = canonicalize(channel, identifier);
  if (!canonical)
    return res.status(400).json({ message: `Please enter a valid ${channel === 'phone' ? 'Indian phone number' : 'email address'}.` });

  // For signup OTPs we don't want to help attackers probe existing accounts,
  // but we DO want to tell the user if they're about to duplicate an account.
  if (purpose === 'signup') {
    const existing = channel === 'phone'
      ? await User.findOne({ phone: canonical })
      : await User.findOne({ email: canonical });
    if (existing) {
      return res.status(409).json({
        message: `An account with this ${channel} already exists. Try signing in instead.`,
      });
    }
  }
  if (purpose === 'forgot-password' && channel === 'email') {
    // Tell the caller plainly that no account exists — easier UX than the
    // silent "if-registered, we-sent-it" response we used before. Tradeoff:
    // this lets someone probe which emails are registered. Acceptable for
    // this storefront; revisit if the threat model changes.
    const exists = await User.findOne({ email: canonical });
    if (!exists) {
      return res.status(404).json({
        message: 'No account is registered with this email. Please sign up first.',
      });
    }
  }

  const code = generateCode();
  const codeHash = await OtpCode.hashCode(code);

  // One active OTP doc per (identifier, purpose). Re-sending replaces the
  // previous code so admins aren't spammed by multiple codes at once.
  await OtpCode.findOneAndUpdate(
    { identifier: canonical, purpose },
    {
      identifier: canonical,
      channel,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
      verifiedAt: null,
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  const result = await deliverCode({ channel, identifier: canonical, code, purpose });

  // Friendly message that tells the admin exactly why an email didn't go out.
  let message;
  if (result.delivered) {
    message = `Code sent via ${channel}.`;
  } else if (result.reason === 'not-configured') {
    message = `Code generated — SMTP not configured, see server log.`;
  } else if (result.reason === 'send-failed') {
    message = `Email provider rejected the send (${result.error || 'check server log'}). A dev code is visible below in non-production.`;
  } else {
    message = `Code generated — provider not available, see server log.`;
  }

  res.json({
    ok: true,
    message,
    // Only echo the plaintext code when we couldn't actually deliver it AND
    // we're running outside production. This lets dev keep working while
    // making sure a production deploy never leaks the code over the wire.
    devCode:
      result.delivered || process.env.NODE_ENV === 'production' ? undefined : code,
  });
}

// POST /api/auth/otp/verify  body: { identifier, channel, purpose, code }
// Returns a short-lived "verification token" the client then attaches to
// the actual register / reset-password call. The token is a JWT signed with
// JWT_SECRET, embeds the canonical identifier + purpose, and expires fast.
async function verifyOtp(req, res) {
  const { channel, identifier, purpose, code } = req.body;
  const canonical = canonicalize(channel, identifier);
  if (!canonical) return res.status(400).json({ message: 'Invalid identifier.' });

  const doc = await OtpCode.findOne({ identifier: canonical, purpose });
  if (!doc) return res.status(400).json({ message: 'No code requested — click "Send OTP" first.' });
  if (doc.expiresAt < new Date())
    return res.status(400).json({ message: 'Code expired. Please request a new one.' });
  if (doc.attempts >= OTP_MAX_ATTEMPTS)
    return res.status(429).json({ message: 'Too many attempts. Request a new code.' });

  const ok = await doc.matchCode(code);
  doc.attempts += 1;
  if (!ok) {
    await doc.save();
    return res.status(400).json({ message: 'Incorrect code.' });
  }
  doc.verifiedAt = new Date();
  await doc.save();

  const token = jwt.sign(
    { identifier: canonical, channel, purpose, verified: true },
    process.env.JWT_SECRET,
    { expiresIn: VERIFY_TTL }
  );
  res.json({ ok: true, verificationToken: token });
}

// Utility used by register / password-reset controllers to prove the caller
// has completed OTP verification for a specific identifier + purpose.
function requireVerification(token, { expectedIdentifier, expectedPurpose, expectedChannel }) {
  if (!token) throw Object.assign(new Error('Verification token missing.'), { status: 400 });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw Object.assign(new Error('Verification token invalid or expired.'), { status: 400 });
  }
  if (!payload.verified)                         throw Object.assign(new Error('Verification not complete.'), { status: 400 });
  if (payload.purpose !== expectedPurpose)       throw Object.assign(new Error('Verification purpose mismatch.'), { status: 400 });
  if (expectedChannel && payload.channel !== expectedChannel)
    throw Object.assign(new Error('Verification channel mismatch.'), { status: 400 });
  if (payload.identifier !== expectedIdentifier) throw Object.assign(new Error('Verification identifier mismatch.'), { status: 400 });
  return payload;
}

module.exports = { sendOtp, verifyOtp, requireVerification };
