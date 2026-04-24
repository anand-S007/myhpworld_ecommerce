const nodemailer = require('nodemailer');

// Cached transporter so we don't recreate it on every send.
let _transporter = null;
let _configOk = null;

// Reads SMTP credentials from the env. Returns null (and warns once) if any
// required variable is missing, so the app keeps running without crashing —
// OTP emails simply don't go out until you configure them. In development
// that's fine because we also print the code to the console + return it as
// `devCode` in the API response.
function getTransporter() {
  if (_configOk === false) return null;
  if (_transporter) return _transporter;

  const host   = process.env.SMTP_HOST;
  const port   = Number(process.env.SMTP_PORT || 0);
  const user   = process.env.SMTP_USER;
  const pass   = process.env.SMTP_PASS;
  // Secure = true for port 465, false otherwise (STARTTLS on 587 is the default).
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;

  if (!host || !port || !user || !pass) {
    _configOk = false;
    // eslint-disable-next-line no-console
    console.warn(
      '[mailer] SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS not fully set — email delivery disabled.'
    );
    return null;
  }

  _transporter = nodemailer.createTransport({
    host, port, secure, auth: { user, pass },
  });
  _configOk = true;
  return _transporter;
}

// Result shapes:
//   { ok: true }                         → actually delivered
//   { ok: false, reason: 'not-configured' }  → no SMTP env vars
//   { ok: false, reason: 'send-failed', error } → provider rejected
// Callers use the reason to show better messages and logs.
async function sendMail({ to, subject, text, html }) {
  const transporter = getTransporter();
  if (!transporter) return { ok: false, reason: 'not-configured' };
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  try {
    await transporter.sendMail({ from, to, subject, text, html });
    return { ok: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[mailer] send failed:', err.message);
    return { ok: false, reason: 'send-failed', error: err.message };
  }
}

module.exports = { sendMail };
