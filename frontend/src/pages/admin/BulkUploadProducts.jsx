import { useRef, useState, useMemo, useEffect } from 'react';
import {
  Upload, X, FileText, CheckCircle2, AlertCircle, Loader2, Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useBulkCreateProducts, useAdminCategories } from '../../hooks/queries.js';
import { SPEC_TEMPLATES, buildTemplateHeaders } from '../../config/specTemplates.js';

// BulkUploadProducts — CSV/Excel bulk-import modal rendered inside AdminProducts.
// Admin picks a category (and optionally a subcategory) from the categories
// configured in /admin/categories, downloads the matching template, fills it
// in as .csv or .xlsx, and uploads. The backend accepts arbitrary `specs`
// (Mixed) so each category can carry its own spec columns without any
// server-side change.
//
// The picked category (and subcategory, when chosen) is stamped onto every
// row — the file itself doesn't carry a Category column, which prevents
// admins from accidentally mixing families inside one upload.

// Column aliases that map file headers to Product schema fields. Anything
// not listed here and not a URL lands in `specs`.
const FIELD_ALIASES = {
  name:        ['name', 'model', 'product', 'product_name', 'product name'],
  series:      ['series', 'brand', 'family'],
  category:    ['category'],
  subcategory: ['subcategory', 'sub_category', 'sub category', 'sub-category'],
  mrp:         ['mrp', 'mop', 'list_price', 'original_price', 'market_price'],
  price:       ['price', 'offer_price', 'offer price', 'selling_price', 'final_price'],
  stock:       ['stock', 'qty', 'quantity', 'inventory'],
  badge:       ['badge', 'label'],
  description: ['description', 'desc', 'about'],
};
const RESERVED_KEYS = new Set(
  Object.values(FIELD_ALIASES).flat().map((k) => k.toLowerCase())
);

const URL_RE = /^https?:\/\//i;

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Parse a File (.csv or .xlsx) into an array of header-keyed row objects.
// Uses SheetJS for both formats — it handles CSVs cleanly and means we
// don't have to keep two separate parsers in sync.
async function parseFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) throw new Error('The file has no worksheets.');
  const sheet = wb.Sheets[firstSheet];
  // defval keeps blank cells as '' so downstream mapping doesn't trip on
  // undefined. raw:false forces dates/numbers to display strings so we
  // can trim them consistently.
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  if (!rows.length) {
    throw new Error('The file looks empty — make sure it has a header row plus at least one product row.');
  }
  // Strip BOM on the first header if present (can show up in CSV exports).
  const cleaned = rows.map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      const key = (k || '').replace(/^\uFEFF/, '').trim();
      if (!key) continue;
      out[key] = v == null ? '' : String(v).trim();
    }
    return out;
  });
  return cleaned;
}

function mapRow(raw, forcedCategory = '', forcedSubcategory = '') {
  const lowerToKey = {};
  for (const k of Object.keys(raw)) lowerToKey[k.toLowerCase().trim()] = k;
  const pick = (aliases) => {
    for (const a of aliases) {
      const key = lowerToKey[a.toLowerCase()];
      if (key && raw[key] != null && raw[key] !== '') return raw[key];
    }
    return '';
  };

  const images = [];
  for (const v of Object.values(raw)) {
    if (typeof v === 'string' && URL_RE.test(v.trim())) images.push(v.trim());
  }

  const specs = {};
  for (const [k, v] of Object.entries(raw)) {
    const lk = k.toLowerCase().trim();
    if (!lk) continue;
    if (RESERVED_KEYS.has(lk)) continue;
    if (URL_RE.test(String(v).trim())) continue;
    const val = String(v ?? '').trim();
    if (val) specs[k.trim()] = val;
  }

  // Subcategory: picker wins. If the admin left the subcategory dropdown
  // on "any" we fall back to whatever the row carries (slugified), so the
  // CSV's Sub Category column still works for mixed-subcategory uploads.
  const sub = forcedSubcategory || slugify(pick(FIELD_ALIASES.subcategory));

  return {
    name:        pick(FIELD_ALIASES.name).trim(),
    series:      pick(FIELD_ALIASES.series).trim(),
    category:    forcedCategory || slugify(pick(FIELD_ALIASES.category)),
    subcategory: sub,
    mrp:         Number(pick(FIELD_ALIASES.mrp))   || 0,
    price:       Number(pick(FIELD_ALIASES.price)) || 0,
    stock:       Number(pick(FIELD_ALIASES.stock)) || 0,
    badge:       pick(FIELD_ALIASES.badge).trim(),
    description: pick(FIELD_ALIASES.description).trim(),
    specs,
    images,
  };
}

