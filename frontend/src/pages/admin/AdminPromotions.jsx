import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Percent, Calendar, Loader2, Tag, Layers, ShoppingBag } from 'lucide-react';
import {
  useAdminPromotions,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
  useAdminCategories,
  useAdminProducts,
} from '../../hooks/queries.js';

// Freshly-picked defaults for the "Add" modal
const EMPTY = {
  name:      '',
  percent:   10,
  appliesTo: 'category',
  targets:   [],
  startDate: '',
  endDate:   '',
  active:    true,
};

// Turn the Date picker input (yyyy-mm-ddThh:mm) into an ISO string, and vice
// versa, without mangling the timezone or emitting invalid Date objects.
const toInputDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromInputDate = (v) => (v ? new Date(v).toISOString() : null);

export default function AdminPromotions() {
  const [modal, setModal] = useState({ open: false, mode: 'add', item: EMPTY });
  const [err, setErr]     = useState('');

  const { data, isLoading } = useAdminPromotions();
  const promotions = Array.isArray(data) ? data : [];

  const { data: catsData }  = useAdminCategories();
  const categories = Array.isArray(catsData) ? catsData : (catsData?.categories || []);

  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion();
  const deleteMutation = useDeletePromotion();
  const saving = createMutation.isPending || updateMutation.isPending;

  const openAdd  = () => setModal({ open: true, mode: 'add',  item: { ...EMPTY } });
  const openEdit = (p) => setModal({
    open: true,
    mode: 'edit',
    item: {
      ...EMPTY,
      ...p,
      targets:   Array.isArray(p.targets) ? p.targets.map(String) : [],
      startDate: toInputDate(p.startDate),
      endDate:   toInputDate(p.endDate),
    },
  });
  const closeModal = () => { setModal({ open: false, mode: 'add', item: EMPTY }); setErr(''); };
  const setField = (k, v) => setModal((m) => ({ ...m, item: { ...m.item, [k]: v } }));

  const handleSave = async (e) => {
    e.preventDefault();
    setErr('');
    const { item, mode } = modal;
    const percent = Number(item.percent);
    if (!item.name?.trim()) { setErr('Name is required.'); return; }
    if (!Number.isFinite(percent) || percent < 1 || percent > 90) {
      setErr('Discount percent must be between 1 and 90.');
      return;
    }
    if (item.appliesTo !== 'all' && (!item.targets || item.targets.length === 0)) {
      setErr(`Pick at least one ${item.appliesTo} to apply this promo to.`);
      return;
    }
    try {
      const payload = {
        name:      item.name.trim(),
        percent,
        appliesTo: item.appliesTo,
        targets:   item.appliesTo === 'all' ? [] : item.targets,
        startDate: fromInputDate(item.startDate),
        endDate:   fromInputDate(item.endDate),
        active:    !!item.active,
      };
      if (mode === 'add') await createMutation.mutateAsync(payload);
      else                await updateMutation.mutateAsync({ id: item._id, data: payload });
      closeModal();
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Save failed.');
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete promotion "${p.name}"?`)) return;
    try { await deleteMutation.mutateAsync(p._id); }
    catch { alert('Delete failed.'); }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Percent className="w-5 h-5 text-hp-blue" />
          <h1 className="font-display text-2xl font-bold text-hp-ink">Promotions</h1>
          {!isLoading && (
            <span className="text-sm text-slate-400 ml-1">({promotions.length})</span>
          )}
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-full text-sm">
          <Plus className="w-4 h-4" /> Add Promotion
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : promotions.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            No promotions yet. Click "Add Promotion" to create a percentage discount.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Discount</th>
                  <th className="text-left px-4 py-3">Applies to</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Schedule</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => (
                  <tr key={p._id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-hp-ink">{p.name}</td>
                    <td className="px-4 py-3 font-semibold text-accent-red">{p.percent}% off</td>
                    <td className="px-4 py-3">
                      <ScopeLabel appliesTo={p.appliesTo} targets={p.targets} categories={categories} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                      {formatSchedule(p)}
                    </td>
                    <td className="px-4 py-3">
                      {p.active
                        ? <span className="text-xs bg-accent-mint/10 text-accent-mint px-2 py-0.5 rounded font-medium">Active</span>
                        : <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium">Inactive</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-hp-blue" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-accent-red" title="Delete">
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

      {modal.open && (
        <PromoModal
          mode={modal.mode}
          item={modal.item}
          err={err}
          saving={saving}
          categories={categories}
          onFieldChange={setField}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </>
  );
}

function ScopeLabel({ appliesTo, targets, categories }) {
  if (appliesTo === 'all') {
    return <span className="text-xs bg-hp-blue/10 text-hp-blue px-2 py-0.5 rounded font-medium capitalize">Entire catalogue</span>;
  }
  if (appliesTo === 'category') {
    const names = (targets || []).map((slug) => {
      const c = categories.find((x) => x.slug === slug);
      return c?.name || slug;
    });
    return (
      <div className="flex flex-wrap gap-1 max-w-xs">
        {names.slice(0, 3).map((n) => (
          <span key={n} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{n}</span>
        ))}
        {names.length > 3 && <span className="text-xs text-slate-400">+{names.length - 3}</span>}
      </div>
    );
  }
  return (
    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
      {targets?.length || 0} product{targets?.length === 1 ? '' : 's'}
    </span>
  );
}

function formatSchedule(p) {
  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : null;
  const s = fmt(p.startDate);
  const e = fmt(p.endDate);
  if (s && e) return `${s} → ${e}`;
  if (s)      return `From ${s}`;
  if (e)      return `Until ${e}`;
  return 'No schedule';
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function PromoModal({ mode, item, err, saving, categories, onFieldChange, onSave, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
            <h2 className="font-display font-bold text-hp-ink">
              {mode === 'add' ? 'Add Promotion' : 'Edit Promotion'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={onSave} className="px-6 py-4 space-y-4">
            <Field label="Name *" value={item.name} onChange={(v) => onFieldChange('name', v)} placeholder="e.g. Diwali Sale — Laptops" />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Discount % *"
                type="number" min="1" max="90"
                value={item.percent}
                onChange={(v) => onFieldChange('percent', v)}
              />
              <label className="flex items-end gap-2 text-sm pb-1">
                <input
                  type="checkbox"
                  checked={!!item.active}
                  onChange={(e) => onFieldChange('active', e.target.checked)}
                  className="w-4 h-4 accent-hp-blue"
                />
                <span className="text-slate-700">Active</span>
              </label>
            </div>

            <div>
              <span className="text-sm text-slate-600 mb-1 block">Applies to</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 'all',      icon: Tag,         label: 'Entire catalogue' },
                  { v: 'category', icon: Layers,      label: 'Category' },
                  { v: 'product',  icon: ShoppingBag, label: 'Specific products' },
                ].map(({ v, icon: Icon, label }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onFieldChange('appliesTo', v) || onFieldChange('targets', [])}
                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-xs font-medium transition-colors ${
                      item.appliesTo === v
                        ? 'bg-hp-blue text-white border-hp-blue'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-hp-blue hover:text-hp-blue'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {item.appliesTo === 'category' && (
              <CategoryPicker
                categories={categories}
                value={item.targets || []}
                onChange={(next) => onFieldChange('targets', next)}
              />
            )}

            {item.appliesTo === 'product' && (
              <ProductPicker
                value={item.targets || []}
                onChange={(next) => onFieldChange('targets', next)}
              />
            )}

            {item.appliesTo === 'all' && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5" />
                This promotion will apply to every product that doesn't already have a product- or category-specific promo.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field
                label={<span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Start (optional)</span>}
                type="datetime-local"
                value={item.startDate}
                onChange={(v) => onFieldChange('startDate', v)}
              />
              <Field
                label={<span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> End (optional)</span>}
                type="datetime-local"
                value={item.endDate}
                onChange={(v) => onFieldChange('endDate', v)}
              />
            </div>

            {err && <div className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg">{err}</div>}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 rounded-full text-sm inline-flex items-center justify-center gap-1 disabled:opacity-60">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? 'Saving…' : 'Save Promotion'}
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

// ─── Pickers ──────────────────────────────────────────────────────────────────

function CategoryPicker({ categories, value, onChange }) {
  const toggle = (slug) => {
    const next = value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug];
    onChange(next);
  };
  if (!categories.length) {
    return (
      <div className="text-xs text-slate-400 px-3 py-3 rounded-lg border border-dashed border-slate-200 bg-slate-50">
        No categories yet — create some on the Categories page.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {categories.map((c) => {
        const on = value.includes(c.slug);
        return (
          <button
            key={c.slug}
            type="button"
            onClick={() => toggle(c.slug)}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left ${
              on ? 'bg-hp-blue text-white border-hp-blue' : 'bg-white text-slate-600 border-slate-200 hover:border-hp-blue hover:text-hp-blue'
            }`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

function ProductPicker({ value, onChange }) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAdminProducts({ page: 1, limit: 50, search });
  const products = useMemo(
    () => (Array.isArray(data) ? data : (data?.products || [])),
    [data]
  );

  const valueSet = new Set(value.map(String));
  const toggle = (id) => {
    const sid = String(id);
    const next = valueSet.has(sid)
      ? value.filter((v) => String(v) !== sid)
      : [...value, sid];
    onChange(next);
  };

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products…"
        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none mb-2"
      />
      {value.length > 0 && (
        <div className="text-xs text-slate-500 mb-2">
          {value.length} product{value.length === 1 ? '' : 's'} selected
        </div>
      )}
      <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-4 text-xs text-slate-400 text-center">Loading…</div>
        ) : products.length === 0 ? (
          <div className="p-4 text-xs text-slate-400 text-center">No products match.</div>
        ) : (
          products.map((p) => {
            const id = p._id || p.id;
            const on = valueSet.has(String(id));
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 ${
                  on ? 'bg-hp-blue/5' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-hp-ink">{p.name}</div>
                  <div className="text-xs text-slate-400 capitalize">{p.category}</div>
                </div>
                <span className={`ml-2 text-xs ${on ? 'text-hp-blue font-semibold' : 'text-slate-300'}`}>
                  {on ? 'Selected' : 'Add'}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, min, max }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 mb-1 block">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
      />
    </label>
  );
}
