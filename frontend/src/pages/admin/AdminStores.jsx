import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, X, MapPin, Loader2, Check, AlertCircle, Info, Upload } from 'lucide-react';
import { DAYS, formatHours } from '../../lib/storeHours.js';
import {
  useAdminStores,
  useCreateStore,
  useUpdateStore,
  useDeleteStore,
} from '../../hooks/queries.js';
import { adminUploadImage } from '../../services/api.js';

// Empty store form — matches the shape used by StoreLocator.jsx
const EMPTY = {
  name:    '',       // Store display name, e.g. "HP World Indiranagar"
  address: '',       // Street address
  city:    '',       // City for the city-filter on the Store Locator page
  state:   '',
  pincode: '',       // Pincode used in the /stores/search?pincode= endpoint
  phone:   '',       // Store contact number
  // Structured hours — days are the ISO-ish keys 'mon'…'sun'; open/close
  // are 24-hour "HH:MM" strings. Empty days array means "hours not set".
  hours:   { days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], open: '09:00', close: '21:00' },
  mapLink: '',       // Google Maps URL for "Get Directions" link
  description: '',   // Short blurb shown on the public store detail page
  image:       '',   // Hero image URL. Empty → detail page uses a gradient fallback.
  active:  true,     // Toggle visibility without deleting
};