// Mirror of the backend validator — flags rows in the preview before
// upload. Kept intentionally aligned with validateAndNormalizeProduct.
function validateRow(row) {
  const errors = [];
  if (!row.name)                                      errors.push('Name');
  else if (row.name.length > 200)                     errors.push('Name > 200 chars');
  if (!row.category)                                  errors.push('Category');
  if (!Number.isFinite(row.mrp)   || row.mrp   <= 0)  errors.push('MRP');
  if (!Number.isFinite(row.price) || row.price <= 0)  errors.push('Price');
  if (Number.isFinite(row.mrp) && Number.isFinite(row.price) && row.price > row.mrp) {
    errors.push('Price > MRP');
  }
  if (Number.isFinite(row.stock) && row.stock < 0)    errors.push('Stock < 0');
  if (!row.images || row.images.length < 1)           errors.push('Image');
  if (row.images && row.images.length > 8)            errors.push('> 8 images');
  return errors;
}

// Build a one-row example payload for the template. Most cells are empty
// placeholders — giving the admin at least one filled sample row makes
// the template self-explanatory in Excel.
function buildSampleRow(headers) {
  const sample = {};
  for (const h of headers) sample[h] = '';
  // Fill a realistic example for the shared core columns so admins can
  // see the expected number format / URL shape at a glance.
  if ('Series'       in sample) sample.Series       = 'HP ExampleSeries';
  if ('Model'        in sample) sample.Model        = 'HP Example Model X1';
  if ('Sub Category' in sample) sample['Sub Category'] = '';
  if ('MOP'          in sample) sample.MOP          = '99999';
  if ('Offer Price'  in sample) sample['Offer Price']  = '89999';
  if ('Stock'        in sample) sample.Stock        = '10';
  if ('Image1'       in sample) sample.Image1       = 'https://example.com/1.png';
  if ('Image2'       in sample) sample.Image2       = 'https://example.com/2.png';
  if ('Image3'       in sample) sample.Image3       = 'https://example.com/3.png';
  return sample;
}

