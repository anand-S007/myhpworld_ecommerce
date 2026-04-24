import { useEffect, useState } from 'react';
import { X, MessageCircle } from 'lucide-react';

// EnquiryModal — shown to NOT-signed-in visitors when they click any
// "Enquire on WhatsApp" button. Collects their name (required) + email
// + phone (both optional) so the company team can respond without having
// to ask "who's this?" first.
//
// Signed-in users never see this modal — `EnquiryProvider` detects their
// session and uses the profile info directly.
export default function EnquiryModal({ ctx, onSubmit, onClose }) {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr]     = useState('');

  // Esc closes the modal; fire-and-forget listener scoped to this mount.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const title = ctx?.kind === 'product'
    ? `Enquire about ${ctx?.product?.name || 'this product'}`
    : ctx?.kind === 'appointment'
      ? `Book a visit to ${ctx?.store?.name || 'this store'}`
      : 'Send us an enquiry';

  const subtitle = ctx?.kind === 'product'
    ? 'Leave your details and we\'ll continue the chat on WhatsApp with availability and offers.'
    : ctx?.kind === 'appointment'
      ? 'Share your details and we\'ll confirm a convenient demo time on WhatsApp.'
      : 'Leave your details and we\'ll start the conversation on WhatsApp.';

  const submit = (e) => {
    e.preventDefault();
    setErr('');
    const trimmedName = name.trim();
    if (!trimmedName)                                    { setErr('Please enter your name.'); return; }
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
      setErr('Email looks invalid — leave it blank if you\'re not sure.'); return;
    }
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !/^\d[\d\s+\-().]*\d$/.test(trimmedPhone)) {
      setErr('Phone number looks invalid — leave it blank if you\'re not sure.'); return;
    }
    onSubmit({ name: trimmedName, email: trimmedEmail, phone: trimmedPhone });
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 text-[#25D366] grid place-items-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-hp-ink leading-tight truncate">{title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <Field
            label="Your name"
            required
            value={name}
            onChange={setName}
            placeholder="e.g. Aryan Menon"
            autoFocus
          />
          <Field
            label="Email (optional)"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Field
            label="Mobile number (optional)"
            type="tel"
            value={phone}
            onChange={setPhone}
            placeholder="e.g. +91 99999 99999"
            autoComplete="tel"
          />

          {err && (
            <div className="text-sm text-accent-red bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {err}
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            We'll use these details only to respond to this enquiry — no marketing, no spam.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-full bg-[#25D366] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#1EBE5A] transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> Continue on WhatsApp
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, type = 'text', value, onChange, placeholder, autoComplete, autoFocus }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 mb-1 block">
        {label}{required && <span className="text-accent-red ml-0.5">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required={required}
        className="w-full h-11 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
      />
    </label>
  );
}
