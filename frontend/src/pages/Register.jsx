import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Check } from 'lucide-react';
import { useRegister, useSendOtp, useVerifyOtp } from '../hooks/queries.js';
import { isEmail, normalizePhoneIN, passwordIssue } from '../lib/validators.js';
import { useResendTimer } from '../lib/useResendTimer.js';
import { useUserStore } from '../store/userStore.js';

// Registration is a three-step flow so the user can't create an account
// against a phone number they don't actually own:
//   1. Enter phone  → server sends a 6-digit OTP (dev: logged to console).
//   2. Enter the code → server returns a short-lived verification token.
//   3. Fill the remaining details → server accepts the signup only when the
//      verification token matches the phone on the request.
export default function Register() {
  const [step, setStep]       = useState(1);
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [err, setErr]         = useState('');
  // Server-returned dev code. Shown inline in development so you can
  // complete the flow without an SMS provider. Undefined in production.
  const [devCode, setDevCode] = useState('');
  const navigate = useNavigate();

  const sendOtp     = useSendOtp();
  const verifyOtpMu = useVerifyOtp();
  const register    = useRegister();
  const userLogin   = useUserStore((s) => s.login);
  // Countdown for the Resend OTP button — locked for 30 seconds after a
  // successful send so admins / customers don't spam our provider.
  const resendTimer = useResendTimer(30);

  // Canonicalise as the user types — we validate against the 10-digit form.
  const normalizedPhone = normalizePhoneIN(phone);

  // Step 1 (and resend) → request OTP. Resetting `otp` when we re-request
  // makes sure the user types the latest code; the server upserts the OTP
  // doc per (identifier, purpose), so the old code is invalidated the moment
  // the new one lands.
  const requestOtp = async (e) => {
    e?.preventDefault?.();
    setErr('');
    if (!normalizedPhone) { setErr('Enter a valid 10-digit Indian mobile number.'); return; }
    try {
      const res = await sendOtp.mutateAsync({
        channel: 'phone',
        identifier: normalizedPhone,
        purpose: 'signup',
      });
      setDevCode(res.devCode || '');
      setOtp('');
      resendTimer.start();
      setStep(2);
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Could not send code.');
    }
  };

  // Step 2 → verify OTP, receive verification token
  const confirmOtp = async (e) => {
    e.preventDefault();
    setErr('');
    if (!/^\d{6}$/.test(otp)) { setErr('Enter the 6-digit code.'); return; }
    try {
      const res = await verifyOtpMu.mutateAsync({
        channel: 'phone',
        identifier: normalizedPhone,
        purpose: 'signup',
        code: otp,
      });
      setVerifyToken(res.verificationToken);
      setStep(3);
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Invalid or expired code.');
    }
  };

  // Step 3 → create account
  const createAccount = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.name.trim())          { setErr('Please enter your name.'); return; }
    if (!isEmail(form.email))       { setErr('Enter a valid email address.'); return; }
    const pIssue = passwordIssue(form.password);
    if (pIssue)                     { setErr(`Weak password — ${pIssue}`); return; }
    try {
      const data = await register.mutateAsync({
        ...form,
        phone: normalizedPhone,
        phoneVerificationToken: verifyToken,
      });
      if (!data.user) {
        setErr('Account created but the server returned no profile — please sign in.');
        navigate('/login');
        return;
      }
      userLogin(data.user, data.token);
      // replace so pressing Back after signing up doesn't return to /register
      navigate('/account', { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Unable to create account.');
    }
  };

  return (
    <div className="min-h-[70vh] grid place-items-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-8 shadow-soft">
        <h1 className="font-display text-3xl font-bold text-hp-ink">Create your account</h1>

        <Stepper step={step} />

        {step === 1 && (
          <form onSubmit={requestOtp} className="mt-6 space-y-4">
            <Input
              label="Mobile number"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="10-digit number starting with 6/7/8/9"
              autoComplete="tel"
            />
            {err && <Inline err={err} />}
            <button type="submit" disabled={sendOtp.isPending}
              className="btn-primary w-full py-3 rounded-full disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {sendOtp.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Send OTP
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={confirmOtp} className="mt-6 space-y-4">
            <div className="text-sm text-slate-500">
              We sent a 6-digit code to <span className="font-semibold text-hp-ink">+91 {normalizedPhone}</span>.
              {' '}
              <button type="button" onClick={() => { setStep(1); setOtp(''); }} className="text-hp-blue hover:underline">Change number</button>
            </div>
            {devCode && (
              <div className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-2">
                <strong>Dev mode:</strong> your code is <span className="font-mono">{devCode}</span>. In production this is sent via SMS.
              </div>
            )}
            <Input
              label="6-digit code"
              value={otp}
              onChange={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
            />
            {err && <Inline err={err} />}
            <div className="flex gap-2">
              <button type="submit" disabled={verifyOtpMu.isPending}
                className="btn-primary flex-1 py-3 rounded-full disabled:opacity-60 inline-flex items-center justify-center gap-2">
                {verifyOtpMu.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Verify
              </button>
              <button
                type="button"
                onClick={requestOtp}
                disabled={sendOtp.isPending || resendTimer.active}
                className="flex-1 py-3 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60 disabled:hover:bg-transparent"
              >
                {resendTimer.active
                  ? `Resend in ${resendTimer.remaining}s`
                  : sendOtp.isPending
                  ? 'Sending…'
                  : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={createAccount} className="mt-6 space-y-4">
            <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <Check className="w-4 h-4" /> Phone <span className="font-mono">+91 {normalizedPhone}</span> verified.
            </div>
            <Input label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })}
              hint="Min 6 characters · include a letter, a number and a special character."
            />
            {err && <Inline err={err} />}
            <button type="submit" disabled={register.isPending}
              className="btn-primary w-full py-3 rounded-full disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {register.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create account
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-hp-blue font-semibold">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

function Stepper({ step }) {
  return (
    <div className="flex items-center gap-2 mt-5 text-[11px] uppercase tracking-widest">
      {['Phone', 'Verify', 'Details'].map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} className="flex items-center gap-2">
            <span className={`w-6 h-6 grid place-items-center rounded-full text-[11px] ${
              done ? 'bg-emerald-100 text-emerald-700'
                   : active ? 'bg-hp-blue text-white'
                            : 'bg-slate-100 text-slate-400'
            }`}>
              {done ? <Check className="w-3 h-3" /> : n}
            </span>
            <span className={active ? 'text-hp-ink font-semibold' : 'text-slate-400'}>{label}</span>
            {i < 2 && <span className="w-4 h-px bg-slate-200" />}
          </div>
        );
      })}
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder, autoComplete, hint }) {
  return (
    <label className="block text-sm">
      <div className="text-slate-600 mb-1">{label}</div>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none"
      />
      {hint && <div className="text-[11px] text-slate-400 mt-1">{hint}</div>}
    </label>
  );
}

function Inline({ err }) {
  return <div className="text-sm text-accent-red bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</div>;
}
