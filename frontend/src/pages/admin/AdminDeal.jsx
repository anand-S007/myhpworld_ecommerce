import { useEffect, useMemo, useState } from 'react';
import {
  Flame, Plus, Pencil, Trash2, X, Search, Loader2, Save, Eye, EyeOff,
  Clock, Laptop,
} from 'lucide-react';
import {
  useAdminDeals, useCreateDeal, useUpdateDeal, useDeleteDeal,
  useAdminProducts,
} from '../../hooks/queries.js';

// Multiple deals, each capped at 24 hours. This page lists every deal as a
// visual card (image + price + live countdown) instead of a table row so
// the admin can eyeball what's active at a glance.
const MAX_DEAL_HOURS = 24;
const msIn = (h) => h * 60 * 60 * 1000;

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time, not ISO.
const toInputDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromInputDate = (v) => (v ? new Date(v).toISOString() : null);

// Human countdown label — re-rendered on a 30s tick by the list so each
// card's status stays fresh without the admin refreshing.
function formatTimeLeft(endDate) {
  if (!endDate) return { label: 'No end date', tone: 'neutral' };
  const ms = new Date(endDate).getTime() - Date.now();
  if (ms <= 0) return { label: 'Expired', tone: 'expired' };
  const hours   = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const label = hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
  return { label, tone: hours < 1 ? 'urgent' : 'ok' };
}

const TONE_CLASSES = {
  ok:      'bg-accent-mint/10 text-accent-mint',
  urgent:  'bg-accent-amber/20 text-accent-amber',
  expired: 'bg-accent-red/10 text-accent-red',
  neutral: 'bg-slate-100 text-slate-500',
};

// Derive deal price + savings from MRP and discount %.
function computeFromDiscount(mrp, discount) {
  const m = Number(mrp) || 0;
  const d = Math.min(Math.max(Number(discount) || 0, 0), 100);
  const price = m > 0 ? Math.round(m * (1 - d / 100)) : 0;
  return { price, savings: Math.max(0, m - price) };
}

const EMPTY = {
  product:  '',
  series:   '',
  name:     '',
  price:    '',
  mrp:      '',
  savings:  '',
  discount: '',
  endDate:  '',
  perks:    '',
  active:   true,
};

