import { useState, useEffect } from 'react';
import { Star, Search, Check, RefreshCw } from 'lucide-react';
import { useAdminFeatured, useSetFeatured, useAdminProducts } from '../../hooks/queries.js';
import { FEATURED } from '../../data/mockData.js';

// AdminFeatured — manage which 4 products appear in the homepage featured grid.
// The admin selects products from the full catalog and saves the selection.
// The homepage FeaturedProducts component reads this list from GET /featured-products.
export default function AdminFeatured() {
  // Local working copy of the featured list so the admin can stage
  // add/remove actions before hitting "Save"
  const [featured, setFeatured] = useState([]);
  const [search, setSearch]     = useState('');
  const [msg, setMsg]           = useState('');

  const featuredQ = useAdminFeatured();
  const productsQ = useAdminProducts({ limit: 200 });
  const setMutation = useSetFeatured();

  const loading = featuredQ.isLoading || productsQ.isLoading;
  const saving  = setMutation.isPending;

  // Seed local working copy once the server returns the current featured list.
  // The API returns FeaturedProduct wrappers shaped like
  //   { _id, product: { _id, name, price, … }, order }
  // so we unwrap to the inner product. This keeps `featured` a plain list of
  // product documents, matching `allProducts` — so the render / save code
  // all works off the same shape. Entries whose product was deleted come
  // back with `product: null` from the populate and are filtered out.
  useEffect(() => {
    if (featuredQ.isSuccess) {
      const raw = featuredQ.data;
      const list = Array.isArray(raw) ? raw : (raw?.products || []);
      const unwrapped = list
        .map((f) => (f && f.product ? f.product : f))
        .filter(Boolean);
      setFeatured(unwrapped.length ? unwrapped : FEATURED);
    } else if (featuredQ.isError) {
      setFeatured(FEATURED);
    }
  }, [featuredQ.isSuccess, featuredQ.isError, featuredQ.data]);

  const allProducts = Array.isArray(productsQ.data)
    ? productsQ.data
    : (productsQ.data?.products || []);

  const isFeatured = (p) =>
    featured.some((f) => (f._id || f.id) === (p._id || p.id));

  const addToFeatured = (p) => {
    if (isFeatured(p)) return;
    if (featured.length >= 8) {
      setMsg('Maximum 8 featured products allowed. Remove one first.');
      return;
    }
    setFeatured((prev) => [...prev, p]);
    setMsg('');
  };

  const removeFromFeatured = (p) => {
    setFeatured((prev) => prev.filter((f) => (f._id || f.id) !== (p._id || p.id)));
  };

  const handleSave = async () => {
    setMsg('');
    try {
      const ids = featured.map((f) => f._id || f.id);
      await setMutation.mutateAsync({ productIds: ids });
      setMsg('Featured products saved successfully!');
    } catch {
      setMsg('Save failed. Please try again.');
    }
  };

  // Filter the full catalog for the search panel
  const filtered = allProducts.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.name?.toLowerCase().includes(q) || p.series?.toLowerCase().includes(q);
  });

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-hp-blue" />
          <h1 className="font-display text-2xl font-bold text-hp-ink">Featured Products</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-full text-sm disabled:opacity-60"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Status message */}
      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${msg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-accent-red'}`}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Left: Current featured products ── */}
        <div>
          <h2 className="font-semibold text-hp-ink mb-3 text-sm">
            Currently Featured <span className="text-slate-400 font-normal">({featured.length}/8 slots)</span>
          </h2>
          <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100 min-h-32">
            {loading && <div className="p-6 text-center text-slate-400 text-sm">Loading…</div>}
            {!loading && featured.length === 0 && (
              <div className="p-6 text-center text-slate-400 text-sm">
                No featured products. Select from the panel on the right.
              </div>
            )}
            {featured.map((p, i) => (
              <div key={p._id || p.id || i} className="flex items-center gap-3 px-4 py-3">
                {/* Slot number indicator */}
                <span className="w-6 h-6 rounded-full bg-hp-blue/10 text-hp-blue text-xs font-bold grid place-items-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-hp-ink truncate">{p.name}</div>
                  <div className="text-xs text-slate-400 truncate">{p.series} · ₹{Number(p.price).toLocaleString('en-IN')}</div>
                </div>
                {/* Remove from featured */}
                <button
                  onClick={() => removeFromFeatured(p)}
                  className="text-xs text-accent-red hover:underline shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Product search & selection panel ── */}
        <div>
          <h2 className="font-semibold text-hp-ink mb-3 text-sm">Add Products to Featured</h2>
          {/* Search input to filter the product catalog */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or series…"
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 text-sm focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none"
            />
          </div>
          <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {loading && <div className="p-6 text-center text-slate-400 text-sm">Loading catalog…</div>}
            {!loading && filtered.length === 0 && (
              <div className="p-6 text-center text-slate-400 text-sm">No products found.</div>
            )}
            {filtered.map((p) => {
              const already = isFeatured(p);
              return (
                <div key={p._id || p.id} className={`flex items-center gap-3 px-4 py-3 ${already ? 'opacity-50' : 'hover:bg-slate-50'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-hp-ink truncate">{p.name}</div>
                    <div className="text-xs text-slate-400 truncate capitalize">{p.category} · ₹{Number(p.price).toLocaleString('en-IN')}</div>
                  </div>
                  {/* Add / Already added button */}
                  <button
                    onClick={() => addToFeatured(p)}
                    disabled={already}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium shrink-0 ${
                      already
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : 'bg-hp-blue/10 text-hp-blue hover:bg-hp-blue hover:text-white'
                    }`}
                  >
                    {already ? '✓ Added' : '+ Add'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
