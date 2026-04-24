import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Tag } from 'lucide-react';
import IconPicker from '../../components/admin/IconPicker.jsx';
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../../hooks/queries.js';
import { categoryIconMap } from '../../lib/categoryIcons.js';

// Empty form state used when opening the "Add Category" modal
const EMPTY = { slug: '', name: '', icon: 'Laptop', subtitle: '', accent: false, subcategories: [] };

// Convert a human name into a URL-safe slug (lowercase, hyphenated).
const slugify = (s) =>
  (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// SubcategoriesEditor — row-based editor for a category's subcategories.
// Slug is auto-derived from name but can be overridden. Emits the current
// rows via onChange.
function SubcategoriesEditor({ rows, onChange }) {
  const add    = () => onChange([...rows, { name: '', slug: '' }]);
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const update = (i, patch) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-600">Subcategories</span>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 text-xs text-hp-blue hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Add subcategory
        </button>
      </div>
      {rows.length === 0 && (
        <div className="text-xs text-slate-400 px-3 py-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center">
          No subcategories yet. Click "Add subcategory" (e.g. Gaming → Victus, OMEN).
        </div>
      )}
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input
              value={r.name || ''}
              onChange={(e) => {
                const name = e.target.value;
                // Auto-fill slug while the admin hasn't customised it
                const slug = !r.slug || r.slug === slugify(r.name) ? slugify(name) : r.slug;
                update(i, { name, slug });
              }}
              placeholder="OMEN"
              className="h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
            />
            <input
              value={r.slug || ''}
              onChange={(e) => update(i, { slug: slugify(e.target.value) })}
              placeholder="omen"
              className="h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="w-10 h-10 rounded-lg text-slate-400 hover:text-accent-red hover:bg-red-50 grid place-items-center"
              title="Remove subcategory"
              aria-label="Remove subcategory row"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared form components ────────────────────────────────────────────────────

// Field — labelled text input used in add/edit modals
function Field({ label, value, onChange, type = 'text', required, placeholder }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 mb-1 block">{label}</span>
      <input
        type={type}
        required={required}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
      />
    </label>
  );
}

// Modal — centered overlay dialog for add/edit forms
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display font-bold text-hp-ink">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminCategories() {
  const [modal, setModal] = useState({ open: false, mode: 'add', item: EMPTY });
  const [err, setErr]     = useState('');

  const { data, isLoading: loading } = useAdminCategories();
  const categories = Array.isArray(data) ? data : (data?.categories || []);

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const saving = createMutation.isPending || updateMutation.isPending;

  // Open modal in "add" mode with blank form fields
  const openAdd  = () => setModal({ open: true, mode: 'add',  item: { ...EMPTY, subcategories: [] } });
  const openEdit = (item) =>
    setModal({
      open: true,
      mode: 'edit',
      item: {
        ...EMPTY,
        ...item,
        subcategories: Array.isArray(item.subcategories)
          ? item.subcategories.map((s) => ({ name: s.name || '', slug: s.slug || '' }))
          : [],
      },
    });
  const closeModal = () => { setModal({ open: false, mode: 'add', item: EMPTY }); setErr(''); };

  const setField = (key, val) =>
    setModal((m) => ({ ...m, item: { ...m.item, [key]: val } }));

  const handleSave = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const { item, mode } = modal;
      // Drop blank subcategory rows and normalise slugs before saving.
      const cleanSubs = (item.subcategories || [])
        .map((s) => ({
          name: (s.name || '').trim(),
          slug: slugify(s.slug || s.name || ''),
          order: Number(s.order) || 0,
        }))
        .filter((s) => s.name && s.slug);
      // Reject duplicate slugs within a single category.
      const slugs = cleanSubs.map((s) => s.slug);
      if (new Set(slugs).size !== slugs.length) {
        setErr('Subcategory slugs must be unique within a category.');
        return;
      }
      const payload = { ...item, subcategories: cleanSubs };
      if (mode === 'add') {
        await createMutation.mutateAsync(payload);
      } else {
        const id = item._id || item.id || item.slug;
        await updateMutation.mutateAsync({ id, data: payload });
      }
      closeModal();
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Save failed. Please try again.');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete category "${item.name}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(item._id || item.id || item.slug);
    } catch {
      alert('Delete failed. The category may be in use by products.');
    }
  };

  return (
    <>
      {/* Page header — wraps on very narrow screens so the Add button
          never gets pushed off the right edge. */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 min-w-0">
          <Tag className="w-5 h-5 text-hp-blue shrink-0" />
          <h1 className="font-display text-xl sm:text-2xl font-bold text-hp-ink truncate">Categories</h1>
          {!loading && (
            <span className="text-sm text-slate-400 ml-1">({categories.length})</span>
          )}
        </div>
        <button
          onClick={openAdd}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-full text-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Categories table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-3 sm:px-4 py-3">Name</th>
                  <th className="text-left px-3 sm:px-4 py-3 hidden md:table-cell">Slug</th>
                  <th className="text-left px-3 sm:px-4 py-3 hidden lg:table-cell">Subtitle</th>
                  <th className="text-left px-3 sm:px-4 py-3 hidden lg:table-cell">Icon</th>
                  <th className="text-left px-3 sm:px-4 py-3">Subcategories</th>
                  <th className="text-left px-3 sm:px-4 py-3 hidden sm:table-cell">Accent</th>
                  <th className="px-3 sm:px-4 py-3 w-16 sm:w-20"></th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                      No categories yet. Click "Add Category" to create one.
                    </td>
                  </tr>
                )}
                {categories.map((cat) => (
                  <tr key={cat._id || cat.slug} className="border-t border-slate-100 hover:bg-slate-50 align-top">
                    <td className="px-3 sm:px-4 py-3">
                      <div className="font-medium text-hp-ink break-words">{cat.name}</div>
                      {/* On mobile the dedicated Slug column is hidden —
                          show the slug underneath the name so admins can
                          still see what URL it maps to. */}
                      <div className="font-mono text-slate-400 text-[11px] md:hidden mt-0.5">{cat.slug}</div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 font-mono text-slate-500 text-xs hidden md:table-cell">{cat.slug}</td>
                    <td className="px-3 sm:px-4 py-3 text-slate-500 hidden lg:table-cell">{cat.subtitle}</td>
                    <td className="px-3 sm:px-4 py-3 hidden lg:table-cell">
                      {(() => {
                        const Icon = categoryIconMap[cat.icon];
                        return Icon ? (
                          <span className="inline-flex items-center gap-2 text-slate-600">
                            <Icon className="w-4 h-4 text-hp-blue" />
                            <span className="text-xs">{cat.icon}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-accent-red" title="Unknown icon — will fall back to Laptop on the homepage">
                            {cat.icon || '–'} (unknown)
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      {Array.isArray(cat.subcategories) && cat.subcategories.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {cat.subcategories.slice(0, 3).map((s) => (
                            <span key={s.slug} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded whitespace-nowrap">
                              {s.name}
                            </span>
                          ))}
                          {cat.subcategories.length > 3 && (
                            <span className="text-xs text-slate-400">+{cat.subcategories.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">none</span>
                      )}
                      {/* Accent state collapses into this column on mobile
                          so there's no awkward third column fighting for
                          space on narrow screens. */}
                      {cat.accent && (
                        <span className="sm:hidden text-[10px] bg-accent-red/10 text-accent-red px-1.5 py-0.5 rounded font-medium uppercase tracking-wide mt-1 inline-block">
                          Accent
                        </span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                      {cat.accent
                        ? <span className="text-xs bg-accent-red/10 text-accent-red px-2 py-0.5 rounded font-medium">Yes</span>
                        : <span className="text-slate-300">–</span>}
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      {/* Row actions: Edit and Delete. Tap-sized on mobile
                          (p-2), tighter on desktop. */}
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-2 sm:p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-hp-blue"
                          title="Edit"
                          aria-label="Edit category"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-2 sm:p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-accent-red"
                          title="Delete"
                          aria-label="Delete category"
                        >
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
          title={modal.mode === 'add' ? 'Add Category' : 'Edit Category'}
          onClose={closeModal}
        >
          <form onSubmit={handleSave} className="space-y-4">
            {/* Category display name, e.g. "Laptops" */}
            <Field
              label="Name"
              value={modal.item.name}
              onChange={(v) => setField('name', v)}
              required
              placeholder="e.g. Laptops"
            />
            {/* URL slug used in routes like /shop/laptops */}
            <Field
              label="Slug (URL path)"
              value={modal.item.slug}
              onChange={(v) => setField('slug', v.toLowerCase().replace(/\s+/g, '-'))}
              required
              placeholder="e.g. laptops"
            />
            {/* Short tagline shown under the category icon */}
            <Field
              label="Subtitle"
              value={modal.item.subtitle}
              onChange={(v) => setField('subtitle', v)}
              placeholder="e.g. 120+ models"
            />
            {/* Searchable icon picker — type to filter, click to select.
                Stored value is the Lucide name (string) so CategoryGrid can
                resolve it via the shared categoryIconMap. */}
            <IconPicker value={modal.item.icon} onChange={(v) => setField('icon', v)} />
            {/* Accent flag: makes gaming/special categories visually highlighted */}
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={modal.item.accent || false}
                onChange={(e) => setField('accent', e.target.checked)}
                className="w-4 h-4 accent-hp-blue"
              />
              Mark as accent (visually highlighted category)
            </label>

            {/* Subcategories — admins can define children of this category so
                products can be tagged and filtered at a finer level. */}
            <SubcategoriesEditor
              rows={modal.item.subcategories || []}
              onChange={(rows) => setField('subcategories', rows)}
            />

            {err && (
              <div className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg">{err}</div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex-1 py-2.5 rounded-full text-sm disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Category'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
