import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Gift, Check } from 'lucide-react';
import IconPicker from '../../components/admin/IconPicker.jsx';
import { categoryIconMap } from '../../lib/categoryIcons.js';
import { OFFER_GRADIENTS, OFFER_TEXT_COLORS } from '../../lib/offerTheme.js';
import {
  useAdminOffers,
  useCreateOffer,
  useUpdateOffer,
  useDeleteOffer,
} from '../../hooks/queries.js';

// Empty form — matches the shape used by OfferStrip.jsx on the homepage
const EMPTY = {
  tag:       '',         // Category label, e.g. "Bank Offer"
  title:     '',         // Main offer headline
  desc:      '',         // Short supporting description
  cta:       '',         // Call-to-action button text
  link:      '#',        // CTA link target
  icon:      'CreditCard', // Lucide icon name for the card's large background icon
  bg:        'linear-gradient(135deg,#0096D6,#00205B)', // CSS gradient for card background
  textColor: 'text-white', // Tailwind color class for text
  tagStyle:  'opacity-80', // Tailwind class for the tag label
  iconColor: 'text-white/15', // Tailwind class for the background icon
  active:    true,       // Controls visibility without deletion
};

// ── Shared form helpers ───────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, required }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 mb-1 block">{label}</span>
      <input
        required={required}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 mb-1 block">{label}</span>
      <textarea
        value={value || ''}
        placeholder={placeholder}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm resize-none"
      />
    </label>
  );
}

