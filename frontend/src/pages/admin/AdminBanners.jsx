import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Image, Upload, Link as LinkIcon, Loader2 } from 'lucide-react';
import {
  useAdminBanners,
  useCreateBanner,
  useUpdateBanner,
  useDeleteBanner,
} from '../../hooks/queries.js';
import { adminUploadImage } from '../../services/api.js';

// Matches the Banner schema on the server — nested badge / cta / features shape.
const EMPTY = {
  badge: { label: '', pulse: false, red: false },
  title: '',
  titleHighlight: '',
  titleHighlightClass: 'text-hp-blue',
  titleLine2: '',
  desc: '',
  cta: { primary: '', primaryLink: '/shop', secondary: '', secondaryLink: '' },
  features: [],
  visual: 'laptop',
  imageUrl: '',
  order: 0,
  active: true,
};

// Features are stored as [{ icon, label }]. In the form we show them as a
// comma-separated textarea where each entry is "Icon:Label" (icon is optional).
//   Examples:  "Zap:22hr battery, Cpu:Core Ultra 9, Great display"
const featuresToText = (features = []) =>
  features
    .map((f) => (f?.icon ? `${f.icon}:${f.label || ''}` : f?.label || ''))
    .filter(Boolean)
    .join(', ');

const textToFeatures = (text = '') =>
  text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const idx = s.indexOf(':');
      if (idx > 0) return { icon: s.slice(0, idx).trim(), label: s.slice(idx + 1).trim() };
      return { icon: '', label: s };
    });

// ── Shared form helpers ───────────────────────────────────────────────────────

