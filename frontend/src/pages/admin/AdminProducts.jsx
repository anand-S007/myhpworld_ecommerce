import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, Package, Search, Upload, Link as LinkIcon, Loader2, Star, SlidersHorizontal, FileUp } from 'lucide-react';
import BulkUploadProducts from './BulkUploadProducts.jsx';
import { adminUploadImage } from '../../services/api.js';
import {
  useAdminProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useAdminCategories,
} from '../../hooks/queries.js';

// Empty product — rating/reviews are deliberately omitted from the form;
// they're aggregated from customer reviews submitted on the detail page.
const EMPTY = {
  name:        '',
  series:      '',
  category:    'laptops',
  subcategory: '',
  price:       '',
  mrp:         '',
  badge:       '',
  description: '',
  specs:       [],         // array of { key, value } rows in the form
  stock:       '',
  images:      ['', '', ''], // 3–8 images, each a URL or /uploads/* path
  visible:     true,         // storefront visibility — hide a product without deleting it
};

const MIN_IMAGES = 3;
const MAX_IMAGES = 8;

// Fallback category list used before the /admin/categories query resolves
// (or if no categories are configured yet).
const FALLBACK_CATEGORIES = ['laptops','desktops','printers','monitors','gaming','accessories','ink-toner'];

// Sort options exposed to admins. Keys match the backend's PRODUCT_SORTS map.
const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest first' },
  { value: 'oldest',     label: 'Oldest first' },
  { value: 'name-asc',   label: 'Name A → Z' },
  { value: 'name-desc',  label: 'Name Z → A' },
  { value: 'price-asc',  label: 'Price low → high' },
  { value: 'price-desc', label: 'Price high → low' },
  { value: 'stock-asc',  label: 'Stock low → high' },
  { value: 'stock-desc', label: 'Stock high → low' },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100];

// Standard spec keys per category. Picking a category pre-fills these rows
// with empty values so the admin only types the value column. Any missing
// key is appended — keys the admin has already filled are preserved.
const SPEC_TEMPLATES = {
  laptops:       ['Processor', 'RAM', 'Storage', 'Graphics', 'Screen', 'Operating System', 'Battery', 'Weight', 'Ports', 'Warranty'],
  desktops:      ['Processor', 'RAM', 'Storage', 'Graphics', 'Display', 'Operating System', 'Ports', 'Warranty'],
  printers:      ['Type', 'Print Speed', 'Print Resolution', 'Connectivity', 'Paper Size', 'Duplex', 'Warranty'],
  monitors:      ['Screen Size', 'Resolution', 'Panel Type', 'Refresh Rate', 'Response Time', 'Ports', 'Warranty'],
  gaming:        ['Processor', 'RAM', 'Storage', 'Graphics', 'Screen', 'Cooling', 'Keyboard', 'Operating System', 'Warranty'],
  accessories:   ['Type', 'Compatibility', 'Connectivity', 'Warranty'],
  'ink-toner':   ['Type', 'Compatible Printers', 'Yield (Pages)', 'Color', 'Warranty'],
};

// Merge a category's template into the existing rows: appends any standard
// key that isn't already present (case-insensitive match). Rows the admin
// has typed themselves are never touched.
function mergeTemplate(rows, category) {
  const tpl = SPEC_TEMPLATES[category] || [];
  const existing = new Set(rows.map((r) => (r.key || '').trim().toLowerCase()));
  const additions = tpl
    .filter((k) => !existing.has(k.toLowerCase()))
    .map((k) => ({ key: k, value: '' }));
  return [...rows, ...additions];
}

// ── Shared form helpers ───────────────────────────────────────────────────────

function Field({ label, value, onChange, type = 'text', placeholder, required, min }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 mb-1 block">{label}</span>
      <input
        type={type}
        required={required}
        min={min}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 mb-1 block">{label}</span>
      <textarea
        value={value ?? ''}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm resize-y"
      />
    </label>
  );
}