// OfferPreview — renders an offer with the picked theme inside the modal so
// admins see exactly what the card will look like on the storefront. Uses the
// same Tailwind classes the real <OfferStrip> component uses so previews match.
function OfferPreview({ item }) {
  const Icon = categoryIconMap[item.icon];
  const isLight = !item.textColor?.includes('white');
  return (
    <div className="relative overflow-hidden">
      {Icon && (
        <Icon className={`absolute -right-3 -bottom-3 w-20 h-20 ${item.iconColor || 'text-white/15'}`} />
      )}
      <div className={`text-xs font-semibold mb-1 ${item.tagStyle || 'opacity-80'} ${item.textColor || 'text-white'}`}>
        {item.tag || 'Tag'}
      </div>
      <div className={`font-semibold ${item.textColor || 'text-white'}`}>
        {item.title || 'Offer title'}
      </div>
      <div className={`text-xs mt-1 opacity-70 ${item.textColor || 'text-white'}`}>
        {item.desc || 'Short supporting description.'}
      </div>
      {item.cta && (
        <div className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${item.textColor || 'text-white'}`}
             style={{ textDecoration: isLight ? 'underline' : 'underline' }}>
          {item.cta} →
        </div>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
            <h2 className="font-display font-bold text-hp-ink">{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
          </div>
          <div className="px-6 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

// GradientPicker — curated swatches restricted to the brand palette. Picking
// a preset stamps in the gradient plus the matching tag/icon tints so cards
// stay legible. `textColor` is still editable below via TextColorPicker in
// case the admin wants to override (e.g., swap light text on a light gradient).
function GradientPicker({ value, onChange }) {
  return (
    <div>
      <div className="text-sm text-slate-600 mb-1">Background gradient</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {OFFER_GRADIENTS.map((g) => {
          const selected = value === g.bg;
          return (
            <button
              key={g.label}
              type="button"
              onClick={() => onChange(g)}
              className={`relative h-14 rounded-lg border-2 overflow-hidden flex items-end p-2 text-[11px] font-medium transition-transform ${
                selected ? 'border-hp-blue shadow-md' : 'border-transparent hover:scale-[1.02]'
              }`}
              style={{ background: g.bg, color: g.textColor.includes('white') ? '#fff' : '#0B1221' }}
              title={g.label}
            >
              <span className="drop-shadow-sm">{g.label}</span>
              {selected && (
                <Check className="absolute top-1 right-1 w-4 h-4 bg-white text-hp-blue rounded-full p-0.5 ring-1 ring-hp-blue" />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-400 mt-1">
        Pick a preset that matches the HP World palette. Custom gradients are disabled so cards stay on-brand.
      </p>
    </div>
  );
}

// TextColorPicker — two brand-matching options. Switching resets tag + icon
// tints alongside textColor so everything stays visually consistent.
function TextColorPicker({ value, onChange }) {
  return (
    <div>
      <div className="text-sm text-slate-600 mb-1">Text color</div>
      <div className="grid grid-cols-2 gap-2">
        {OFFER_TEXT_COLORS.map((opt) => {
          const selected = value === opt.textColor;
          return (
            <button
              key={opt.textColor}
              type="button"
              onClick={() => onChange(opt)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                selected
                  ? 'border-hp-blue bg-hp-blue/5 text-hp-ink'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-hp-blue'
              }`}
            >
              <span
                className="w-5 h-5 rounded-full border border-slate-200 shrink-0"
                style={{ background: opt.swatch }}
              />
              <span className="truncate text-left">{opt.label}</span>
              {selected && <Check className="w-4 h-4 text-hp-blue ml-auto shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminOffers() {
  const [modal, setModal] = useState({ open: false, mode: 'add', item: EMPTY });
  const [err, setErr]     = useState('');

  const { data, isLoading: loading } = useAdminOffers();
  const offers = Array.isArray(data) ? data : (data?.offers || []);

  const createMutation = useCreateOffer();
  const updateMutation = useUpdateOffer();
  const deleteMutation = useDeleteOffer();
  const saving = createMutation.isPending || updateMutation.isPending;

  const openAdd  = () => setModal({ open: true, mode: 'add',  item: { ...EMPTY } });
  const openEdit = (item) => setModal({ open: true, mode: 'edit', item: { ...item } });
  const closeModal = () => { setModal({ open: false, mode: 'add', item: EMPTY }); setErr(''); };
  const setField = (key, val) => setModal((m) => ({ ...m, item: { ...m.item, [key]: val } }));

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
    if (!window.confirm(`Delete offer "${item.title}"?`)) return;
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
          <Gift className="w-5 h-5 text-hp-blue" />
          <h1 className="font-display text-2xl font-bold text-hp-ink">Offers</h1>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-full text-sm">
          <Plus className="w-4 h-4" /> Add Offer
        </button>
      </div>

      {/* Offer cards preview grid */}
      {!loading && offers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {offers.map((o) => (
            <div
              key={o._id || o.id}
              className="rounded-xl p-4 text-sm"
              style={{ background: o.bg }}
            >
              {/* Live preview of how the offer card looks on the homepage */}
              <div className={`text-xs font-semibold mb-1 ${o.tagStyle}`} style={{ color: o.textColor?.includes('white') ? 'rgba(255,255,255,0.7)' : undefined }}>
                {o.tag}
              </div>
              <div className="font-semibold" style={{ color: o.textColor?.includes('white') ? '#fff' : '#0B1221' }}>
                {o.title}
              </div>
              <div className="text-xs mt-1 opacity-70" style={{ color: o.textColor?.includes('white') ? '#fff' : '#0B1221' }}>
                {o.desc}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Offers table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Tag</th>
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Description</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Icon</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {offers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                      No offers yet. Click "Add Offer" to create a promo card.
                    </td>
                  </tr>
                )}
                {offers.map((o) => (
                  <tr key={o._id || o.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="text-xs bg-hp-blue/10 text-hp-blue px-2 py-0.5 rounded font-medium">{o.tag}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-hp-ink">{o.title}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate hidden md:table-cell">{o.desc}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
              {(() => {
                const Icon = categoryIconMap[o.icon];
                return Icon ? (
                  <span className="inline-flex items-center gap-2 text-slate-600">
                    <Icon className="w-4 h-4 text-hp-blue" />
                    <span className="text-xs">{o.icon}</span>
                  </span>
                ) : (
                  <span className="text-xs text-accent-red" title="Unknown icon name — pick one in the editor">
                    {o.icon || '–'} (unknown)
                  </span>
                );
              })()}
            </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${o.active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {o.active !== false ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(o)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-hp-blue" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(o)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-accent-red" title="Delete">
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

      {/* Add / Edit modal */}
      {modal.open && (
        <Modal title={modal.mode === 'add' ? 'Add Offer' : 'Edit Offer'} onClose={closeModal}>
          <form onSubmit={handleSave} className="space-y-3">
            {/* Short category label shown above the title */}
            <Field label="Tag (category label) *" value={modal.item.tag} onChange={(v) => setField('tag', v)} required placeholder="e.g. Bank Offer" />
            {/* Offer headline */}
            <Field label="Title *" value={modal.item.title} onChange={(v) => setField('title', v)} required placeholder="e.g. 10% Instant Discount" />
            {/* Supporting detail */}
            <TextArea label="Description" value={modal.item.desc} onChange={(v) => setField('desc', v)} placeholder="e.g. HDFC Bank credit & debit cards. Max ₹7,500 off." />
            {/* CTA button */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="CTA Label" value={modal.item.cta} onChange={(v) => setField('cta', v)} placeholder="Shop now" />
              <Field label="CTA Link" value={modal.item.link} onChange={(v) => setField('link', v)} placeholder="/shop or #" />
            </div>
            {/* Searchable icon picker — shared with AdminCategories. */}
            <IconPicker value={modal.item.icon} onChange={(v) => setField('icon', v)} cap={15} />
            {/* Brand-matching gradient presets. Selecting one also updates the
                tag label and icon tint so the card stays readable. */}
            <GradientPicker
              value={modal.item.bg}
              onChange={(g) =>
                setModal((m) => ({
                  ...m,
                  item: {
                    ...m.item,
                    bg: g.bg,
                    textColor: g.textColor,
                    tagStyle: g.tagStyle,
                    iconColor: g.iconColor,
                  },
                }))
              }
            />
            {/* Text color chooser — two brand-safe options. */}
            <TextColorPicker
              value={modal.item.textColor}
              onChange={(opt) =>
                setModal((m) => ({
                  ...m,
                  item: {
                    ...m.item,
                    textColor: opt.textColor,
                    tagStyle: opt.tagStyle,
                    iconColor: opt.iconColor,
                  },
                }))
              }
            />

            {/* Live preview of the offer card with the currently-chosen theme. */}
            <div>
              <div className="text-sm text-slate-600 mb-1">Preview</div>
              <div
                className="rounded-xl p-4 text-sm"
                style={{ background: modal.item.bg }}
              >
                <OfferPreview item={modal.item} />
              </div>
            </div>
            {/* Active/inactive toggle */}
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={modal.item.active !== false} onChange={(e) => setField('active', e.target.checked)} className="w-4 h-4" />
              Active (visible on homepage)
            </label>

            {err && <div className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg">{err}</div>}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 rounded-full text-sm disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Offer'}
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