export default function AdminDeal() {
  const [modal, setModal] = useState({ open: false, mode: 'add', item: EMPTY });
  const [err, setErr]     = useState('');
  // Ticking clock used only to re-render the "time left" pills on each
  // card; nothing else depends on it.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data, isLoading } = useAdminDeals();
  const deals = Array.isArray(data) ? data : [];

  const createMutation = useCreateDeal();
  const updateMutation = useUpdateDeal();
  const deleteMutation = useDeleteDeal();
  const saving = createMutation.isPending || updateMutation.isPending;

  const activeCount  = deals.filter((d) => d.active && new Date(d.endDate).getTime() > Date.now()).length;
  const hiddenCount  = deals.filter((d) => !d.active).length;
  const expiredCount = deals.filter((d) => d.active && new Date(d.endDate).getTime() <= Date.now()).length;

  const openAdd = () =>
    setModal({
      open: true,
      mode: 'add',
      item: { ...EMPTY, endDate: toInputDate(Date.now() + msIn(MAX_DEAL_HOURS)) },
    });
  const openEdit = (d) => setModal({
    open: true,
    mode: 'edit',
    item: {
      ...EMPTY,
      ...d,
      product:  d.product?._id || d.product || '',
      series:   d.series || d.product?.series || '',
      name:     d.name   || d.product?.name   || '',
      endDate:  toInputDate(d.endDate),
    },
  });
  const closeModal = () => { setModal({ open: false, mode: 'add', item: EMPTY }); setErr(''); };
  const setField = (k, v) => setModal((m) => ({ ...m, item: { ...m.item, [k]: v } }));

  const handleSave = async (e) => {
    e.preventDefault();
    setErr('');
    const { item, mode } = modal;
    if (!item.product) { setErr('Please pick a product.'); return; }
    if (!Number(item.mrp)) { setErr('MRP is required.'); return; }
    if (!item.endDate) { setErr('Pick an end date within the next 24 hours.'); return; }
    const end = new Date(item.endDate).getTime();
    if (!Number.isFinite(end) || end <= Date.now()) {
      setErr('End date must be in the future.'); return;
    }
    if (end > Date.now() + msIn(MAX_DEAL_HOURS)) {
      setErr(`Deals can run for at most ${MAX_DEAL_HOURS} hours.`); return;
    }
    const { price, savings } = computeFromDiscount(item.mrp, item.discount);
    const payload = {
      product:  item.product,
      series:   item.series,
      name:     item.name,
      price,
      mrp:      Number(item.mrp)      || 0,
      savings,
      discount: Number(item.discount) || 0,
      endDate:  fromInputDate(item.endDate),
      perks:    item.perks || '',
      active:   !!item.active,
    };
    try {
      if (mode === 'add') await createMutation.mutateAsync(payload);
      else                await updateMutation.mutateAsync({ id: item._id, data: payload });
      closeModal();
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Save failed.');
    }
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`Delete deal "${d.name || d.product?.name || 'untitled'}"? This can't be undone.`)) return;
    try { await deleteMutation.mutateAsync(d._id); }
    catch { alert('Delete failed.'); }
  };

  // Inline visibility toggle — PUT with just { active } keeps the other
  // fields untouched and skips the endDate validator on the backend.
  const toggleVisibility = async (d) => {
    try { await updateMutation.mutateAsync({ id: d._id, data: { active: !d.active } }); }
    catch { alert('Could not change visibility.'); }
  };

  return (
    <>
      {/* Header + summary chips */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-accent-red" />
          <h1 className="font-display text-2xl font-bold text-hp-ink">Deals of the Day</h1>
          {!isLoading && (
            <span className="text-sm text-slate-400 ml-1">({deals.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeCount > 0 && (
            <span className="text-xs bg-accent-mint/10 text-accent-mint px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">
              <Eye className="w-3 h-3" /> {activeCount} live
            </span>
          )}
          {expiredCount > 0 && (
            <span className="text-xs bg-accent-red/10 text-accent-red px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {expiredCount} expired
            </span>
          )}
          {hiddenCount > 0 && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">
              <EyeOff className="w-3 h-3" /> {hiddenCount} hidden
            </span>
          )}
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-full text-sm ml-1">
            <Plus className="w-4 h-4" /> Add Deal
          </button>
        </div>
      </div>

      {/* Card grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-80 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Flame className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="font-semibold text-hp-ink mt-4">No deals yet</div>
          <p className="text-sm text-slate-500 mt-1">
            Click "Add Deal" to feature a product on the homepage for up to 24 hours.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {deals.map((d) => (
            <DealCard
              key={d._id}
              deal={d}
              onEdit={() => openEdit(d)}
              onDelete={() => handleDelete(d)}
              onToggle={() => toggleVisibility(d)}
              busy={deleteMutation.isPending || updateMutation.isPending}
            />
          ))}
        </div>
      )}

      {modal.open && (
        <DealModal
          mode={modal.mode}
          item={modal.item}
          err={err}
          saving={saving}
          onFieldChange={setField}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </>
  );
}

// ─── Card (the "proper UI") ──────────────────────────────────────────────────

function DealCard({ deal, onEdit, onDelete, onToggle, busy }) {
  const p   = deal.product || {};
  const img = (p.images || []).find(Boolean) || p.imageUrl;
  const { label, tone } = formatTimeLeft(deal.endDate);
  const isExpired = tone === 'expired';

  return (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col border ${
      isExpired ? 'border-accent-red/20 opacity-75' : 'border-slate-100'
    }`}>
      {/* Image + floating badges */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 grid place-items-center overflow-hidden">
        {img ? (
          <img src={img} alt={deal.name || p.name} className="w-4/5 h-4/5 object-contain" />
        ) : (
          <Laptop className="w-16 h-16 text-slate-300" />
        )}
        {deal.discount > 0 && (
          <span className="absolute top-3 left-3 bg-accent-red text-white text-xs font-bold px-2 py-1 rounded">
            -{deal.discount}%
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          title={deal.active ? 'Hide from storefront' : 'Show on storefront'}
          className={`absolute top-3 right-3 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
            deal.active
              ? 'bg-accent-mint text-white hover:bg-accent-mint/90'
              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
          }`}
        >
          {deal.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {deal.active ? 'Visible' : 'Hidden'}
        </button>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="text-[11px] uppercase tracking-widest text-slate-400">
          {deal.series || p.series}
        </div>
        <h3 className="font-semibold text-hp-ink mt-1 line-clamp-2">
          {deal.name || p.name || '(untitled)'}
        </h3>

        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <div className="font-display font-bold text-hp-ink text-lg">
            ₹{Number(deal.price || 0).toLocaleString('en-IN')}
          </div>
          {Number(deal.mrp) > Number(deal.price) && (
            <div className="text-slate-400 text-sm line-through">
              ₹{Number(deal.mrp).toLocaleString('en-IN')}
            </div>
          )}
        </div>

        <div className={`mt-3 inline-flex items-center gap-1 self-start text-[11px] font-medium px-2 py-0.5 rounded ${TONE_CLASSES[tone]}`}>
          <Clock className="w-3 h-3" /> {label}
        </div>

        {/* Actions */}
        <div className="mt-auto pt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 py-2 rounded-full border border-slate-200 text-slate-700 hover:border-hp-blue hover:text-hp-blue text-xs font-medium inline-flex items-center justify-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            title="Delete this deal"
            className="w-9 h-9 rounded-full border border-slate-200 text-slate-500 hover:border-accent-red hover:text-accent-red grid place-items-center disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal (add/edit) ────────────────────────────────────────────────────────

function DealModal({ mode, item, err, saving, onFieldChange, onSave, onClose }) {
  const applyDiscount = (nextMrp, nextDiscount) => {
    const { price, savings } = computeFromDiscount(nextMrp, nextDiscount);
    onFieldChange('mrp',      nextMrp);
    onFieldChange('discount', nextDiscount);
    onFieldChange('price',    price);
    onFieldChange('savings',  savings);
  };

  const selectProduct = (p) => {
    const pickedMrp = p.mrp || p.price || '';
    const { price, savings } = computeFromDiscount(pickedMrp, item.discount);
    onFieldChange('product', p._id || p.id);
    onFieldChange('series',  p.series || '');
    onFieldChange('name',    p.name   || '');
    onFieldChange('mrp',     pickedMrp);
    onFieldChange('price',   price);
    onFieldChange('savings', savings);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
            <h2 className="font-display font-bold text-hp-ink">
              {mode === 'add' ? 'Add Deal' : 'Edit Deal'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={onSave} className="px-6 py-4 space-y-4">
            <ProductPickerSection selected={item} onPick={selectProduct} />

            {/* MRP + discount drive price + savings */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="MRP (₹) *" type="number" min="0" value={item.mrp}
                     onChange={(v) => applyDiscount(v, item.discount)} />
              <Field label="Discount %" type="number" min="0" max="100" value={item.discount}
                     onChange={(v) => applyDiscount(item.mrp, v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField
                label="Deal price (₹)"
                value={item.price ? `₹${Number(item.price).toLocaleString('en-IN')}` : '—'}
                hint="Auto = MRP × (1 − discount%)"
              />
              <ReadOnlyField
                label="Savings (₹)"
                value={item.savings ? `₹${Number(item.savings).toLocaleString('en-IN')}` : '—'}
                hint="Auto = MRP − deal price"
              />
            </div>

            {/* 24h-capped end date */}
            <label className="block text-sm">
              <span className="text-slate-600 mb-1 block">Deal end date & time *</span>
              <input
                type="datetime-local"
                value={item.endDate || ''}
                max={toInputDate(Date.now() + msIn(MAX_DEAL_HOURS))}
                onChange={(e) => onFieldChange('endDate', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Max {MAX_DEAL_HOURS} hours from now. Expired deals are auto-hidden from the storefront.
              </span>
            </label>

            <label className="block text-sm">
              <span className="text-slate-600 mb-1 block">Perks / extras (optional)</span>
              <textarea
                value={item.perks || ''}
                rows={2}
                onChange={(e) => onFieldChange('perks', e.target.value)}
                placeholder="Silver finish · MS Office 2024 · 1-year onsite warranty"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm resize-y"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!item.active}
                onChange={(e) => onFieldChange('active', e.target.checked)}
                className="w-4 h-4 accent-hp-blue"
              />
              Visible on storefront
            </label>

            {err && <div className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg">{err}</div>}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 rounded-full text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Deal'}
              </button>
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Product picker ──────────────────────────────────────────────────────────

function ProductPickerSection({ selected, onPick }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAdminProducts({ page: 1, limit: 50, search });
  const products = useMemo(
    () => (Array.isArray(data) ? data : (data?.products || [])),
    [data]
  );

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      <div className="text-xs text-slate-500 mb-1">Selected product</div>
      <div className="font-medium text-hp-ink">{selected.name || '(none selected)'}</div>
      {selected.series && <div className="text-xs text-slate-400">{selected.series}</div>}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 text-xs text-hp-blue hover:underline font-medium"
      >
        {open ? 'Close selector' : (selected.product ? 'Change product →' : 'Pick a product →')}
      </button>

      {open && (
        <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg focus:border-hp-blue outline-none"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-4 text-xs text-slate-400 text-center">Loading…</div>
            ) : products.length === 0 ? (
              <div className="p-4 text-xs text-slate-400 text-center">No products match.</div>
            ) : products.map((p) => (
              <button
                key={p._id || p.id}
                type="button"
                onClick={() => { onPick(p); setOpen(false); setSearch(''); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-hp-blue/5"
              >
                <div className="font-medium text-hp-ink">{p.name}</div>
                <div className="text-xs text-slate-400">₹{Number(p.price || 0).toLocaleString('en-IN')}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, min, max, step }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 mb-1 block">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
      />
    </label>
  );
}

function ReadOnlyField({ label, value, hint }) {
  return (
    <div className="block text-sm">
      <span className="text-slate-600 mb-1 block">{label}</span>
      <div className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-hp-ink font-semibold flex items-center">
        {value}
      </div>
      {hint && <div className="text-[11px] text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}