function Field({ label, value, onChange, type = 'text', placeholder, required }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 mb-1 block">{label}</span>
      <input
        type={type}
        required={required}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 2 }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 mb-1 block">{label}</span>
      <textarea
        value={value ?? ''}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm resize-none"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 mb-1 block">{label}</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function Modal({ title, onClose, children }) {
  // Two-layer pattern: the outer div is the scroll container (handles tall
  // forms on short viewports); the inner flex centers the modal vertically
  // when content fits, and flows from the top when it doesn't. Using
  // `items-center` directly on the scroll container clips the top and
  // breaks the sticky header.
  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
            <h2 className="font-display font-bold text-hp-ink">{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-6 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminBanners() {
  // `item` is the form state in a friendly "editable" shape — features live in
  // a separate textarea string that we only parse back to an array on save.
  const [modal, setModal] = useState({
    open: false,
    mode: 'add',
    item: EMPTY,
    featuresText: '',
    // 'url' = paste a web address, 'upload' = upload a file via multer.
    // Only one source is used; the chosen one populates item.imageUrl.
    imageSource: 'url',
  });
  const [err, setErr] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data, isLoading: loading } = useAdminBanners();
  const banners = Array.isArray(data) ? data : (data?.banners || []);

  const createMutation = useCreateBanner();
  const updateMutation = useUpdateBanner();
  const deleteMutation = useDeleteBanner();
  const saving = createMutation.isPending || updateMutation.isPending;

  const openAdd = () =>
    setModal({
      open: true,
      mode: 'add',
      item: structuredClone(EMPTY),
      featuresText: '',
      imageSource: 'url',
    });

  const openEdit = (item) =>
    setModal({
      open: true,
      mode: 'edit',
      item: {
        ...structuredClone(EMPTY),
        ...item,
        // defensively merge nested fields so partially-populated docs still work
        badge: { ...EMPTY.badge, ...(item.badge || {}) },
        cta: { ...EMPTY.cta, ...(item.cta || {}) },
      },
      featuresText: featuresToText(item.features),
      // Previously-uploaded images live under /uploads/ — default the toggle
      // to match so admins see where the current image came from.
      imageSource: item.imageUrl && item.imageUrl.startsWith('/uploads/') ? 'upload' : 'url',
    });

  const closeModal = () => {
    setModal({ open: false, mode: 'add', item: EMPTY, featuresText: '', imageSource: 'url' });
    setErr('');
    setUploading(false);
  };

  // Simple top-level setter (title, desc, order, active, visual, …)
  const setField = (key, val) =>
    setModal((m) => ({ ...m, item: { ...m.item, [key]: val } }));

  // Setter for nested fields like badge.label or cta.primary
  const setNested = (group, key, val) =>
    setModal((m) => ({
      ...m,
      item: { ...m.item, [group]: { ...m.item[group], [key]: val } },
    }));

  const handleSave = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const { item, mode, featuresText } = modal;
      const payload = { ...item, features: textToFeatures(featuresText) };
      if (mode === 'add') {
        await createMutation.mutateAsync(payload);
      } else {
        await updateMutation.mutateAsync({ id: item._id || item.id, data: payload });
      }
      closeModal();
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Save failed.');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete banner "${item.title}"?`)) return;
    try {
      await deleteMutation.mutateAsync(item._id || item.id);
    } catch {
      alert('Delete failed.');
    }
  };

  return (
    <>
      {/* Page header — flex-wrap lets the Add button drop below the title on
          very narrow viewports instead of getting crushed next to it. */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 min-w-0">
          <Image className="w-5 h-5 text-hp-blue shrink-0" />
          <h1 className="font-display text-xl sm:text-2xl font-bold text-hp-ink truncate">Banners</h1>
        </div>
        <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm shrink-0">
          <Plus className="w-4 h-4" /> Add Banner
        </button>
      </div>

      {/* Banners table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-3 sm:px-4 py-3">Title</th>
                  <th className="text-left px-3 sm:px-4 py-3 hidden sm:table-cell">Badge</th>
                  <th className="text-left px-3 sm:px-4 py-3 hidden md:table-cell">Visual</th>
                  <th className="text-left px-3 sm:px-4 py-3 hidden lg:table-cell">CTA Primary</th>
                  <th className="text-left px-3 sm:px-4 py-3">Status</th>
                  <th className="px-3 sm:px-4 py-3 w-16 sm:w-20"></th>
                </tr>
              </thead>
              <tbody>
                {banners.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                      No banners yet. Click "Add Banner" to create a hero slide.
                    </td>
                  </tr>
                )}
                {banners.map((b) => (
                  <tr key={b._id || b.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 sm:px-4 py-3 font-medium text-hp-ink break-words">{b.title}</td>
                    <td className="px-3 sm:px-4 py-3 text-slate-500 hidden sm:table-cell">{b.badge?.label || '–'}</td>
                    <td className="px-3 sm:px-4 py-3 text-slate-500 capitalize hidden md:table-cell">{b.visual || '–'}</td>
                    <td className="px-3 sm:px-4 py-3 text-slate-500 hidden lg:table-cell">{b.cta?.primary || '–'}</td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${b.active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {b.active !== false ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(b)} className="p-2 sm:p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-hp-blue" title="Edit" aria-label="Edit banner">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(b)} className="p-2 sm:p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-accent-red" title="Delete" aria-label="Delete banner">
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
        <Modal
          title={modal.mode === 'add' ? 'Add Banner' : 'Edit Banner'}
          onClose={closeModal}
        >
          <form onSubmit={handleSave} className="space-y-3">
            <Field label="Title *" value={modal.item.title} onChange={(v) => setField('title', v)} required placeholder="e.g. HP Spectre x360 Reimagined." />
            <Field label="Title Highlight (substring to colorize)" value={modal.item.titleHighlight} onChange={(v) => setField('titleHighlight', v)} placeholder="e.g. Reimagined." />
            <Field label="Title Line 2" value={modal.item.titleLine2} onChange={(v) => setField('titleLine2', v)} placeholder="e.g. on OMEN Gaming Laptops" />
            <Field label="Badge label" value={modal.item.badge.label} onChange={(v) => setNested('badge', 'label', v)} placeholder="e.g. New Launch" />
            <TextArea label="Description" value={modal.item.desc} onChange={(v) => setField('desc', v)} placeholder="Brief description shown under the title…" />

            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary CTA Label" value={modal.item.cta.primary} onChange={(v) => setNested('cta', 'primary', v)} placeholder="Shop Now" />
              <Field label="Primary CTA Link" value={modal.item.cta.primaryLink} onChange={(v) => setNested('cta', 'primaryLink', v)} placeholder="/shop" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Secondary CTA Label" value={modal.item.cta.secondary} onChange={(v) => setNested('cta', 'secondary', v)} placeholder="Learn more" />
              <Field label="Secondary CTA Link" value={modal.item.cta.secondaryLink} onChange={(v) => setNested('cta', 'secondaryLink', v)} placeholder="#" />
            </div>

            <TextArea
              label="Feature chips (comma-separated, optional Icon: prefix)"
              value={modal.featuresText}
              onChange={(v) => setModal((m) => ({ ...m, featuresText: v }))}
              placeholder="Zap:22hr battery, Cpu:Intel Core Ultra 9, Monitor:2.8K OLED"
            />

            <SelectField
              label="Visual / Illustration"
              value={modal.item.visual}
              onChange={(v) => setField('visual', v)}
              options={[
                { value: 'laptop',  label: 'Laptop (blue gradient)' },
                { value: 'omen',    label: 'OMEN (dark gaming)' },
                { value: 'student', label: 'Student (teal)' },
              ]}
            />

            {/* Image source picker — either a pasted web URL or an uploaded file.
                Both flows write to the same `imageUrl` field on the banner. */}
            <div className="border border-slate-200 rounded-xl p-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-slate-500 mr-1">Image source</span>
                {[
                  { val: 'url',    label: 'Paste URL',    icon: LinkIcon },
                  { val: 'upload', label: 'Upload File',  icon: Upload },
                ].map(({ val, label, icon: Icon }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      // Switching sources clears the current value so we never
                      // end up with a stale URL sticking around from the other mode.
                      setModal((m) => ({
                        ...m,
                        imageSource: val,
                        item: { ...m.item, imageUrl: '' },
                      }));
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium border transition-colors ${
                      modal.imageSource === val
                        ? 'bg-hp-blue text-white border-hp-blue'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-hp-blue hover:text-hp-blue'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {modal.imageSource === 'url' ? (
                <Field
                  label="Custom Image URL"
                  value={modal.item.imageUrl}
                  onChange={(v) => setField('imageUrl', v)}
                  placeholder="https://…"
                />
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm">
                    <span className="text-slate-600 mb-1 block">Upload Image (max 5 MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setErr('');
                        setUploading(true);
                        try {
                          const res = await adminUploadImage(file);
                          setField('imageUrl', res.url);
                        } catch (e2) {
                          setErr(e2?.response?.data?.message || 'Upload failed. Try another image.');
                        } finally {
                          setUploading(false);
                        }
                      }}
                      className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-hp-blue/10 file:text-hp-blue hover:file:bg-hp-blue/20"
                    />
                  </label>
                  {uploading && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
                    </div>
                  )}
                  {modal.item.imageUrl && !uploading && (
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <img
                        src={modal.item.imageUrl}
                        alt="Uploaded preview"
                        className="w-14 h-14 rounded-lg object-cover border border-slate-200"
                      />
                      <span className="truncate">{modal.item.imageUrl}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Display Order" type="number" value={modal.item.order} onChange={(v) => setField('order', Number(v))} />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={modal.item.active !== false} onChange={(e) => setField('active', e.target.checked)} className="w-4 h-4" />
              Active (visible on homepage)
            </label>

            <div className="flex gap-4 text-sm text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={modal.item.badge.pulse || false} onChange={(e) => setNested('badge', 'pulse', e.target.checked)} />
                Pulse dot on badge
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={modal.item.badge.red || false} onChange={(e) => setNested('badge', 'red', e.target.checked)} />
                Red badge style
              </label>
            </div>

            {err && <div className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg">{err}</div>}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving || uploading} className="btn-primary flex-1 py-2.5 rounded-full text-sm disabled:opacity-60">
                {saving ? 'Saving…' : uploading ? 'Uploading…' : 'Save Banner'}
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
