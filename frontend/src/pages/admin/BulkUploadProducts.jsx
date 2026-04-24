import { useRef, useState } from 'react';
import {
  Upload, X, FileText, CheckCircle2, AlertCircle, Loader2, Download,
} from 'lucide-react';
import { useBulkCreateProducts } from '../../hooks/queries.js';

// BulkUploadProducts — CSV bulk-import modal rendered inside AdminProducts.
// Parses the CSV client-side, maps headers to the Product schema, shows a
// preview, and posts the whole batch to /api/admin/products/bulk. Backend
// validates + inserts row-by-row so a few bad rows don't kill the upload.

// Column aliases — case-insensitive. Any CSV header that matches one of
// these names maps to the schema field. Everything else that has a value
// (and isn't a URL) flows into `specs`.
// Column aliases that map CSV headers to Product schema fields. Anything
// not listed here is kept as a `spec` entry (Processor, RAM, Screen, etc.).
// `Purpose` stays as a spec by default — if you want it stored as a badge,
// rename the CSV column to `Badge` instead.
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

// Minimal RFC-4180-ish parser. Handles quoted fields, embedded commas, and
// escaped double-quotes. Enough for HP's catalog exports without pulling
// in papaparse as a dependency.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (field !== '' || row.length) { row.push(field); rows.push(row); }
      row = []; field = '';
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ''));
}

function csvToObjects(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return { headers: [], records: [] };
  // Strip UTF-8 BOM if present on the first cell.
  const headers = rows[0].map((h, i) => (i === 0 ? h.replace(/^\uFEFF/, '') : h).trim());
  const records = rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      if (!h) return;                          // skip unnamed columns here
      obj[h] = (row[i] ?? '').toString().trim();
    });
    // Tail columns (no header) — often unnamed image URLs. Capture them
    // under synthetic keys so the URL-detection pass below picks them up.
    for (let i = headers.length; i < row.length; i++) {
      const v = (row[i] ?? '').toString().trim();
      if (v) obj[`__extra_${i}`] = v;
    }
    return obj;
  });
  return { headers, records };
}

const URL_RE = /^https?:\/\//i;

// Mirror of backend slugify — "HP Omnibook" → "hp-omnibook".
function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapRow(raw) {
  const lowerToKey = {};
  for (const k of Object.keys(raw)) lowerToKey[k.toLowerCase().trim()] = k;
  const pick = (aliases) => {
    for (const a of aliases) {
      const key = lowerToKey[a.toLowerCase()];
      if (key && raw[key] != null && raw[key] !== '') return raw[key];
    }
    return '';
  };

  // Any value that's a URL becomes an image, regardless of column name.
  const images = [];
  for (const v of Object.values(raw)) {
    if (typeof v === 'string' && URL_RE.test(v.trim())) images.push(v.trim());
  }

  // Everything else that isn't reserved / synthetic / URL becomes a spec.
  const specs = {};
  for (const [k, v] of Object.entries(raw)) {
    const lk = k.toLowerCase().trim();
    if (!lk || k.startsWith('__extra_')) continue;
    if (RESERVED_KEYS.has(lk)) continue;
    if (URL_RE.test(String(v).trim())) continue;
    const val = String(v ?? '').trim();
    if (val) specs[k.trim()] = val;
  }

  return {
    name:        pick(FIELD_ALIASES.name).trim(),
    series:      pick(FIELD_ALIASES.series).trim(),
    // Category + subcategory are slugified to match the canonical DB shape
    // (lowercase, hyphenated) — same rule the backend applies server-side.
    category:    slugify(pick(FIELD_ALIASES.category)),
    subcategory: slugify(pick(FIELD_ALIASES.subcategory)),
    mrp:         Number(pick(FIELD_ALIASES.mrp))   || 0,
    price:       Number(pick(FIELD_ALIASES.price)) || 0,
    stock:       Number(pick(FIELD_ALIASES.stock)) || 0,
    badge:       pick(FIELD_ALIASES.badge).trim(),
    description: pick(FIELD_ALIASES.description).trim(),
    specs,
    images,
  };
}

