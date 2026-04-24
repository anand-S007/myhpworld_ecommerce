import { Link } from 'react-router-dom';
import { Flame, Star, StarHalf, MessageCircle, Laptop } from 'lucide-react';
import CountdownTimer from '../common/CountdownTimer.jsx';
import { useDealOfTheDay } from '../../hooks/queries.js';
import { buildEnquiryUrl } from '../../config/contact.js';

// Count-aware grid class so cards always fill the row.
//   2 deals → 2 columns (each card takes half the row, no empty third slot)
//   3 deals → 3 columns
//   4 deals → 2x2 on mid screens, 4-across on xl (so it looks deliberate)
//   5+      → 3-column grid, wrapping naturally
function gridColsFor(n) {
  if (n === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (n === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  if (n === 4) return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4';
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
}

// DealOfTheDay — renders every active, non-expired deal returned by
// GET /api/deal-of-the-day.
//   0 deals → section is hidden entirely
//   1 deal  → wide hero card that fills the full section width
//   2+      → responsive grid whose column count adapts to the number of
//             deals so cards stay a sensible size and never leave empty
//             slots in a row
// Each deal is capped at 24 hours by the backend; the section updates on
// the next render after expiry.
export default function DealOfTheDay() {
  const { data } = useDealOfTheDay();
  // Coerce defensively — old clients might still see a single-object
  // payload if a stale server response was cached.
  const deals = Array.isArray(data) ? data : (data && data.product ? [data] : []);
  if (deals.length === 0) return null;

  const isSingle = deals.length === 1;
  const gridClass = gridColsFor(deals.length);

  return (
    <section className="py-14 md:py-20 bg-hp-ink text-white relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="max-w-7xl mx-auto px-4 relative">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-accent-red grid place-items-center">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-accent-amber font-semibold">
              {isSingle ? 'Deal of the day' : 'Deals of the day'}
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              {isSingle ? 'Ends soon' : `${deals.length} limited-time picks`}
            </h2>
          </div>
        </div>

        {isSingle ? (
          <DealHeroCard deal={deals[0]} />
        ) : (
          <div className={`grid gap-5 ${gridClass}`}>
            {deals.map((d) => <DealCompactCard key={d._id} deal={d} />)}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Card variants ────────────────────────────────────────────────────────────

// Wide hero — used when only one deal is active.
function DealHeroCard({ deal }) {
  const p   = deal.product || {};
  const img = (p.images || []).find(Boolean) || p.imageUrl;
  // Rating + review count come from the Product's aggregate (updated by
  // the Review model), not the deal form.
  const rating  = p.rating  || 0;
  const reviews = p.reviews || 0;

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-center bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-3xl p-6 md:p-10">
      <div className="relative aspect-[4/3] rounded-2xl bg-gradient-to-br from-hp-blue/20 to-hp-navy/30 grid place-items-center overflow-hidden">
        {deal.discount ? (
          <div className="absolute top-4 left-4 bg-accent-red text-white text-xs font-semibold px-2.5 py-1 rounded z-10">
            -{deal.discount}%
          </div>
        ) : null}
        {img ? (
          <img src={img} alt={deal.name || p.name} className="w-4/5 object-contain" />
        ) : (
          <Laptop className="w-24 h-24 text-white/30" />
        )}
      </div>

      <div>
        <div className="text-xs uppercase tracking-widest text-hp-blue font-semibold">{deal.series || p.series}</div>
        <h3 className="font-display text-2xl md:text-3xl font-bold mt-2">{deal.name || p.name}</h3>
        <div className="flex items-center gap-1 mt-3 text-amber-400">
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
          <StarHalf className="w-4 h-4 fill-current" />
          <span className="text-white/70 text-sm ml-2">
            {rating} ({Number(reviews).toLocaleString()} reviews)
          </span>
        </div>
        <PriceBlock deal={deal} large />
        {deal.endDate && (
          <div className="mt-4">
            <CountdownTimer endDate={deal.endDate} />
          </div>
        )}
        {deal.perks && <p className="text-white/70 mt-4 max-w-md">{deal.perks}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={buildEnquiryUrl(p._id ? p : { ...p, name: deal.name })}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary px-6 py-3 rounded-full inline-flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" /> Enquire on WhatsApp
          </a>
          {p._id && (
            <Link
              to={`/product/${p._id}`}
              className="px-6 py-3 rounded-full border border-white/20 hover:border-white/40 text-sm inline-flex items-center"
            >
              View details
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact card — used when 2+ deals are active.
function DealCompactCard({ deal }) {
  const p   = deal.product || {};
  const img = (p.images || []).find(Boolean) || p.imageUrl;

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3] bg-gradient-to-br from-hp-blue/20 to-hp-navy/30 grid place-items-center">
        {deal.discount ? (
          <div className="absolute top-3 left-3 bg-accent-red text-white text-xs font-semibold px-2 py-1 rounded z-10">
            -{deal.discount}%
          </div>
        ) : null}
        {img ? (
          <img src={img} alt={deal.name || p.name} className="w-4/5 object-contain p-4" />
        ) : (
          <Laptop className="w-16 h-16 text-white/30" />
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="text-[11px] uppercase tracking-widest text-hp-blue font-semibold">
          {deal.series || p.series}
        </div>
        <h3 className="font-display text-lg font-bold mt-1 line-clamp-2">{deal.name || p.name}</h3>
        <PriceBlock deal={deal} />
        {deal.endDate && (
          <div className="mt-3">
            <CountdownTimer endDate={deal.endDate} />
          </div>
        )}
        <div className="mt-auto pt-4 flex items-center gap-2">
          <a
            href={buildEnquiryUrl(p._id ? p : { ...p, name: deal.name })}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex-1 py-2 rounded-full text-xs inline-flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Enquire
          </a>
          {p._id && (
            <Link
              to={`/product/${p._id}`}
              className="py-2 px-3 rounded-full border border-white/20 hover:border-white/40 text-xs"
            >
              Details
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function PriceBlock({ deal, large }) {
  const price = Number(deal.price || 0);
  const mrp   = Number(deal.mrp   || 0);
  const save  = Number(deal.savings || (mrp - price)) || 0;
  return (
    <div className={`flex items-baseline gap-3 flex-wrap ${large ? 'mt-5' : 'mt-3'}`}>
      <div className={`font-display font-bold ${large ? 'text-4xl' : 'text-xl'}`}>
        ₹{price.toLocaleString('en-IN')}
      </div>
      {mrp > 0 && mrp > price && (
        <>
          <div className="text-white/50 line-through text-sm">
            ₹{mrp.toLocaleString('en-IN')}
          </div>
          <div className="text-accent-mint font-semibold text-sm">
            Save ₹{save.toLocaleString('en-IN')}
          </div>
        </>
      )}
    </div>
  );
}
