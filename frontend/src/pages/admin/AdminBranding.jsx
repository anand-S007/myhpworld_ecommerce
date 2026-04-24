import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Upload, Save, Loader2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAdminSettings, useUpdateSettings } from '../../hooks/queries.js';
import { adminUploadImage } from '../../services/api.js';

// AdminBranding — site-wide logo / brand name / tagline settings. Everything
// shown by the shared <Logo> component (Navbar, Footer, admin sidebar) reads
// from here. Upload replaces the in-memory logoUrl so the preview updates
// immediately; the server value only persists when "Save changes" is clicked.
export default function AdminBranding() {
  const { data, isLoading } = useAdminSettings();
  const save = useUpdateSettings();
  const [form, setForm]       = useState({ logoUrl: '', faviconUrl: '', brandName: '', tagline: '' });
  const [uploading, setUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [err, setErr]         = useState('');
  const [msg, setMsg]         = useState('');
  const fileRef        = useRef(null);
  const faviconFileRef = useRef(null);

  // Seed the form once the current settings arrive
  useEffect(() => {
    if (!isLoading && data) {
      setForm({
        logoUrl:    data.logoUrl    || '',
        faviconUrl: data.faviconUrl || '',
        brandName:  data.brandName  || '',
        tagline:    data.tagline    || '',
      });
    }
  }, [data, isLoading]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleUpload = async (file) => {
    if (!file) return;
    setErr(''); setMsg('');
    setUploading(true);
    try {
      const { url } = await adminUploadImage(file);
      setField('logoUrl', url);
      setMsg('Logo uploaded. Click "Save changes" to apply it site-wide.');
    } catch (e) {
      setErr(e?.response?.data?.message || 'Upload failed. Try a PNG, JPG, or SVG under 5 MB.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFaviconUpload = async (file) => {
    if (!file) return;
    setErr(''); setMsg('');
    setFaviconUploading(true);
    try {
      const { url } = await adminUploadImage(file);
      setField('faviconUrl', url);
      setMsg('Favicon uploaded. Click "Save changes" to apply it on every tab.');
    } catch (e) {
      setErr(e?.response?.data?.message || 'Upload failed. Try a PNG, SVG, or ICO under 5 MB.');
    } finally {
      setFaviconUploading(false);
      if (faviconFileRef.current) faviconFileRef.current.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    try {
      await save.mutateAsync(form);
      setMsg('Branding updated. Reload any open storefront tab to see the change.');
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Save failed.');
    }
  };

  const clearLogo = () => {
    setField('logoUrl', '');
    setMsg('Logo cleared. Save to apply — the default "hp" badge will be used.');
  };

  const clearFavicon = () => {
    setField('faviconUrl', '');
    setMsg('Favicon cleared. Save to fall back to the built-in /favicon.svg.');
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-6">
        <ImageIcon className="w-5 h-5 text-hp-blue" />
        <h1 className="font-display text-2xl font-bold text-hp-ink">Branding</h1>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-green-50 text-green-700 inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {msg}
        </div>
      )}
      {err && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-accent-red inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {err}
        </div>
      )}

      {isLoading ? (
        <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Settings form ── */}
          <form onSubmit={handleSave} className="lg:col-span-3 bg-white rounded-xl shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-hp-ink">Site logo</h2>

            {/* Current logo preview + upload */}
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="w-20 h-20 rounded-lg bg-white border border-slate-200 grid place-items-center overflow-hidden shrink-0">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Current logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-hp-blue grid place-items-center font-display font-extrabold text-white text-lg">
                    hp
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-hp-ink">
                  {form.logoUrl ? 'Custom logo' : 'Default badge'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 break-all">
                  {form.logoUrl || 'No logo uploaded — the stylised "hp" badge is used as a fallback.'}
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-hp-blue/10 text-hp-blue text-xs font-semibold hover:bg-hp-blue/20 disabled:opacity-60"
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploading ? 'Uploading…' : (form.logoUrl ? 'Replace logo' : 'Upload logo')}
                  </button>
                  {form.logoUrl && (
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-accent-red hover:bg-accent-red/10 text-xs font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files?.[0])}
                />
              </div>
            </div>

            {/* Logo URL (editable for advanced users / CDN-hosted logos) */}
            <label className="block text-sm">
              <span className="text-slate-600 mb-1 block">Or paste a logo URL</span>
              {/* Use `type="text"` instead of `type="url"`. Uploaded logos are
                  stored as relative paths like `/uploads/logo-abc.png`, which
                  the native URL validator rejects even though they're perfectly
                  valid for our <img src> usage. */}
              <input
                type="text"
                value={form.logoUrl || ''}
                onChange={(e) => setField('logoUrl', e.target.value)}
                placeholder="https://… or /uploads/…"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                PNG, JPG, WebP, or SVG. Uploads return a relative <code>/uploads/…</code> path, which is fine. Tall / square logos work best; very wide logos are capped at 180px.
              </span>
            </label>

            {/* ── Favicon ─────────────────────────────────────────────── */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h2 className="font-semibold text-hp-ink">Favicon (browser tab icon)</h2>
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 grid place-items-center overflow-hidden shrink-0">
                  {form.faviconUrl ? (
                    <img src={form.faviconUrl} alt="Current favicon" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <img src="/favicon.svg" alt="Default favicon" className="max-w-full max-h-full object-contain opacity-80" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-hp-ink">
                    {form.faviconUrl ? 'Custom favicon' : 'Default favicon'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 break-all">
                    {form.faviconUrl || 'No custom favicon — the built-in /favicon.svg is used.'}
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => faviconFileRef.current?.click()}
                      disabled={faviconUploading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-hp-blue/10 text-hp-blue text-xs font-semibold hover:bg-hp-blue/20 disabled:opacity-60"
                    >
                      {faviconUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {faviconUploading ? 'Uploading…' : (form.faviconUrl ? 'Replace favicon' : 'Upload favicon')}
                    </button>
                    {form.faviconUrl && (
                      <button
                        type="button"
                        onClick={clearFavicon}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-accent-red hover:bg-accent-red/10 text-xs font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={faviconFileRef}
                    type="file"
                    accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/webp"
                    className="hidden"
                    onChange={(e) => handleFaviconUpload(e.target.files?.[0])}
                  />
                </div>
              </div>
              <label className="block text-sm">
                <span className="text-slate-600 mb-1 block">Or paste a favicon URL</span>
                <input
                  type="text"
                  value={form.faviconUrl || ''}
                  onChange={(e) => setField('faviconUrl', e.target.value)}
                  placeholder="https://… or /uploads/…"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  SVG scales best across tabs and high-DPI screens. A square PNG (32×32 or 64×64) or ICO also works.
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h2 className="font-semibold text-hp-ink">Brand text</h2>
              <label className="block text-sm">
                <span className="text-slate-600 mb-1 block">Brand name</span>
                <input
                  value={form.brandName}
                  onChange={(e) => setField('brandName', e.target.value)}
                  placeholder="HP World"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Shown next to the badge when no custom logo is uploaded.
                </span>
              </label>
              <label className="block text-sm">
                <span className="text-slate-600 mb-1 block">Tagline</span>
                <input
                  value={form.tagline}
                  onChange={(e) => setField('tagline', e.target.value)}
                  placeholder="myhpworld.com"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={save.isPending}
              className="btn-primary w-full py-3 rounded-full flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {save.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </form>

          {/* ── Live preview (how the logo renders in each context) ── */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-semibold text-hp-ink">Live preview</h2>

            <PreviewCard label="Storefront navbar" bg="bg-white" border>
              <LogoPreview form={form} variant="light" size="md" />
            </PreviewCard>

            <PreviewCard label="Site footer" bg="bg-[#05080F]">
              <LogoPreview form={form} variant="dark" size="md" />
            </PreviewCard>

            <PreviewCard label="Admin sidebar" bg="bg-hp-navy">
              <LogoPreview form={form} variant="dark" size="sm" nameOverride="HP World Admin" tagline="Control Panel" />
            </PreviewCard>

            <PreviewCard label="Browser tab (favicon)" bg="bg-white" border>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded border border-slate-200 bg-slate-50 grid place-items-center overflow-hidden">
                  <img
                    src={form.faviconUrl || '/favicon.svg'}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-hp-ink truncate">{form.brandName || 'HP World'}</div>
                  <div className="text-[11px] text-slate-400 truncate">{form.tagline || 'myhpworld.com'}</div>
                </div>
              </div>
            </PreviewCard>

            <p className="text-xs text-slate-500">
              The preview reflects unsaved changes. Click "Save changes" to apply site-wide.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function PreviewCard({ label, bg, border, children }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-slate-400 mb-1.5">{label}</div>
      <div className={`${bg} ${border ? 'border border-slate-200' : ''} rounded-xl p-4`}>
        {children}
      </div>
    </div>
  );
}

// Minimal standalone renderer (no queries) that mirrors the shared <Logo>
// output but reads directly from the form so the preview tracks unsaved
// edits. Keeps the actual Navbar/Footer untouched until Save is clicked.
function LogoPreview({ form, variant, size, nameOverride, tagline }) {
  const brandName = nameOverride || form.brandName || 'HP World';
  const sub       = tagline ?? form.tagline;
  const dim       = size === 'sm' ? 'w-9 h-9 text-base' : 'w-10 h-10 text-lg';
  const imgH      = size === 'sm' ? 'h-9' : 'h-10';
  const text      = variant === 'dark' ? 'text-white' : 'text-hp-navy';
  const subColor  = variant === 'dark' ? 'text-white/60' : 'text-slate-500';

  return (
    <div className="flex items-center gap-2">
      {form.logoUrl ? (
        <img
          src={form.logoUrl}
          alt={brandName}
          className={`${imgH} w-auto max-w-[180px] object-contain`}
        />
      ) : (
        <>
          <div className={`${dim} rounded-lg bg-hp-blue grid place-items-center font-display font-extrabold text-white shrink-0`}>
            hp
          </div>
          <div className="leading-tight min-w-0">
            <div className={`font-display font-extrabold ${text} ${size === 'sm' ? 'text-sm' : 'text-lg'}`}>
              {brandName}
            </div>
            {sub && (
              <div className={`text-[10px] tracking-widest uppercase ${subColor}`}>
                {sub}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
