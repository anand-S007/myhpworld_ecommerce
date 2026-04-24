import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, Tag, Layers, Package } from 'lucide-react';
import { useCategories, useProducts } from '../../hooks/queries.js';

// SearchBox — site-wide quick search. Typing into it fires a debounced
// `/api/products?search=` request and, alongside the already-loaded category
// list, builds a dropdown with three sections:
//
//   Categories     — matched by name or slug
//   Subcategories  — matched by name or slug, scoped to their parent category
//   Products       — top 5 from the API
//
// Clicking a result jumps straight to its page. Pressing Enter (or the
// Search button) falls back to the full Shop listing filtered by the query.
export default function SearchBox() {
  const navigate = useNavigate();
  const [q, setQ]       = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // Debounce user input so every keystroke doesn't hit the API.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const onKey   = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Category + subcategory data is already cached app-wide by useCategories(),
  // so filtering happens client-side and is instant.
  const { data: catsData } = useCategories();
  const categories = Array.isArray(catsData) ? catsData : (catsData?.categories || []);

  const hasQuery = debouncedQ.length >= 2;

  const { data: productsData, isFetching: loadingProducts } = useProducts(
    { search: debouncedQ, limit: 6 },
    hasQuery,
  );
  const products = hasQuery
    ? (Array.isArray(productsData) ? productsData : (productsData?.products || []))
    : [];

  const { matchedCategories, matchedSubs } = useMemo(() => {
    if (!hasQuery) return { matchedCategories: [], matchedSubs: [] };
    const needle = debouncedQ.toLowerCase();
    const catHits = [];
    const subHits = [];
    for (const c of categories) {
      const catMatches =
        c.name?.toLowerCase().includes(needle) ||
        c.slug?.toLowerCase().includes(needle);
      if (catMatches) catHits.push(c);
      for (const s of (c.subcategories || [])) {
        if (
          s.name?.toLowerCase().includes(needle) ||
          s.slug?.toLowerCase().includes(needle)
        ) {
          subHits.push({ ...s, parent: c });
        }
      }
    }
    return {
      matchedCategories: catHits.slice(0, 4),
      matchedSubs:       subHits.slice(0, 5),
    };
  }, [categories, debouncedQ, hasQuery]);

  const totalHits =
    matchedCategories.length + matchedSubs.length + products.length;

  const goToFullResults = () => {
    if (!q.trim()) return;
    setOpen(false);
    navigate(`/shop?search=${encodeURIComponent(q.trim())}`);
  };

  const goToCategory = (cat) => {
    setOpen(false);
    setQ('');
    navigate(`/shop/${cat.slug}`);
  };

  const goToSubcategory = (sub) => {
    setOpen(false);
    setQ('');
    navigate(`/shop/${sub.parent.slug}?sub=${encodeURIComponent(sub.slug)}`);
  };

  const goToProduct = (p) => {
    setOpen(false);
    setQ('');
    navigate(`/product/${p._id || p.id}`);
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <form
        onSubmit={(e) => { e.preventDefault(); goToFullResults(); }}
        className="relative"
      >
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search laptops, printers, accessories…"
          className="w-full h-11 pl-11 pr-28 rounded-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
          aria-label="Search products, categories and subcategories"
          autoComplete="off"
        />
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        {q && (
          <button
            type="button"
            onClick={() => { setQ(''); setOpen(false); }}
            aria-label="Clear search"
            className="absolute right-24 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="submit"
          className="absolute right-1.5 top-1.5 btn-primary h-8 px-4 rounded-full text-xs"
        >
          Search
        </button>
      </form>

      {/* Dropdown panel */}
      {open && q.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
          {!hasQuery && (
            <div className="px-4 py-3 text-xs text-slate-400">
              Type at least 2 characters…
            </div>
          )}

          {hasQuery && loadingProducts && totalHits === 0 && (
            <div className="px-4 py-6 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching…
            </div>
          )}

          {hasQuery && !loadingProducts && totalHits === 0 && (
            <div className="px-4 py-6 text-sm text-slate-500 text-center">
              No matches for <span className="font-medium text-hp-ink">"{debouncedQ}"</span>
            </div>
          )}

          {matchedCategories.length > 0 && (
            <Section icon={Tag} title="Categories">
              {matchedCategories.map((c) => (
                <button
                  key={c._id || c.slug}
                  type="button"
                  onClick={() => goToCategory(c)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between"
                >
                  <span className="font-medium text-hp-ink">{c.name}</span>
                  <span className="text-xs text-slate-400">/{c.slug}</span>
                </button>
              ))}
            </Section>
          )}

          {matchedSubs.length > 0 && (
            <Section icon={Layers} title="Subcategories">
              {matchedSubs.map((s) => (
                <button
                  key={`${s.parent.slug}-${s.slug}`}
                  type="button"
                  onClick={() => goToSubcategory(s)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between"
                >
                  <span className="font-medium text-hp-ink">{s.name}</span>
                  <span className="text-xs text-slate-400">in {s.parent.name}</span>
                </button>
              ))}
            </Section>
          )}

          {products.length > 0 && (
            <Section icon={Package} title="Products">
              {products.map((p) => {
                const img = (p.images || []).find(Boolean) || p.imageUrl;
                return (
                  <button
                    key={p._id || p.id}
                    type="button"
                    onClick={() => goToProduct(p)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 grid place-items-center overflow-hidden shrink-0">
                      {img
                        ? <img src={img} alt="" className="w-full h-full object-cover" />
                        : <Package className="w-4 h-4 text-slate-300" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-hp-ink truncate">{p.name}</div>
                      <div className="text-xs text-slate-500 capitalize">
                        {p.series ? `${p.series} · ` : ''}{p.category}
                      </div>
                    </div>
                    {typeof p.price === 'number' && (
                      <div className="text-sm font-semibold text-hp-ink shrink-0">
                        ₹{p.price.toLocaleString('en-IN')}
                      </div>
                    )}
                  </button>
                );
              })}
            </Section>
          )}

          {hasQuery && totalHits > 0 && (
            <button
              type="button"
              onClick={goToFullResults}
              className="w-full px-4 py-3 text-sm font-medium text-hp-blue hover:bg-hp-blue/5 border-t border-slate-100"
            >
              View all results for "{debouncedQ}" →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="px-4 pt-3 pb-1 flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-400">
        <Icon className="w-3 h-3" />
        {title}
      </div>
      <div className="pb-2">{children}</div>
    </div>
  );
}
