import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MapPin, Phone, Clock, Navigation, Search, ArrowRight } from 'lucide-react';
import { useStores, useStoresByPincode } from '../hooks/queries.js';
import { formatHours, storeStatus } from '../lib/storeHours.js';

// Storefront pagination — 9 stores per page matches the 3-column grid
// (3 rows × 3 cols), so each page lays out cleanly on desktop.
const PAGE_SIZE = 9;

export default function StoreLocator() {
  const [params] = useSearchParams();
  const initialPincode = params.get('pincode') || '';

  // activePincode drives which query is the source of truth: pincode-filtered
  // stores if set, otherwise the full list
  const [activePincode, setActivePincode] = useState(initialPincode);
  const [pincode, setPincode] = useState(initialPincode);
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [page, setPage] = useState(1);
  // One clock for all cards on the page. Re-rendered every minute so the
  // OPEN/CLOSED badge flips automatically when 9pm passes, without a full
  // page refresh.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const allStoresQ     = useStores(undefined, !activePincode);
  const pincodeStoresQ = useStoresByPincode(activePincode, !!activePincode);

  const activeQ = activePincode ? pincodeStoresQ : allStoresQ;
  const loading = activeQ.isLoading;
  const raw     = activeQ.data;
  // Live data only — no mock fallback. An empty admin-managed list correctly
  // renders the "No stores found" empty state so deletions in /admin/stores
  // take effect immediately on the storefront.
  const stores  = Array.isArray(raw) ? raw : (raw?.stores || []);

  const cities = ['All', ...new Set(stores.map((s) => s.city).filter(Boolean))].slice(0, 10);
  const filtered = stores.filter((s) => {
    const q = query.toLowerCase();
    const matchesQ =
      !q ||
      (s.name    || '').toLowerCase().includes(q) ||
      (s.city    || '').toLowerCase().includes(q) ||
      (s.pincode || '').includes(q);
    const matchesCity = selectedCity === 'All' || s.city === selectedCity;
    return matchesQ && matchesCity;
  });

  // Any change to filter/search/city/pincode reshapes the list, so reset
  // to page 1 — otherwise the user could be "stranded" on a page that no
  // longer exists (e.g., viewing page 4 when the filter cut the list to 2).
  useEffect(() => { setPage(1); }, [query, selectedCity, activePincode, stores.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageStart = (clampedPage - 1) * PAGE_SIZE;
  const pageEnd   = Math.min(pageStart + PAGE_SIZE, filtered.length);
  const pageItems = filtered.slice(pageStart, pageEnd);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!pincode) return;
    setActivePincode(pincode);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="text-xs uppercase tracking-[0.25em] text-hp-blue font-semibold">
          Store Locator
        </div>
        <h1 className="font-display text-3xl md:text-5xl font-bold mt-3 leading-tight text-hp-ink">
          Find an HP World store near you
        </h1>
        <p className="text-slate-600 mt-4">
          480+ authorised stores across 210 cities. Walk in for a demo, carry-home service, or
          onsite support.
        </p>

        {/* Pincode search */}
        <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
          <div className="relative flex-1">
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="Enter pincode (e.g. 682016)"
              className="w-full h-12 pl-12 pr-4 rounded-full border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
            />
            <MapPin className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <button type="submit" className="btn-primary px-6 h-12 rounded-full">
            Search
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-8 p-4 bg-slate-50 rounded-2xl">
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by store name, city, or area…"
            className="w-full h-10 pl-10 pr-4 rounded-full border border-slate-200 bg-white text-sm outline-none focus:border-hp-blue"
          />
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {cities.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCity(c)}
              className={`px-3 h-9 rounded-full text-xs font-medium transition ${
                selectedCity === c
                  ? 'bg-hp-ink text-white'
                  : 'bg-white border border-slate-200 hover:border-hp-blue'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          No stores found. Try a different pincode or city.
        </div>
      ) : (
        <>
          <div className="text-xs text-slate-500 mb-4">
            Showing <span className="font-semibold text-hp-ink">{pageStart + 1}–{pageEnd}</span>
            {' '}of <span className="font-semibold text-hp-ink">{filtered.length}</span>
            {filtered.length === 1 ? ' store' : ' stores'}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pageItems.map((s, i) => (
              <StoreCard key={s._id || s.id || i} store={s} now={now} />
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination
              page={clampedPage}
              totalPages={totalPages}
              onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
          )}
        </>
      )}
    </div>
  );
}

// Pagination — Prev / page-number buttons / Next, with a small ellipsis
// when there are more pages than fit on screen. Pure client-side, drives
// nothing but the visible slice of the already-filtered list.
function Pagination({ page, totalPages, onChange }) {
  const pages = pageNumbers(page, totalPages);
  return (
    <nav className="mt-10 flex items-center justify-center gap-2 text-sm" aria-label="Store results pagination">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="inline-flex items-center gap-1 h-9 px-3 rounded-full border border-slate-200 text-slate-600 hover:border-hp-blue hover:text-hp-blue disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600"
      >
        <ChevronLeft className="w-4 h-4" /> Previous
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-slate-400">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`w-9 h-9 rounded-full text-xs font-semibold transition-colors ${
              p === page
                ? 'bg-hp-blue text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-hp-blue hover:text-hp-blue'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="inline-flex items-center gap-1 h-9 px-3 rounded-full border border-slate-200 text-slate-600 hover:border-hp-blue hover:text-hp-blue disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600"
      >
        Next <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}

// Build a compact list like [1, '…', 4, 5, 6, '…', 12] so the pager stays
// one row wide even with lots of pages. Always shows first/last + a small
// window around the active page.
function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
}

// Maps each `storeStatus` value to a badge label + Tailwind class. OPEN
// and CLOSED get the usual green / red; when we're within an hour of the
// flip we show an amber "CLOSING SOON" (still open) or a sky-blue "OPENING
// SOON" (still closed) so shoppers know before making the trip.
const BADGE_STYLES = {
  'open':         { label: 'OPEN',          cls: 'bg-accent-mint/10 text-accent-mint' },
  'closed':       { label: 'CLOSED',        cls: 'bg-accent-red/10 text-accent-red' },
  'closing-soon': { label: 'CLOSING SOON',  cls: 'bg-amber-100 text-amber-700' },
  'opening-soon': { label: 'OPENING SOON',  cls: 'bg-sky-100 text-sky-700' },
};

function StoreCard({ store, now }) {
  // Read straight from the admin-set schedule — no hard-coded default.
  // `formatHours` handles both the new { days, open, close } shape and any
  // legacy free-form string still in the DB.
  const hoursText = formatHours(store.hours);
  const status = storeStatus(store.hours, now || new Date());
  const badge = BADGE_STYLES[status] || { label: 'HOURS', cls: 'bg-slate-100 text-slate-500' };
  // Slug powers the dedicated /stores/:slug detail page; fall back to the
  // _id when a legacy store hasn't been touched yet (slug backfills on
  // the next save).
  const detailSlug = store.slug || store._id;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-lift transition flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-hp-blue font-semibold">
            {store.city}
          </div>
          <div className="font-display font-bold text-lg text-hp-ink mt-1">{store.name}</div>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
      </div>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <div className="flex gap-2">
          <MapPin className="w-4 h-4 text-hp-blue shrink-0 mt-0.5" />
          <span>
            {store.address}
            {store.pincode && ` – ${store.pincode}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-hp-blue" /> {store.phone || '+91 80 4000 0000'}
        </div>
        {hoursText && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-hp-blue" /> {hoursText}
          </div>
        )}
      </div>
      <div className="mt-5 flex gap-2">
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(store.name + ' ' + store.address)}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 btn-primary py-2.5 rounded-full text-sm text-center inline-flex items-center justify-center gap-1.5"
        >
          <Navigation className="w-4 h-4" /> Directions
        </a>
        <a
          href={`tel:${store.phone || ''}`}
          className="w-11 h-11 rounded-full border border-slate-200 grid place-items-center hover:border-hp-blue"
        >
          <Phone className="w-4 h-4" />
        </a>
      </div>
      {/* Dedicated store page — matches the detail page style, always
          visible so admins and customers land on the same URL. */}
      <Link
        to={`/stores/${detailSlug}`}
        className="mt-3 text-xs text-hp-blue font-medium inline-flex items-center gap-1 hover:underline self-start"
      >
        View store details <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