// Accepts either a string[] or [{ value, label }][] for options. Using
// `o.value || o` to read the value broke whenever an option's value was
// the empty string (e.g. "— All —") because `'' || o` returns the object.
function SelectField({ label, value, onChange, options, disabled }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 mb-1 block">{label}</span>
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400"
      >
        {options.map((o) => {
          const val  = typeof o === 'string' ? o : o.value;
          const text = typeof o === 'string' ? o : (o.label ?? o.value);
          return <option key={String(val)} value={val}>{text}</option>;
        })}
      </select>
    </label>
  );
}

// SpecsEditor — row-based specifications editor. Each row is a { key, value }
// pair; admins don't have to know JSON. Emits the current rows via onChange.
// If `onLoadTemplate` is passed, shows a button that fills in the standard
// keys for the current category so only values need to be typed.
function SpecsEditor({ rows, onChange, onLoadTemplate, templateLabel }) {
  const add    = () => onChange([...rows, { key: '', value: '' }]);
  const update = (i, k, v) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <span className="text-sm text-slate-600">Specifications</span>
        <div className="flex items-center gap-3">
          {onLoadTemplate && (
            <button
              type="button"
              onClick={onLoadTemplate}
              title={`Fill in standard spec keys for ${templateLabel}`}
              className="inline-flex items-center gap-1 text-xs text-hp-blue hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Load {templateLabel} template
            </button>
          )}
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1 text-xs text-hp-blue hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Add row
          </button>
        </div>
      </div>
      {rows.length === 0 && (
        <div className="text-xs text-slate-400 px-3 py-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center">
          No specs yet. Click "Load template" to auto-fill standard keys, or "Add row" for custom ones.
        </div>
      )}
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
            <input
              value={r.key}
              onChange={(e) => update(i, 'key', e.target.value)}
              placeholder="Display"
              className="h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
            />
            <input
              value={r.value}
              onChange={(e) => update(i, 'value', e.target.value)}
              placeholder={'15.6" FHD IPS'}
              className="h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="w-10 h-10 rounded-lg text-slate-400 hover:text-accent-red hover:bg-red-50 grid place-items-center"
              title="Remove row"
              aria-label="Remove spec row"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ImageSlot — one entry in the ImagesEditor. The admin picks per-slot
// whether to paste a URL or upload a file. Both flows write a single string
// (the image URL) back up to the parent, which keeps the stored shape
// simple: `images: string[]`.
function ImageSlot({ index, value, onChange, onRemove, canRemove, onUpload }) {
  const [mode, setMode] = useState(value?.startsWith('/uploads/') ? 'upload' : 'url');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const handleFile = async (file) => {
    setErr('');
    setUploading(true);
    try {
      const res = await onUpload(file);
      onChange(res.url);
      setMode('upload');
    } catch (e) {
      setErr(e?.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-widest text-slate-500">
          Image {index + 1}
        </span>
        <div className="flex items-center gap-1">
          {[
            { val: 'url',    label: 'URL',    icon: LinkIcon },
            { val: 'upload', label: 'Upload', icon: Upload },
          ].map(({ val, label, icon: Icon }) => (
            <button
              key={val}
              type="button"
              onClick={() => { setMode(val); onChange(''); setErr(''); }}
              className={`inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-medium border transition-colors ${
                mode === val
                  ? 'bg-hp-blue text-white border-hp-blue'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-hp-blue hover:text-hp-blue'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            className="w-7 h-7 grid place-items-center rounded-full text-slate-400 hover:text-accent-red hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            title={canRemove ? 'Remove image' : 'Cannot remove — minimum 3 required'}
            aria-label="Remove image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {mode === 'url' ? (
        <input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
        />
      ) : (
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-hp-blue/10 file:text-hp-blue hover:file:bg-hp-blue/20"
        />
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
        </div>
      )}
      {err && <div className="text-xs text-accent-red">{err}</div>}
      {value && !uploading && (
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <img src={value} alt="" className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
          <span className="truncate">{value}</span>
        </div>
      )}
    </div>
  );
}

// ImagesEditor — product image manager. Enforces 3–8 images; each slot is
// either a pasted URL or an uploaded file.
function ImagesEditor({ value, onChange, min = 3, max = 8, onUpload }) {
  const list = Array.isArray(value) ? value : [];
  const short = list.filter(Boolean).length < min;

  const setAt = (i, src) => {
    const next = list.slice();
    next[i] = src;
    onChange(next);
  };
  const removeAt = (i) => {
    const next = list.slice();
    next.splice(i, 1);
    onChange(next);
  };
  const add = () => {
    if (list.length >= max) return;
    onChange([...list, '']);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm text-slate-600">Product images</div>
          <div className={`text-xs ${short ? 'text-accent-red' : 'text-slate-400'}`}>
            {list.filter(Boolean).length} added · {min}–{max} required
          </div>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={list.length >= max}
          className="inline-flex items-center gap-1 text-xs text-hp-blue hover:underline disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" /> Add image
        </button>
      </div>
      <div className="space-y-2">
        {list.map((src, i) => (
          <ImageSlot
            key={i}
            index={i}
            value={src}
            onChange={(v) => setAt(i, v)}
            onRemove={() => removeAt(i)}
            canRemove={list.length > min}
            onUpload={onUpload}
          />
        ))}
      </div>
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

// Helpers: convert the stored product.specs (object/map/JSON string) to the
// row-based shape the SpecsEditor expects, and back.
function specsToRows(specs) {
  if (!specs) return [];
  if (Array.isArray(specs)) return specs;
  if (typeof specs === 'string') {
    try { return Object.entries(JSON.parse(specs)).map(([key, value]) => ({ key, value: String(value) })); }
    catch { return []; }
  }
  if (typeof specs === 'object') {
    return Object.entries(specs).map(([key, value]) => ({ key, value: String(value) }));
  }
  return [];
}
function rowsToSpecs(rows) {
  return rows
    .filter((r) => r.key?.trim() && (r.value ?? '').toString().trim())
    .reduce((acc, r) => { acc[r.key.trim()] = r.value.toString().trim(); return acc; }, {});
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminProducts() {
  // ── Filter / sort / pagination state ───────────────────────────────────────
  const [search, setSearch]                   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory]   = useState('');
  const [filterSub, setFilterSub]             = useState('');
  const [sort, setSort]                       = useState('newest');
  const [limit, setLimit]                     = useState(25);
  const [page, setPage]                       = useState(1);

  const [modal, setModal] = useState({ open: false, mode: 'add', item: EMPTY });
  const [err, setErr]     = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);

  // Debounce the search input so every keystroke doesn't hit the API.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever any filter changes — otherwise narrowing the
  // result set can leave the admin stranded on an empty page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterCategory, filterSub, sort, limit]);

  // Clear the subcategory filter if it's no longer valid for the chosen
  // parent category.
  useEffect(() => {
    if (!filterCategory) { setFilterSub(''); }
  }, [filterCategory]);

  // ── Categories + subcategories (for form + filter dropdowns) ───────────────
  const { data: catsData } = useAdminCategories();
  const allCategories = Array.isArray(catsData) ? catsData : (catsData?.categories || []);
  const categoryOptionsForForm = allCategories.length > 0
    ? allCategories.map((c) => ({ value: c.slug, label: c.name }))
    : FALLBACK_CATEGORIES;
  const filterCategoryOptions = [
    { value: '', label: '— All categories —' },
    ...(allCategories.length > 0
      ? allCategories.map((c) => ({ value: c.slug, label: c.name }))
      : FALLBACK_CATEGORIES.map((s) => ({ value: s, label: s }))),
  ];
  const filterCatObj = allCategories.find((c) => c.slug === filterCategory);
  const filterSubOptions = [
    { value: '', label: filterCatObj?.subcategories?.length ? '— All subcategories —' : '—' },
    ...(filterCatObj?.subcategories || []).map((s) => ({ value: s.slug, label: s.name })),
  ];

  // ── Products query (server-side filter/sort/paginate) ──────────────────────
  const queryParams = useMemo(() => ({
    page,
    limit,
    search:      debouncedSearch || undefined,
    category:    filterCategory  || undefined,
    subcategory: filterSub       || undefined,
    sort,
  }), [page, limit, debouncedSearch, filterCategory, filterSub, sort]);

  const { data, isLoading: loading } = useAdminProducts(queryParams);
  const products   = Array.isArray(data) ? data : (data?.products || []);
  const totalPages = Array.isArray(data) ? 1 : (data?.totalPages || 1);
  const total      = Array.isArray(data) ? products.length : (data?.total ?? products.length);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const saving = createMutation.isPending || updateMutation.isPending;

  // Build the form's images array when opening an existing product:
  // prefer the new `images[]`, fall back to the legacy single `imageUrl`,
  // and pad up to the minimum so admins see at least 3 slots out of the box.
  const seedImages = (item) => {
    const existing =
      Array.isArray(item.images) && item.images.length > 0
        ? item.images.filter(Boolean)
        : (item.imageUrl ? [item.imageUrl] : []);
    return existing.length < MIN_IMAGES
      ? [...existing, ...Array(MIN_IMAGES - existing.length).fill('')]
      : existing;
  };

  const openAdd = () =>
    setModal({
      open: true,
      mode: 'add',
      item: {
        ...EMPTY,
        subcategory: '',
        specs: mergeTemplate([], EMPTY.category),
        images: ['', '', ''],
      },
    });

  const openEdit = (item) =>
    setModal({
      open: true,
      mode: 'edit',
      item: {
        ...EMPTY,
        ...item,
        specs: specsToRows(item.specs),
        images: seedImages(item),
      },
    });

  const closeModal = () => {
    setModal({ open: false, mode: 'add', item: EMPTY });
    setErr('');
  };

  const setField = (key, val) =>
    setModal((m) => ({ ...m, item: { ...m.item, [key]: val } }));

  const handleSave = async (e) => {
    e.preventDefault();
    setErr('');
    const { item, mode } = modal;
    const cleanImages = (item.images || []).map((s) => (s || '').trim()).filter(Boolean);
    if (cleanImages.length < MIN_IMAGES || cleanImages.length > MAX_IMAGES) {
      setErr(`Please add between ${MIN_IMAGES} and ${MAX_IMAGES} images (you have ${cleanImages.length}).`);
      return;
    }
    try {
      const payload = {
        ...item,
        price:  Number(item.price),
        mrp:    Number(item.mrp),
        stock:  Number(item.stock || 0),
        specs:  rowsToSpecs(item.specs || []),
        images: cleanImages,
      };
      // Don't let admins overwrite customer-driven aggregates on create.
      delete payload.rating;
      delete payload.reviews;
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
    if (!window.confirm(`Delete product "${item.name}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(item._id || item.id);
    } catch {
      alert('Delete failed.');
    }
  };

  const hasActiveFilter =
    !!debouncedSearch || !!filterCategory || !!filterSub || sort !== 'newest';
  const clearFilters = () => {
    setSearch('');
    setFilterCategory('');
    setFilterSub('');
    setSort('newest');
  };

  // Count of visible rows shown in the "Showing X–Y of N" label below.
  const firstRow = total === 0 ? 0 : (page - 1) * limit + 1;
  const lastRow  = Math.min(page * limit, total);

  return (
    <>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Package className="w-5 h-5 text-hp-blue shrink-0" />
          <h1 className="font-display text-xl sm:text-2xl font-bold text-hp-ink truncate">Products</h1>
          {!loading && (
            <span className="text-sm text-slate-400 ml-1">({total.toLocaleString('en-IN')} total)</span>
          )}
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 text-slate-700 text-sm hover:border-hp-blue hover:text-hp-blue"
            title="Import multiple products from a CSV file"
          >
            <FileUp className="w-4 h-4" /> Bulk upload
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-full text-sm">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Filter toolbar: category + subcategory + sort + search. All filters
          run server-side; page resets to 1 whenever a filter changes. */}
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-2 mb-3 text-slate-600">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-xs text-hp-blue hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search — debounced so server isn't hit every keystroke */}
          <label className="block text-sm lg:col-span-2">
            <span className="text-slate-600 mb-1 block">Search</span>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or series…"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
              />
            </div>
          </label>

          <SelectField
            label="Category"
            value={filterCategory}
            onChange={setFilterCategory}
            options={filterCategoryOptions}
          />

          <SelectField
            label="Subcategory"
            value={filterSub}
            onChange={setFilterSub}
            disabled={!filterCatObj?.subcategories?.length}
            options={filterSubOptions}
          />

          <SelectField
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={SORT_OPTIONS}
          />
        </div>
      </div>

      {/* Products table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-3 sm:px-4 py-3">Product</th>
                  <th className="text-left px-3 sm:px-4 py-3 hidden sm:table-cell">Category</th>
                  <th className="text-left px-3 sm:px-4 py-3 hidden md:table-cell">Subcategory</th>
                  <th className="text-left px-3 sm:px-4 py-3">Price</th>
                  <th className="text-left px-3 sm:px-4 py-3 hidden md:table-cell">MRP</th>
                  <th className="text-left px-3 sm:px-4 py-3 hidden lg:table-cell">Rating</th>
                  <th className="text-left px-3 sm:px-4 py-3 hidden lg:table-cell">Stock</th>
                  <th className="px-3 sm:px-4 py-3 w-16 sm:w-20"></th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400 text-sm">
                      {hasActiveFilter ? 'No products match the current filters.' : 'No products yet.'}
                    </td>
                  </tr>
                )}
                {products.map((p) => (
                  <tr key={p._id || p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 sm:px-4 py-3">
                      <div className="font-medium text-hp-ink break-words flex items-center gap-2 flex-wrap">
                        {p.name}
                        {p.visible === false && (
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">
                            Hidden
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{p.series}</div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs bg-hp-blue/10 text-hp-blue px-2 py-0.5 rounded capitalize whitespace-nowrap">{p.category}</span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-xs text-slate-600 capitalize">
                      {p.subcategory || <span className="text-slate-300">–</span>}
                    </td>
                    <td className="px-3 sm:px-4 py-3 font-semibold text-hp-ink whitespace-nowrap">
                      ₹{Number(p.price).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-slate-500 hidden md:table-cell line-through whitespace-nowrap">
                      ₹{Number(p.mrp).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-slate-500 hidden lg:table-cell whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {p.rating || 0} ({(p.reviews || 0).toLocaleString('en-IN')})
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 hidden lg:table-cell">
                      <span className={p.stock < 10 ? 'text-accent-red font-medium' : 'text-slate-500'}>
                        {p.stock ?? '–'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(p)} className="p-2 sm:p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-hp-blue" title="Edit" aria-label="Edit product">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p)} className="p-2 sm:p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-accent-red" title="Delete" aria-label="Delete product">
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

        {total > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <div className="flex items-center gap-4 flex-wrap">
              <span>
                Showing <span className="font-medium text-hp-ink">{firstRow.toLocaleString('en-IN')}</span>
                –<span className="font-medium text-hp-ink">{lastRow.toLocaleString('en-IN')}</span>
                {' '}of <span className="font-medium text-hp-ink">{total.toLocaleString('en-IN')}</span>
              </span>
              <label className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Rows</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="h-8 px-2 rounded-lg border border-slate-200 text-sm bg-white focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-xs"
                title="First page"
              >
                « First
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="px-2">Page <span className="font-medium text-hp-ink">{page}</span> of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                Next →
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-xs"
                title="Last page"
              >
                Last »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk upload modal */}
      <BulkUploadProducts open={bulkOpen} onClose={() => setBulkOpen(false)} />

      {/* Add / Edit product modal */}
      {modal.open && (
        <Modal title={modal.mode === 'add' ? 'Add Product' : 'Edit Product'} onClose={closeModal}>
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Series" value={modal.item.series} onChange={(v) => setField('series', v)} placeholder="e.g. HP Pavilion" />
            <Field label="Product name *" value={modal.item.name} onChange={(v) => setField('name', v)} required placeholder="e.g. HP Pavilion 15 · Core i5 · 16GB · 512GB" />
            <SelectField
              label="Category"
              value={modal.item.category}
              onChange={(v) =>
                setModal((m) => {
                  // Switching category invalidates any subcategory that doesn't
                  // belong to the new parent — drop it so the admin picks again.
                  const nextCat = allCategories.find((c) => c.slug === v);
                  const subs    = nextCat?.subcategories || [];
                  const keepSub = subs.some((s) => s.slug === m.item.subcategory) ? m.item.subcategory : '';
                  return {
                    ...m,
                    item: {
                      ...m.item,
                      category:    v,
                      subcategory: keepSub,
                      specs:       mergeTemplate(m.item.specs || [], v),
                    },
                  };
                })
              }
              options={categoryOptionsForForm}
            />

            {(() => {
              const cat = allCategories.find((c) => c.slug === modal.item.category);
              const subs = cat?.subcategories || [];
              return (
                <SelectField
                  label={subs.length > 0 ? 'Subcategory' : 'Subcategory (none defined for this category)'}
                  value={modal.item.subcategory}
                  onChange={(v) => setField('subcategory', v)}
                  disabled={subs.length === 0}
                  options={[
                    { value: '', label: subs.length > 0 ? '— None —' : '— Not applicable —' },
                    ...subs.map((s) => ({ value: s.slug, label: s.name })),
                  ]}
                />
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (₹) *" type="number" min="0" value={modal.item.price} onChange={(v) => setField('price', v)} required placeholder="62990" />
              <Field label="MRP (₹) *"   type="number" min="0" value={modal.item.mrp}   onChange={(v) => setField('mrp', v)}   required placeholder="79990" />
            </div>

            <Field label="Stock quantity" type="number" min="0" value={modal.item.stock} onChange={(v) => setField('stock', v)} placeholder="0" />
            <Field label="Badge (optional)" value={modal.item.badge} onChange={(v) => setField('badge', v)} placeholder="e.g. BESTSELLER, NEW, SAVE 22%" />

            <TextArea label="Description" value={modal.item.description} onChange={(v) => setField('description', v)} placeholder="Full product description…" />

            <SpecsEditor
              rows={modal.item.specs || []}
              onChange={(rows) => setField('specs', rows)}
              templateLabel={modal.item.category}
              onLoadTemplate={() =>
                setField('specs', mergeTemplate(modal.item.specs || [], modal.item.category))
              }
            />

            <ImagesEditor
              value={modal.item.images}
              onChange={(imgs) => setField('images', imgs)}
              min={MIN_IMAGES}
              max={MAX_IMAGES}
              onUpload={adminUploadImage}
            />

            {/* Visibility toggle — when off, the product is hidden from the
                storefront (shop, product detail, featured, deal) but stays
                listed here so it can be re-enabled or edited. */}
            <label className="flex items-start gap-3 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={modal.item.visible !== false}
                onChange={(e) => setField('visible', e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-hp-blue"
              />
              <span>
                <span className="font-medium text-hp-ink block">Visible on storefront</span>
                <span className="text-xs text-slate-500">
                  Uncheck to temporarily hide this product from customers without deleting it.
                </span>
              </span>
            </label>

            {/* Read-only rating/reviews — populated by customers via the
                product detail page, not editable here. */}
            {modal.mode === 'edit' && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>
                  Customer rating: {modal.item.rating || 0} from {(modal.item.reviews || 0).toLocaleString('en-IN')} reviews
                </span>
                <span className="ml-auto text-slate-400">
                  Updated automatically when customers review the product.
                </span>
              </div>
            )}

            {err && !err.toLowerCase().includes('upload') && (
              <div className="text-sm text-accent-red bg-red-50 px-3 py-2 rounded-lg">{err}</div>
            )}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 rounded-full text-sm disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Product'}
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

