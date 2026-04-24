import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '../components/common/ProductCard.jsx';
import { useProducts, useCategories } from '../hooks/queries.js';
import { FEATURED } from '../data/mockData.js';

// Client-facing sort options. Values match the backend's PUBLIC_SORTS keys.
const SORT_OPTIONS = [
  { value: 'popular',    label: 'Most popular' },
  { value: 'newest',     label: 'Newest first' },
  { value: 'price-asc',  label: 'Price: low → high' },
  { value: 'price-desc', label: 'Price: high → low' },
  { value: 'rating',     label: 'Top rated' },
  { value: 'name-asc',   label: 'Name A → Z' },
  { value: 'name-desc',  label: 'Name Z → A' },
];

const PAGE_SIZE = 20;

export default function ProductListing() {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // All filter state lives in the URL so listings are shareable/bookmarkable
  // and the Back button restores the prior filter set.
  const search      = searchParams.get('search') || '';
  const subcategory = searchParams.get('sub')    || '';
  const sort        = searchParams.get('sort')   || 'popular';
  const minPrice    = searchParams.get('min')    || '';
  const maxPrice    = searchParams.get('max')    || '';
  const inStock     = searchParams.get('stock')  === '1';
  const page        = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);

  const [panelOpen, setPanelOpen] = useState(false);
  const [priceMin, setPriceMin] = useState(minPrice);
  const [priceMax, setPriceMax] = useState(maxPrice);
  useEffect(() => { setPriceMin(minPrice); setPriceMax(maxPrice); }, [minPrice, maxPrice]);

  // Write to URL in one place so every filter change resets `page=1`
  // (stops the user landing on an empty page after narrowing results).
  const updateParams = (patch, { resetPage = true } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v == null || v === '' || v === false) next.delete(k);
      else next.set(k, String(v));
    });
    if (resetPage && !('page' in patch)) next.delete('page');
    setSearchParams(next, { replace: false });
  };

  const clearAll = () => {
    setSearchParams(new URLSearchParams(), { replace: false });
    setPanelOpen(false);
  };

  // Data
  const { data: catsData } = useCategories();
  const categories = Array.isArray(catsData) ? catsData : (catsData?.categories || []);
  const currentCat = categories.find((c) => c.slug === category);
  const subOptions = currentCat?.subcategories || [];

  const queryParams = {
    category,
    subcategory: subcategory || undefined,
    search:      search      || undefined,
    sort,
    minPrice:    minPrice    || undefined,
    maxPrice:    maxPrice    || undefined,
    inStock:     inStock ? 'true' : undefined,
    page,
    limit:       PAGE_SIZE,
  };

  const { data, isLoading: loading, isError } = useProducts(queryParams);
  const fetched = Array.isArray(data) ? data : (data?.products || []);
  const totalPages = Array.isArray(data) ? 1 : (data?.totalPages || 1);
  const total      = Array.isArray(data) ? fetched.length : (data?.total ?? fetched.length);

  // Fallback when the backend is offline — apply the same filters client-side
  // to the mock catalog so the page still feels functional.
  const mockFiltered = (() => {
    let list = category ? FEATURED.filter((p) => p.category === category) : FEATURED;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        [p.name, p.series, p.category].some((v) => v?.toLowerCase().includes(q))
      );
    }
    if (minPrice) list = list.filter((p) => Number(p.price) >= Number(minPrice));
    if (maxPrice) list = list.filter((p) => Number(p.price) <= Number(maxPrice));
    return list;
  })();
  const products = isError ? mockFiltered : fetched;

  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow  = Math.min(page * PAGE_SIZE, total);

  const hasActiveFilter =
    !!search || !!subcategory || !!minPrice || !!maxPrice || inStock || sort !== 'popular';

  let title;
  if (search)        title = `Search: "${search}"`;
  else if (category) title = category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' & ');
  else               title = 'All products';

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-hp-blue font-semibold">Shop</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-2 text-hp-ink">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {loading ? 'Loading…' : `${total.toLocaleString('en-IN')} products`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            className={`flex items-center gap-2 px-4 h-10 rounded-full border text-sm transition-colors ${
              panelOpen
                ? 'border-hp-blue text-hp-blue bg-hp-blue/5'
                : 'border-slate-200 hover:border-hp-blue'
            }`}
            aria-expanded={panelOpen}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
          <select
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="h-10 px-4 rounded-full border border-slate-200 text-sm bg-white focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none"
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active-filter chips */}
      {hasActiveFilter && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {search && (
            <Chip label={`Search: ${search}`}       onClear={() => updateParams({ search: '' })} />
          )}
          {subcategory && (
            <Chip label={`Subcategory: ${subcategory}`} onClear={() => updateParams({ sub: '' })} />
          )}
          {minPrice && (
            <Chip label={`Min ₹${Number(minPrice).toLocaleString('en-IN')}`}
                  onClear={() => updateParams({ min: '' })} />
          )}
          {maxPrice && (
            <Chip label={`Max ₹${Number(maxPrice).toLocaleString('en-IN')}`}
                  onClear={() => updateParams({ max: '' })} />
          )}
          {inStock && (
            <Chip label="In stock"                  onClear={() => updateParams({ stock: '' })} />
          )}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-hp-blue hover:underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Filter panel */}
      {panelOpen && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Subcategory — only shown when the current category has any */}
          <label className="block text-sm">
            <span className="text-slate-600 mb-1 block">Subcategory</span>
            <select
              value={subcategory}
              onChange={(e) => updateParams({ sub: e.target.value })}
              disabled={!subOptions.length}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {subOptions.length ? '— All subcategories —' : '— None defined —'}
              </option>
              {subOptions.map((s) => (
                <option key={s.slug} value={s.slug}>{s.name}</option>
              ))}
            </select>
          </label>

          {/* Price range — on blur, write both to the URL together */}
          <div>
            <div className="text-sm text-slate-600 mb-1">Price (₹)</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                onBlur={() => { if (priceMin !== minPrice) updateParams({ min: priceMin }); }}
                placeholder="Min"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none"
              />
              <span className="text-slate-400 text-sm">–</span>
              <input
                type="number"
                min="0"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                onBlur={() => { if (priceMax !== maxPrice) updateParams({ max: priceMax }); }}
                placeholder="Max"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none"
              />
            </div>
          </div>

          {/* In-stock toggle */}
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mt-2 md:mt-7">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => updateParams({ stock: e.target.checked ? '1' : '' })}
              className="w-4 h-4 accent-hp-blue"
            />
            In-stock items only
          </label>
        </div>
      )}

      {/* Product grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-slate-100 rounded-2xl aspect-square animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center">
          <div className="font-semibold text-hp-ink">No products match these filters.</div>
          <p className="text-sm text-slate-500 mt-1">Try clearing a filter or widening the price range.</p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearAll}
              className="btn-primary mt-5 inline-block px-5 py-2.5 rounded-full text-sm"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.map((p) => (
            <ProductCard key={p.id || p._id} product={p} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-8 pt-6 border-t border-slate-100 text-sm text-slate-500">
          <div>
            Showing <span className="font-medium text-hp-ink">{firstRow.toLocaleString('en-IN')}</span>
            –<span className="font-medium text-hp-ink">{lastRow.toLocaleString('en-IN')}</span>
            {' '}of <span className="font-medium text-hp-ink">{total.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateParams({ page: Math.max(1, page - 1) }, { resetPage: false })}
              disabled={page === 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="px-2">
              Page <span className="font-medium text-hp-ink">{page}</span> of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => updateParams({ page: Math.min(totalPages, page + 1) }, { resetPage: false })}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, onClear }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1 text-xs bg-hp-blue/10 text-hp-blue px-3 py-1 rounded-full hover:bg-hp-blue/15 capitalize"
    >
      {label} <X className="w-3 h-3" />
    </button>
  );
}