function downloadTemplate(categorySlug, fmt) {
  const headers = buildTemplateHeaders(categorySlug);
  const sample  = buildSampleRow(headers);
  const ws = XLSX.utils.json_to_sheet([sample], { header: headers });
  if (fmt === 'xlsx') {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, `product-bulk-template-${categorySlug}.xlsx`);
  } else {
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-bulk-template-${categorySlug}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

export default function BulkUploadProducts({ open, onClose }) {
  const fileRef = useRef(null);
  const [category, setCategory]       = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [records, setRecords]         = useState([]);
  const [fileName, setFileName]       = useState('');
  const [parseError, setParseError]   = useState('');
  const [result, setResult]           = useState(null);
  const mutation = useBulkCreateProducts();

  const { data: catsData } = useAdminCategories();
  const allCategories = Array.isArray(catsData) ? catsData : (catsData?.categories || []);

  const activeCat = useMemo(
    () => allCategories.find((c) => c.slug === category) || null,
    [allCategories, category],
  );
  const subOptions = activeCat?.subcategories || [];
  // Spec columns baked into the template for the picked category.
  const previewSpecKeys = SPEC_TEMPLATES[category] || [];

  // Auto-pick the first category once the list loads — saves a click
  // when the admin just wants to bulk upload.
  useEffect(() => {
    if (!category && allCategories.length > 0) {
      setCategory(allCategories[0].slug);
    }
  }, [allCategories, category]);

  // If the picked subcategory isn't valid for the new parent, drop it.
  useEffect(() => {
    if (!subcategory) return;
    if (!subOptions.some((s) => s.slug === subcategory)) setSubcategory('');
  }, [subcategory, subOptions]);

  const reset = () => {
    setRecords([]); setFileName(''); setParseError(''); setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };
  const hardReset = () => {
    setCategory('');
    setSubcategory('');
    reset();
  };
  const handleClose = () => { hardReset(); onClose(); };

  const handleFile = async (file) => {
    if (!file) return;
    if (!category) {
      setParseError('Pick a product category first, then upload the matching template.');
      return;
    }
    setParseError(''); setResult(null);
    try {
      const raw = await parseFile(file);
      setRecords(raw.map((r) => mapRow(r, category, subcategory)));
      setFileName(file.name);
    } catch (e) {
      setParseError(e.message || 'Could not parse this file.');
      setRecords([]);
    }
  };

  // Re-map already-parsed rows when the admin changes the subcategory
  // after upload — avoids forcing them to re-pick the file.
  useEffect(() => {
    if (!records.length) return;
    setRecords((prev) =>
      prev.map((r) => ({
        ...r,
        category,
        subcategory: subcategory || r.subcategory,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subcategory]);

  const validCount   = records.filter((r) => validateRow(r).length === 0).length;
  const invalidCount = records.length - validCount;

  const handleUpload = async () => {
    if (!validCount) return;
    try {
      const onlyValid = records.filter((r) => validateRow(r).length === 0);
      const res = await mutation.mutateAsync(onlyValid);
      setResult(res);
    } catch (e) {
      setResult({ created: 0, failed: [{ error: e?.response?.data?.message || 'Upload failed' }], total: validCount });
    }
  };

  // Switching category invalidates the column set, so parsed rows have
  // to go — the preview would otherwise show mismatched specs.
  const pickCategory = (slug) => {
    setCategory(slug);
    setSubcategory('');
    reset();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-hp-blue" />
              <h2 className="font-display font-bold text-hp-ink">Bulk upload products</h2>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {!result && (
              <>
                {/* Step 1 — category + (optional) subcategory */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="text-sm text-slate-700">
                    <div className="font-semibold">1. Pick a category</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      The chosen category (and subcategory, if selected) is stamped onto every row. Each category has its own template so you only fill in the columns that matter.
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block text-sm">
                      <span className="text-slate-600 mb-1 block">Category</span>
                      <select
                        value={category}
                        onChange={(e) => pickCategory(e.target.value)}
                        disabled={allCategories.length === 0}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm bg-white disabled:opacity-50"
                      >
                        {allCategories.length === 0 && <option value="">Loading…</option>}
                        {allCategories.map((c) => (
                          <option key={c.slug} value={c.slug}>{c.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm">
                      <span className="text-slate-600 mb-1 block">
                        Subcategory {subOptions.length === 0 && <span className="text-slate-400">(none defined)</span>}
                      </span>
                      <select
                        value={subcategory}
                        onChange={(e) => setSubcategory(e.target.value)}
                        disabled={subOptions.length === 0}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm bg-white disabled:opacity-50"
                      >
                        <option value="">
                          {subOptions.length === 0 ? '—' : 'Use Sub Category column from file'}
                        </option>
                        {subOptions.map((s) => (
                          <option key={s.slug} value={s.slug}>{s.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {category && (
                    <div className="text-xs text-slate-500">
                      Template columns:{' '}
                      <span className="font-mono text-slate-700">
                        Series, Model, Sub Category, MOP, Offer Price, Stock
                        {previewSpecKeys.length > 0 && `, ${previewSpecKeys.join(', ')}`}
                        , Image1, Image2, Image3
                      </span>
                    </div>
                  )}
                </div>

                {/* Step 2 — download template + upload file */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="text-sm text-slate-700">
                      <div className="font-semibold">2. Upload CSV or Excel</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Column names are case-insensitive. Any cell with a <span className="font-mono">http(s)://</span> URL is treated as a product image.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadTemplate(category, 'csv')}
                        disabled={!category}
                        className="inline-flex items-center gap-1.5 text-xs text-hp-blue hover:underline font-semibold disabled:opacity-40 disabled:hover:no-underline"
                      >
                        <Download className="w-3.5 h-3.5" /> Template (.csv)
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() => downloadTemplate(category, 'xlsx')}
                        disabled={!category}
                        className="inline-flex items-center gap-1.5 text-xs text-hp-blue hover:underline font-semibold disabled:opacity-40 disabled:hover:no-underline"
                      >
                        <Download className="w-3.5 h-3.5" /> Template (.xlsx)
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={!category}
                      className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-4 h-4" /> {fileName ? 'Replace file' : 'Upload file'}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      className="hidden"
                      onChange={(e) => handleFile(e.target.files?.[0])}
                    />
                    {fileName && (
                      <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> {fileName}
                      </span>
                    )}
                  </div>

                  {parseError && (
                    <div className="text-sm text-accent-red bg-red-50 border border-red-100 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {parseError}
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="font-semibold text-sm text-hp-ink">Column mapping reference</div>
                  <ul className="text-xs text-slate-600 mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 list-disc pl-4">
                    <li><span className="font-mono">Model</span> / <span className="font-mono">Name</span> → product name <span className="text-accent-red">*</span></li>
                    <li>Category → taken from the picker above <span className="text-accent-red">*</span></li>
                    <li><span className="font-mono">MOP</span> / <span className="font-mono">MRP</span> → MRP <span className="text-accent-red">*</span></li>
                    <li><span className="font-mono">Offer Price</span> / <span className="font-mono">Price</span> → selling price <span className="text-accent-red">*</span></li>
                    <li><span className="font-mono">Series</span> → product series</li>
                    <li><span className="font-mono">Sub Category</span> → subcategory slug (overridden when picker is set)</li>
                    <li><span className="font-mono">Stock</span> / <span className="font-mono">Qty</span> → stock count</li>
                    <li>Any column with a URL value → image</li>
                    <li>Any other column → saved as a spec</li>
                  </ul>
                </div>

                {records.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 flex-wrap gap-2">
                      <div className="text-sm text-slate-700">
                        <span className="font-semibold">3. Preview</span>
                        <span className="text-slate-500 ml-2">
                          {records.length} rows parsed · {validCount} valid · {invalidCount > 0 && <span className="text-accent-red font-medium">{invalidCount} with errors</span>}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto max-h-80">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2">Row</th>
                            <th className="text-left px-3 py-2">Name</th>
                            <th className="text-left px-3 py-2">Category</th>
                            <th className="text-left px-3 py-2">Subcategory</th>
                            <th className="text-left px-3 py-2">Price</th>
                            <th className="text-left px-3 py-2">MRP</th>
                            <th className="text-left px-3 py-2">Images</th>
                            <th className="text-left px-3 py-2">Specs</th>
                            <th className="text-left px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((r, i) => {
                            const errors = validateRow(r);
                            const ok = errors.length === 0;
                            return (
                              <tr key={i} className={`border-t border-slate-100 ${ok ? '' : 'bg-red-50/50'}`}>
                                <td className="px-3 py-2 text-slate-400">{i + 2}</td>
                                <td className="px-3 py-2 font-medium text-hp-ink">{r.name || '—'}</td>
                                <td className="px-3 py-2">{r.category || '—'}</td>
                                <td className="px-3 py-2 text-slate-500">{r.subcategory || '—'}</td>
                                <td className="px-3 py-2">{r.price ? `₹${r.price.toLocaleString('en-IN')}` : '—'}</td>
                                <td className="px-3 py-2 text-slate-500">{r.mrp ? `₹${r.mrp.toLocaleString('en-IN')}` : '—'}</td>
                                <td className="px-3 py-2">{r.images?.length || 0}</td>
                                <td className="px-3 py-2">{Object.keys(r.specs || {}).length}</td>
                                <td className="px-3 py-2">
                                  {ok
                                    ? <span className="text-accent-mint inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</span>
                                    : <span className="text-accent-red inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Missing {errors.join(', ')}</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {result && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                    <div className="font-semibold text-hp-ink">Upload complete</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {result.created} of {result.total ?? (result.created + (result.failed?.length || 0))} products imported.
                    </div>
                  </div>
                  <div className="px-5 py-4 space-y-2">
                    <div className="text-sm text-accent-mint inline-flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Created: <span className="font-semibold">{result.created}</span>
                    </div>
                    {result.failed && result.failed.length > 0 && (
                      <div className="text-sm text-accent-red inline-flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                          <div>Failed: <span className="font-semibold">{result.failed.length}</span></div>
                          <ul className="mt-1 text-xs space-y-0.5 list-disc pl-4 max-h-48 overflow-y-auto">
                            {result.failed.map((f, i) => (
                              <li key={i}>
                                <span className="font-mono">Row {f.row || '?'}</span> ({f.name || '—'}): {f.error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <div className="text-xs text-slate-500 flex-1">
              Only rows with all required fields will be uploaded. Rows with errors stay unchanged.
            </div>
            {!result ? (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-full border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!validCount || mutation.isPending}
                  className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm disabled:opacity-50"
                >
                  {mutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                    : <>Upload {validCount} product{validCount === 1 ? '' : 's'}</>}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={reset}
                  className="px-4 py-2 rounded-full border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Upload another file
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-primary px-4 py-2 rounded-full text-sm"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
