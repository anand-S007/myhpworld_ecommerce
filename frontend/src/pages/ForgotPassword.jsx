import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Check } from 'lucide-react';
import { useSendOtp, useVerifyOtp, useResetPassword } from '../hooks/queries.js';
import { isEmail, passwordIssue } from '../lib/validators.js';
import { useResendTimer } from '../lib/useResendTimer.js';

// Forgot-password is a two-step flow reusing the OTP pipeline:
//   1. Enter email → server sends a 6-digit code (dev: logged to console).
//   2. Enter code + new password → server verifies, swaps the password, done.
// We don't leak whether an email is registered: step 1 always responds ok.
export default function ForgotPassword() {
  const [step, setStep]       = useState(1);
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [devCode, setDevCode] = useState('');
  const [err, setErr]         = useState('');
  const [done, setDone]       = useState(false);

  const sendOtp     = useSendOtp();
  const verifyOtpMu = useVerifyOtp();
  const resetMu     = useResetPassword();
  const navigate    = useNavigate();
  // Shared 30-second countdown for the Resend button in step 2.
  const resendTimer = useResendTimer(30);

  const canonical = email.trim().toLowerCase();

  // Used both by step 1 "Send code" and the in-step-2 "Resend OTP" button.
  // Server upserts the OTP row per (identifier, purpose), so a resend
  // invalidates the previous code automatically.
  const requestCode = async (e) => {
    e?.preventDefault?.();
    setErr('');
    if (!isEmail(canonical)) { setErr('Enter a valid email.'); return; }
    try {
      const res = await sendOtp.mutateAsync({
        channel: 'email',
        identifier: canonical,
        purpose: 'forgot-password',
      });
      setDevCode(res.devCode || '');
      setOtp('');
      resendTimer.start();
      setStep(2);
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Could not send code.');
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setErr('');
    if (!/^\d{6}$/.test(otp)) { setErr('Enter the 6-digit code.'); return; }
    const pIssue = passwordIssue(newPassword);
    if (pIssue) { setErr(`Weak password — ${pIssue}`); return; }
    try {
      // Verify OTP first, then reset with the token.
      const v = await verifyOtpMu.mutateAsync({
        channel: 'email',
        identifier: canonical,
        purpose: 'forgot-password',
        code: otp,
      });
      await resetMu.mutateAsync({
        email: canonical,
        newPassword,
        resetToken: v.verificationToken,
      });
      setDone(true);
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Could not reset password.');
    }
  };

  return (
    <div className="min-h-[70vh] grid place-items-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-8 shadow-soft">
        <h1 className="font-display text-3xl font-bold text-hp-ink">Reset password</h1>
        <p className="text-slate-500 text-sm mt-2">We'll send a verification code to your registered email.</p>

        {done ? (
          <div className="mt-6 space-y-4">
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <Check className="w-4 h-4" /> Password updated. Please sign in with your new password.
            </div>
            <button onClick={() => navigate('/login')} className="btn-primary w-full py-3 rounded-full">
              Go to sign in
            </button>
          </div>
        ) : step === 1 ? (
          <form onSubmit={requestCode} className="mt-6 space-y-4">
            <label className="block text-sm">
              <div className="text-slate-600 mb-1">Email</div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none"
              />
            </label>
            {err && <Inline err={err} />}
            <button type="submit" disabled={sendOtp.isPending}
              className="btn-primary w-full py-3 rounded-full disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {sendOtp.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Send code
            </button>
          </form>
        ) : (
          <form onSubmit={submitReset} className="mt-6 space-y-4">
            <div className="text-sm text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Code sent to <span className="font-semibold text-hp-ink">{canonical}</span>.</span>
              <button
                type="button"
                onClick={requestCode}
                disabled={sendOtp.isPending || resendTimer.active}
                className="text-hp-blue hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
              >
                {resendTimer.active
                  ? `Resend in ${resendTimer.remaining}s`
                  : sendOtp.isPending
                  ? 'Sending…'
                  : 'Resend OTP'}
              </button>
              <span className="text-slate-300">·</span>
              <button type="button" onClick={() => { setStep(1); setOtp(''); setNewPassword(''); resendTimer.reset(); }} className="text-hp-blue hover:underline">Change email</button>
            </div>
            {devCode && (
              <div className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-2">
                <strong>Dev mode:</strong> your code is <span className="font-mono">{devCode}</span>. In production this is sent via email.
              </div>
            )}
            <label className="block text-sm">
              <div className="text-slate-600 mb-1">6-digit code</div>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none"
              />
            </label>
            <label className="block text-sm">
              <div className="text-slate-600 mb-1">New password</div>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none"
              />
              <div className="text-[11px] text-slate-400 mt-1">
                Min 6 characters · include a letter, a number and a special character.
              </div>
            </label>
            {err && <Inline err={err} />}
            <button type="submit" disabled={verifyOtpMu.isPending || resetMu.isPending}
              className="btn-primary w-full py-3 rounded-full disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {(verifyOtpMu.isPending || resetMu.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
              Update password
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-500">
          Remembered it?{' '}
          <Link to="/login" className="text-hp-blue font-semibold">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}

function Inline({ err }) {
  return <div className="text-sm text-accent-red bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</div>;
}