// Client-side validation mirrors the server — same messages so the preview
// flags problems before the user hits Upload. Kept intentionally aligned
// with `validateAndNormalizeProduct` on the backend.
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

// CSV sample matching the column layout the user already ships.
// Note: `Purpose` isn't a schema field — it's saved as a spec entry. Rename
// the column to `Badge` if you want it stored as the product badge instead.
const SAMPLE_CSV = [
  'Series,Model,Category,Sub Category,Purpose,MOP,Offer Price,Stock,Processor,RAM,Storage,Graphics,Additional Feature,Screen,Image1,Image2,Image3',
  'OmniBook Ultra Flip,HP OmniBook Ultra Flip 14-fh0369TU,Laptops,HP Omnibook,Super Premium,239700,219000,5,Intel Core Ultra 9 288V,32 GB LPDDR5x,2 TB SSD,Intel Arc Graphics,"Backlit keyboard, 9MP IR AI camera","14"" 3K OLED 48-120 Hz",https://example.com/1.png,https://example.com/2.png,https://example.com/3.png',
].join('\n');

export default function BulkUploadProducts({ open, onClose }) {
  const fileRef = useRef(null);
  const [records, setRecords]   = useState([]);          // mapped payloads
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [result, setResult]     = useState(null);        // { created, failed }
  const mutation = useBulkCreateProducts();

  const reset = () => {
    setRecords([]); setFileName(''); setParseError(''); setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };
  const handleClose = () => { reset(); onClose(); };

  const handleFile = async (file) => {
    if (!file) return;
    setParseError(''); setResult(null);
    try {
      const text = await file.text();
      const { records: raw, headers } = csvToObjects(text);
      if (!raw.length) throw new Error('The CSV looks empty — make sure it has a header row plus at least one product row.');
      if (!headers.length) throw new Error('Missing header row.');
      const mapped = raw.map(mapRow);
      setRecords(mapped);
      setFileName(file.name);
    } catch (e) {
      setParseError(e.message || 'Could not parse this CSV.');
      setRecords([]);
    }
  };

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

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'product-bulk-template.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden">
          {/* Header */}
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
            {/* Step 1 — pick a CSV */}
            {!result && (
              <>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="text-sm text-slate-700">
                      <div className="font-semibold">1. Choose a CSV file</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Column names are case-insensitive. Any cell with a <span className="font-mono">http(s)://</span> URL is treated as a product image.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={downloadSample}
                      className="inline-flex items-center gap-1.5 text-xs text-hp-blue hover:underline font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" /> Download sample CSV
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                    >
                      <Upload className="w-4 h-4" /> {fileName ? 'Replace file' : 'Upload CSV'}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,text/csv"
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

                {/* Column mapping reference */}
                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="font-semibold text-sm text-hp-ink">Column mapping reference</div>
                  <ul className="text-xs text-slate-600 mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 list-disc pl-4">
                    <li><span className="font-mono">Model</span> / <span className="font-mono">Name</span> → product name <span className="text-accent-red">*</span></li>
                    <li><span className="font-mono">Category</span> → category slug <span className="text-accent-red">*</span></li>
                    <li><span className="font-mono">MOP</span> / <span className="font-mono">MRP</span> → MRP <span className="text-accent-red">*</span></li>
                    <li><span className="font-mono">Offer Price</span> / <span className="font-mono">Price</span> → selling price <span className="text-accent-red">*</span></li>
                    <li><span className="font-mono">Series</span> → product series</li>
                    <li><span className="font-mono">Subcategory</span> / <span className="font-mono">Purpose</span> → subcategory slug</li>
                    <li><span className="font-mono">Stock</span> / <span className="font-mono">Qty</span> → stock count</li>
                    <li>Any column with a URL value → image</li>
                    <li>Any other column (Processor, RAM, Screen, …) → saved as a spec</li>
                  </ul>
                </div>

                {/* Step 2 — preview */}
                {records.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 flex-wrap gap-2">
                      <div className="text-sm text-slate-700">
                        <span className="font-semibold">2. Preview</span>
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

            {/* Step 3 — result */}
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

          {/* Footer */}
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