// ── Shared form helpers ───────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, required, type = 'text', readOnly, hint }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 mb-1 block">{label}</span>
      <input
        type={type}
        required={required}
        readOnly={readOnly}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-10 px-3 rounded-lg border outline-none text-sm transition-colors ${
          readOnly
            ? 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
            : 'border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10'
        }`}
      />
      {hint && <span className="block mt-1 text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

// StoreImageField — upload OR paste a URL for the store's hero photo. Only
// stores that save an image show the hero on the public detail page; empty
// leaves the detail page's gradient fallback in place.
function StoreImageField({ value, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    setErr('');
    setUploading(true);
    try {
      const { url } = await adminUploadImage(file);
      onChange(url);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">Store image (optional)</div>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-accent-red hover:underline"
          >
            Remove
          </button>
        )}
      </div>

      {value && (
        // `referrerPolicy="no-referrer"` lets us preview images hosted on
        // CDNs that block hotlinking by Referer header — most commonly
        // googleusercontent.com, which otherwise returns a broken image.
        <img
          src={value}
          alt="Store preview"
          referrerPolicy="no-referrer"
          className="w-full aspect-[16/9] object-cover rounded-lg border border-slate-200"
        />
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-hp-blue/10 text-hp-blue text-xs font-semibold hover:bg-hp-blue/20 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Uploading…' : (value ? 'Replace image' : 'Upload image')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="…or paste an image URL"
          className="flex-1 h-9 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-xs"
        />
      </div>

      {err && <div className="text-xs text-accent-red">{err}</div>}
      <div className="text-[11px] text-slate-400">
        Only shown on the public store page if set. Landscape (16:9) PNG / JPG / WebP works best.
      </div>
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 2 }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 mb-1 block">{label}</span>
      <textarea
        value={value || ''}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm resize-none"
      />
    </label>
  );
}

// HoursPicker — day-of-week toggles plus open/close time inputs. Emits the
// structured value the backend now stores in `hours`:
//   { days: string[], open: 'HH:MM', close: 'HH:MM' }
// Accepts legacy string values too (adopts sensible defaults + preserves the
// old string as read-only context) so editing an old store doesn't crash.
function HoursPicker({ value, onChange }) {
  const safe =
    value && typeof value === 'object'
      ? value
      : { days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], open: '09:00', close: '21:00' };
  const days  = Array.isArray(safe.days) ? safe.days : [];
  const open  = safe.open  || '';
  const close = safe.close || '';

  const toggleDay = (key) => {
    const next = days.includes(key) ? days.filter((d) => d !== key) : [...days, key];
    onChange({ ...safe, days: next });
  };
  const selectAll = () =>
    onChange({ ...safe, days: DAYS.map((d) => d.key) });
  const clearAll = () =>
    onChange({ ...safe, days: [] });

  return (
    <div className="rounded-xl border border-slate-200 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">Open on</div>
        <div className="flex items-center gap-2 text-xs">
          <button type="button" onClick={selectAll} className="text-hp-blue hover:underline">All days</button>
          <span className="text-slate-300">·</span>
          <button type="button" onClick={clearAll} className="text-slate-500 hover:underline">Clear</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((d) => {
          const selected = days.includes(d.key);
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => toggleDay(d.key)}
              className={`px-3 h-8 rounded-full border text-xs font-medium transition-colors ${
                selected
                  ? 'bg-hp-blue text-white border-hp-blue'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-hp-blue hover:text-hp-blue'
              }`}
            >
              {d.short}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-slate-600 mb-1 block">Opens at</span>
          <input
            type="time"
            value={open}
            onChange={(e) => onChange({ ...safe, open: e.target.value })}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 mb-1 block">Closes at</span>
          <input
            type="time"
            value={close}
            onChange={(e) => onChange({ ...safe, close: e.target.value })}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
          />
        </label>
      </div>

      <div className="text-[11px] text-slate-400">
        {days.length === 0
          ? 'Pick at least one day — otherwise the store shows as closed.'
          : `Shown on the storefront as: ${formatHours({ days, open, close }) || '—'}`}
      </div>

      {typeof value === 'string' && value && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
          Legacy free-text value: <span className="font-mono">{value}</span>. Save to replace with the structured schedule above.
        </div>
      )}
    </div>
  );
}

// PincodeStatus — tiny inline hint beneath the pincode field. Shows:
//   • spinner while the API is resolving
//   • "City, State" confirmation when resolved (with a checkmark)
//   • a neutral message for not-found / error states
function PincodeStatus({ lookup }) {
  if (lookup.status === 'idle' || !lookup.message) return null;
  const base = 'mt-1 text-xs flex items-center gap-1';
  if (lookup.status === 'loading') {
    return (
      <div className={`${base} text-slate-500`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> {lookup.message}
      </div>
    );
  }
  if (lookup.status === 'ok') {
    return (
      <div className={`${base} text-emerald-600`}>
        <Check className="w-3.5 h-3.5" /> {lookup.message}
      </div>
    );
  }
  return (
    <div className={`${base} text-amber-600`}>
      <AlertCircle className="w-3.5 h-3.5" /> {lookup.message}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-display font-bold text-hp-ink">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminStores() {
  const [modal, setModal] = useState({ open: false, mode: 'add', item: EMPTY });
  const [err, setErr]     = useState('');
  // Pincode lookup feedback: idle | loading | ok | not-found | error
  const [pinLookup, setPinLookup] = useState({ status: 'idle', message: '' });
  // Remembers the last pincode we've already resolved via the API so we don't
  // re-fetch (and stomp the admin's edits) just because the modal re-rendered.
  const lastResolvedPin = useRef('');

  const { data, isLoading: loading } = useAdminStores();
  const stores = Array.isArray(data) ? data : (data?.stores || []);

  const createMutation = useCreateStore();
  const updateMutation = useUpdateStore();
  const deleteMutation = useDeleteStore();
  const saving = createMutation.isPending || updateMutation.isPending;

  const openAdd = () => {
    // Fresh form — no prior pincode, so any 6-digit input triggers a lookup.
    lastResolvedPin.current = '';
    setPinLookup({ status: 'idle', message: '' });
    setModal({ open: true, mode: 'add', item: { ...EMPTY } });
  };
  const openEdit = (item) => {
    // Treat the stored pincode as already-resolved so opening an existing
    // store doesn't overwrite the saved city/state with API values.
    lastResolvedPin.current = item.pincode || '';
    setPinLookup({ status: 'idle', message: '' });
    setModal({ open: true, mode: 'edit', item: { ...item } });
  };
  const closeModal = () => {
    setModal({ open: false, mode: 'add', item: EMPTY });
    setErr('');
    setPinLookup({ status: 'idle', message: '' });
  };
  const setField = (key, val) => setModal((m) => ({ ...m, item: { ...m.item, [key]: val } }));

  // Autofill city + state from the pincode as the admin types. Uses the free
  // public endpoint https://api.postalpincode.in/pincode/{code} which supports
  // CORS, so we can call it directly from the browser.
  //
  // Debounced ~400ms so fast typing doesn't fire a request per keystroke.
  // AbortController cancels any in-flight lookup if the pincode changes again.
  useEffect(() => {
    if (!modal.open) return;
    const pin = (modal.item.pincode || '').trim();
    // Indian pincodes are exactly 6 digits; skip everything else.
    if (!/^\d{6}$/.test(pin)) {
      if (pinLookup.status !== 'idle') setPinLookup({ status: 'idle', message: '' });
      return;
    }
    // Already resolved this pincode — don't re-fetch or stomp the admin's edits.
    if (pin === lastResolvedPin.current) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPinLookup({ status: 'loading', message: 'Looking up pincode…' });
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        const entry = Array.isArray(data) ? data[0] : null;
        const office = entry?.PostOffice?.[0];
        if (entry?.Status === 'Success' && office) {
          // Overwrite city/state with the API result and mark this pincode
          // as resolved so another render doesn't repeat the lookup.
          setModal((m) => ({
            ...m,
            item: { ...m.item, city: office.District, state: office.State },
          }));
          lastResolvedPin.current = pin;
          setPinLookup({
            status: 'ok',
            message: `${office.District}, ${office.State}`,
          });
        } else {
          lastResolvedPin.current = pin; // don't retry a known-bad pincode
          setPinLookup({ status: 'not-found', message: 'No match for that pincode.' });
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
        setPinLookup({ status: 'error', message: 'Lookup failed — fill manually.' });
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // pinLookup.status is intentionally excluded — updating it must not
    // retrigger the effect (would loop).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal.item.pincode, modal.open]);

  const handleSave = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const { item, mode } = modal;
      if (mode === 'add') {
        await createMutation.mutateAsync(item);
      } else {
        await updateMutation.mutateAsync({ id: item._id || item.id, data: item });
      }
      closeModal();
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Save failed.');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete store "${item.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(item._id || item.id);
    } catch {
      alert('Delete failed.');
    }
  };

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-hp-blue" />
          <h1 className="font-display text-2xl font-bold text-hp-ink">Stores</h1>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-full text-sm">
          <Plus className="w-4 h-4" /> Add Store
        </button>
      </div>

      {/* Store cards grid */}
      {!loading && stores.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {stores.map((s) => (
            <div key={s._id || s.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-semibold text-sm text-hp-ink">{s.name}</div>
                  <div className="text-xs text-slate-400">{s.city}{s.state ? `, ${s.state}` : ''}</div>
                </div>
                {/* Active indicator */}
                <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 font-medium ${s.active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                  {s.active !== false ? 'Active' : 'Hidden'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mb-1">{s.address}</div>
              {s.phone && <div className="text-xs text-slate-500">{s.phone}</div>}
              {formatHours(s.hours) && (
                <div className="text-xs text-slate-400 mt-1">{formatHours(s.hours)}</div>
              )}
              {/* Quick edit/delete actions on the card */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button onClick={() => openEdit(s)} className="text-xs text-hp-blue hover:underline font-medium">Edit</button>
                <button onClick={() => handleDelete(s)} className="text-xs text-accent-red hover:underline font-medium">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full stores table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Store Name</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">City</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Pincode</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Phone</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {stores.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                      No stores yet. Click "Add Store" to add a location.
                    </td>
                  </tr>
                )}
                {stores.map((s) => (
                  <tr key={s._id || s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-hp-ink">{s.name}</td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{s.city}</td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs hidden md:table-cell">{s.pincode}</td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{s.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {s.active !== false ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-hp-blue" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-accent-red" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit store modal */}
      {modal.open && (
        <Modal title={modal.mode === 'add' ? 'Add Store' : 'Edit Store'} onClose={closeModal}>
          <form onSubmit={handleSave} className="space-y-3">
            {/* Store display name */}
            <Field label="Store Name *" value={modal.item.name} onChange={(v) => setField('name', v)} required placeholder="e.g. HP World Indiranagar" />
            {/* Full street address */}
            <TextArea label="Address" value={modal.item.address} onChange={(v) => setField('address', v)} placeholder="No. 42, 100 Feet Road, Indiranagar" />

            {/* Instructional banner — admins only need the pincode; city and
                state come from India Post lookup automatically. */}
            <div className="flex items-start gap-2 text-xs text-hp-blue bg-hp-blue/5 border border-hp-blue/20 rounded-lg px-3 py-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Just enter the <strong>pincode</strong>. City and state will fill in automatically from India Post records.
              </span>
            </div>

            {/* Pincode drives city + state. Phone sits beside it so the row
                still lays out nicely on desktop. */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Field
                  label="Pincode *"
                  required
                  value={modal.item.pincode}
                  onChange={(v) => setField('pincode', v.replace(/[^\d]/g, '').slice(0, 6))}
                  placeholder="560038"
                />
                <PincodeStatus lookup={pinLookup} />
              </div>
              <Field label="Phone" value={modal.item.phone} onChange={(v) => setField('phone', v)} placeholder="+91 80 1234 5678" />
            </div>

            {/* City + State — read-only while the pincode lookup succeeded or
                is in progress. If the lookup failed or the pincode is unknown,
                the fields open up so admins can still fill them manually. */}
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="City"
                value={modal.item.city}
                onChange={(v) => setField('city', v)}
                readOnly={pinLookup.status === 'ok' || pinLookup.status === 'loading' || pinLookup.status === 'idle'}
                placeholder="Auto-filled from pincode"
                hint={pinLookup.status === 'not-found' || pinLookup.status === 'error' ? 'Pincode lookup unavailable — enter manually' : 'Auto-filled from pincode'}
              />
              <Field
                label="State"
                value={modal.item.state}
                onChange={(v) => setField('state', v)}
                readOnly={pinLookup.status === 'ok' || pinLookup.status === 'loading' || pinLookup.status === 'idle'}
                placeholder="Auto-filled from pincode"
                hint={pinLookup.status === 'not-found' || pinLookup.status === 'error' ? 'Pincode lookup unavailable — enter manually' : 'Auto-filled from pincode'}
              />
            </div>
            {/* Structured opening-hours picker — days are toggleable chips,
                open/close are time inputs. Output shape matches what
                storeHours.formatHours / isStoreOpen expect on the storefront. */}
            <HoursPicker value={modal.item.hours} onChange={(v) => setField('hours', v)} />
            {/* Google Maps link for "Get Directions" button */}
            <Field label="Google Maps URL" value={modal.item.mapLink} onChange={(v) => setField('mapLink', v)} placeholder="https://maps.google.com/…" />

            {/* Short description — shown on the /stores/:slug detail page. */}
            <TextArea
              label="Description (optional)"
              rows={3}
              value={modal.item.description}
              onChange={(v) => setField('description', v)}
              placeholder="A one-paragraph pitch for this store — services, key brands, highlights."
            />

            {/* Hero image — only shown on the public store page when set. */}
            <StoreImageField
              value={modal.item.image}
              onChange={(v) => setField('image', v)}
            />

            {/* Toggle store visibility */}
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={modal.item.active !== false} onChange={(e) => setField('active', e.target.checked)} className="w-4 h-4" />
              Active (visible on Store Locator)
            </label>

            {err && <div className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg">{err}</div>}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 rounded-full text-sm disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Store'}
              </button>
              <button type="button" onClick={closeModal} className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
