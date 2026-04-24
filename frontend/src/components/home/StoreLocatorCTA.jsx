import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight, Clock } from 'lucide-react';
import { useStores } from '../../hooks/queries.js';
import { formatHours, storeStatus } from '../../lib/storeHours.js';

// Six fixed canvas positions for the top-city chips. Layout is cosmetic —
// it's not a geographic map (we don't have lat/lng for most stores), but
// the arrangement is staggered so chips never overlap.
const CHIP_POSITIONS = [
  { x: '22%', y: '22%', colour: 'bg-hp-blue' },
  { x: '66%', y: '18%', colour: 'bg-accent-red' },
  { x: '80%', y: '50%', colour: 'bg-hp-navy' },
  { x: '42%', y: '55%', colour: 'bg-accent-amber' },
  { x: '20%', y: '72%', colour: 'bg-hp-blue' },
  { x: '70%', y: '78%', colour: 'bg-hp-navy' },
];

// Aggregate stores by city, return the top N by count.
function topCitiesByCount(stores, limit = CHIP_POSITIONS.length) {
  const bucket = new Map();
  for (const s of stores) {
    const c = (s.city || '').trim();
    if (!c) continue;
    bucket.set(c, (bucket.get(c) || 0) + 1);
  }
  return [...bucket.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export default function StoreLocatorCTA() {
  const [pincode, setPincode] = useState('');
  const navigate = useNavigate();

  // Pull the live admin-managed list. If the fetch is in-flight or the
  // backend is down, `stores` is [] and the UI shows friendly fallback
  // copy + no fake pins.
  const { data } = useStores();
  const stores = Array.isArray(data) ? data : (data?.stores || []);

  const stats = useMemo(() => {
    const totalStores = stores.length;
    const cityCount = new Set(
      stores.map((s) => (s.city || '').trim()).filter(Boolean)
    ).size;
    return { totalStores, cityCount };
  }, [stores]);

  const topCities = useMemo(() => topCitiesByCount(stores), [stores]);
  const featured  = stores[0];

  const handleFind = (e) => {
    e.preventDefault();
    const term = pincode.trim();
    navigate(term ? `/stores?pincode=${encodeURIComponent(term)}` : '/stores');
  };

  return (
    <section id="stores" className="py-16 md:py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-hp-blue font-semibold">
            Store Locator
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-3 leading-tight text-hp-ink">
            Visit an HP World
            <br />
            store near you.
          </h2>
          <p className="text-slate-600 mt-5 max-w-lg">
            Walk into any listed HP World for a product demo, carry-home purchase, or onsite
            service. Search by pincode or city to see what's nearest.
          </p>

          <form onSubmit={handleFind} className="mt-7 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter pincode or city"
                className="w-full h-12 pl-12 pr-4 rounded-full border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
              />
              <MapPin className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <button
              type="submit"
              className="btn-primary px-6 h-12 rounded-full inline-flex items-center gap-2"
            >
              Find stores <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Real stats only — no marketing numbers. If there are no stores
              yet the stats block collapses to just the helper text. */}
          {stats.totalStores > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-6 max-w-md">
              <Stat value={stats.totalStores} label={stats.totalStores === 1 ? 'Authorised store' : 'Authorised stores'} />
              <Stat value={stats.cityCount}   label={stats.cityCount === 1   ? 'City' : 'Cities'} />
            </div>
          )}
        </div>

        {/* Map panel — decorative background + real city pins + real
            featured-store overlay. All rendered from the live DB response. */}
        <div className="relative rounded-3xl overflow-hidden shadow-lift border border-slate-100 bg-gradient-to-br from-[#EAF4FB] to-[#F6FAFD] aspect-[4/3]">
          <svg viewBox="0 0 600 450" className="absolute inset-0 w-full h-full">
            <defs>
              <pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#0096D6" opacity="0.15" />
              </pattern>
            </defs>
            <rect width="600" height="450" fill="url(#dots)" />
            <path
              d="M30 80 C 120 40, 220 160, 320 120 S 520 200, 580 150"
              fill="none" stroke="#0096D6" strokeWidth="1.5" strokeDasharray="4 4" opacity=".5"
            />
            <path
              d="M20 280 C 120 220, 260 340, 360 300 S 520 260, 590 320"
              fill="none" stroke="#00205B" strokeWidth="1.5" strokeDasharray="4 4" opacity=".4"
            />
          </svg>

          {/* City pins — one per unique city in the current store list */}
          {topCities.map((c, i) => {
            const slot = CHIP_POSITIONS[i % CHIP_POSITIONS.length];
            return (
              <div key={c.city} className="absolute" style={{ left: slot.x, top: slot.y }}>
                <div className="relative">
                  <div className={`w-6 h-6 rounded-full ${slot.colour} ring-4 ring-white grid place-items-center shadow-lift`}>
                    <MapPin className="w-3 h-3 text-white" />
                  </div>
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-xs font-semibold px-2 py-1 rounded shadow-soft">
                    {c.city} · {c.count}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty state — covers a fresh install with no stores yet */}
          {topCities.length === 0 && (
            <div className="absolute inset-0 grid place-items-center text-center px-8">
              <div>
                <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-sm text-slate-500 mt-2">
                  No stores listed yet. Check back soon.
                </div>
              </div>
            </div>
          )}

          {/* Featured-store overlay — shows a real listing instead of a
              fabricated "nearest to you". Includes live open/closed status
              driven by the schedule the admin set. */}
          {featured && (
            <FeaturedStoreCard store={featured} />
          )}
        </div>
      </div>
    </section>
  );
}

function FeaturedStoreCard({ store }) {
  const hoursText = formatHours(store.hours);
  const status    = storeStatus(store.hours, new Date());
  const statusLabel =
    status === 'open'         ? 'Open'
    : status === 'closing-soon' ? 'Closing soon'
    : status === 'opening-soon' ? 'Opening soon'
    : status === 'closed'     ? 'Closed'
    : null;
  const statusColour =
    status === 'open' || status === 'closing-soon' ? 'text-accent-mint'
    : status === 'closed'  ? 'text-accent-red'
    : 'text-slate-500';

  return (
    <div className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] bg-white/85 backdrop-blur rounded-xl px-4 py-3 shadow-soft">
      <div className="text-[10px] uppercase tracking-widest text-slate-400">Featured store</div>
      <div className="font-semibold text-hp-ink text-sm mt-0.5 truncate">{store.name}</div>
      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
        {statusLabel && (
          <span className={`font-medium ${statusColour}`}>{statusLabel}</span>
        )}
        {statusLabel && <span className="text-slate-300">·</span>}
        {hoursText && (
          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {hoursText}</span>
        )}
        {store.city && <>
          <span className="text-slate-300">·</span>
          <span>{store.city}</span>
        </>}
      </div>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <div className="font-display font-bold text-3xl text-hp-ink">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}
