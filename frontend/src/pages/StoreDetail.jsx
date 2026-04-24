import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MapPin, Phone, Mail, Clock, Navigation, ChevronLeft, Store as StoreIcon,
  ShieldCheck, BadgeCheck, Share2, ArrowRight, CheckCircle2,
  CalendarCheck, MessageCircle,
} from 'lucide-react';
import { useStoreBySlug } from '../hooks/queries.js';
import { formatHours, storeStatus } from '../lib/storeHours.js';
import { useEnquiry } from '../context/EnquiryContext.jsx';

// Payment options — same at every HP World store, so rendered statically.
const PAYMENT_OPTIONS = ['Debit Card', 'Credit Card', 'UPI', 'NEFT / IMPS', 'Cash', 'EMI'];

// Status pill shown next to the store name. Same mapping StoreLocator uses
// so there's no visual split between list view and detail view.
const BADGE_STYLES = {
  'open':         { label: 'OPEN NOW',      cls: 'bg-accent-mint/10 text-accent-mint' },
  'closed':       { label: 'CLOSED',        cls: 'bg-accent-red/10 text-accent-red' },
  'closing-soon': { label: 'CLOSING SOON',  cls: 'bg-amber-100 text-amber-700' },
  'opening-soon': { label: 'OPENING SOON',  cls: 'bg-sky-100 text-sky-700' },
};

export default function StoreDetail() {
  const { slug } = useParams();
  const { data, isLoading, isError } = useStoreBySlug(slug);
  const { openEnquiry } = useEnquiry();

  // Tick every minute so the OPEN/CLOSED badge flips without a refresh.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 md:py-14 space-y-6">
        <div className="h-6 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="h-56 md:h-72 bg-slate-100 rounded-3xl animate-pulse" />
        <div className="h-10 w-3/4 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  if (isError || !data?.store) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <StoreIcon className="w-10 h-10 text-slate-300 mx-auto" />
        <div className="font-display text-xl font-bold text-hp-ink mt-4">Store not found</div>
        <p className="text-sm text-slate-500 mt-1">
          This store may have been removed or renamed. Browse the full list to find what you need.
        </p>
        <Link to="/stores" className="btn-primary mt-6 inline-block px-5 py-2.5 rounded-full text-sm">
          Back to Store Locator
        </Link>
      </div>
    );
  }

  const { store, related = [] } = data;
  const status = storeStatus(store.hours, now);
  const badge = BADGE_STYLES[status] || { label: 'HOURS', cls: 'bg-slate-100 text-slate-500' };
  const hoursText = formatHours(store.hours);

  const mapQuery = encodeURIComponent(
    [store.name, store.address, store.city, store.pincode].filter(Boolean).join(', ')
  );
  const directionsHref = store.mapLink || `https://maps.google.com/?q=${mapQuery}`;
  // Map embed — pick the best available source:
  //   1. Exact lat/lng  → OpenStreetMap (precise marker, no API key)
  //   2. Address-only   → Google Maps address search (still no API key,
  //      works for every store that has an address which is required)
  //   3. Nothing usable → static unavailable panel (very rare edge case)
  const hasLatLng = Number.isFinite(store.lat) && Number.isFinite(store.lng);
  const hasAddress = !!(store.address || store.city || store.pincode);
  const embedSrc = hasLatLng
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${store.lng - 0.008},${store.lat - 0.005},${store.lng + 0.008},${store.lat + 0.005}&layer=mapnik&marker=${store.lat},${store.lng}`
    : hasAddress
      ? `https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`
      : '';
  const hasMap = !!embedSrc;

  const share = async () => {
    const shareData = { title: store.name, text: `Visit ${store.name} — ${store.address}`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.href);
    } catch { /* user cancelled, ignore */ }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1 flex-wrap" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-hp-blue">Home</Link>
        <span className="text-slate-300">/</span>
        <Link to="/stores" className="hover:text-hp-blue">Store Locator</Link>
        <span className="text-slate-300">/</span>
        <span className="text-hp-ink font-medium truncate">{store.name}</span>
      </nav>

      {/* Hero — two layouts depending on whether an image is set.
          • WITH image:  side-by-side split. Image sits on the LEFT at a
            contained 4:3 size so tall pages don't get a giant empty banner
            when the photo is small or still loading. Text + action buttons
            sit on the right and stack under the image on mobile.
          • WITHOUT image: the brand gradient hero, with title + buttons
            inside it. */}
      {store.image ? (
        <section className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-start mb-10">
          {/* Image panel */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 shadow-sm max-w-xl">
            {/* referrerPolicy="no-referrer" keeps CDNs that hotlink-block
                by Referer (notably googleusercontent.com) from returning
                a broken image. The header is stripped, the image loads. */}
            <img
              src={store.image}
              alt={store.name}
              loading="eager"
              referrerPolicy="no-referrer"
              className="w-full aspect-[4/3] object-cover"
            />
            <span className={`absolute top-3 right-3 text-[11px] px-2.5 py-1 rounded-full font-semibold shadow-sm ${badge.cls}`}>
              {badge.label}
            </span>
          </div>

          {/* Right column — shop title on top, "Store details" card below it
              so the space next to the image is fully used instead of
              leaving whitespace under the buttons. */}
          <div className="min-w-0 flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-hp-blue font-semibold">
                <MapPin className="w-3.5 h-3.5" /> {store.city}{store.state ? `, ${store.state}` : ''}
              </div>
              <h1 className="font-display text-3xl md:text-4xl xl:text-5xl font-bold mt-2 leading-tight text-hp-ink">
                {store.name}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary px-5 py-2.5 rounded-full text-sm inline-flex items-center gap-2"
                >
                  <Navigation className="w-4 h-4" /> Get Directions
                </a>
                {store.phone && (
                  <a
                    href={`tel:${store.phone}`}
                    className="px-5 py-2.5 rounded-full border border-slate-200 hover:border-hp-blue text-sm inline-flex items-center gap-2 text-slate-700"
                  >
                    <Phone className="w-4 h-4" /> Call store
                  </a>
                )}
                <button
                  type="button"
                  onClick={share}
                  className="px-5 py-2.5 rounded-full border border-slate-200 hover:border-hp-blue text-sm inline-flex items-center gap-2 text-slate-700"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>
            </div>

            {/* Store details card sitting under the title on the same side
                as the image — compact table-style rows. */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3.5">
              <h2 className="font-display text-lg font-bold text-hp-ink">Store details</h2>
              <DetailRow icon={MapPin} label="Address">
                {store.address}
                {store.pincode && <span className="text-slate-500"> — {store.pincode}</span>}
              </DetailRow>
              {store.phone && (
                <DetailRow icon={Phone} label="Phone">
                  <a href={`tel:${store.phone}`} className="hover:text-hp-blue">{store.phone}</a>
                </DetailRow>
              )}
              {store.email && (
                <DetailRow icon={Mail} label="Email">
                  <a href={`mailto:${store.email}`} className="hover:text-hp-blue break-all">{store.email}</a>
                </DetailRow>
              )}
              {hoursText && (
                <DetailRow icon={Clock} label="Hours">
                  {hoursText}
                </DetailRow>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="relative rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-hp-navy via-hp-navy/90 to-hp-blue text-white">
          <div className="absolute inset-0 grid-bg opacity-30" />

          <div className="relative px-6 md:px-10 py-10 md:py-16 min-h-[220px] md:min-h-[300px] flex flex-col justify-end">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-accent-amber font-semibold">
              <MapPin className="w-3.5 h-3.5" /> {store.city}{store.state ? `, ${store.state}` : ''}
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mt-3 leading-tight max-w-3xl">
              {store.name}
            </h1>
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className={`text-[11px] px-2.5 py-1 rounded font-semibold ${badge.cls}`}>
                {badge.label}
              </span>
              {hoursText && (
                <span className="text-sm text-white/80 inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {hoursText}
                </span>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href={directionsHref}
                target="_blank"
                rel="noreferrer"
                className="btn-primary px-5 py-2.5 rounded-full text-sm inline-flex items-center gap-2"
              >
                <Navigation className="w-4 h-4" /> Get Directions
              </a>
              {store.phone && (
                <a
                  href={`tel:${store.phone}`}
                  className="px-5 py-2.5 rounded-full border border-white/30 hover:border-white text-sm inline-flex items-center gap-2 backdrop-blur"
                >
                  <Phone className="w-4 h-4" /> Call store
                </a>
              )}
              <button
                type="button"
                onClick={share}
                className="px-5 py-2.5 rounded-full border border-white/30 hover:border-white text-sm inline-flex items-center gap-2 backdrop-blur"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Payment options (left) + Map (right). `items-stretch` + flex-col
          on each column means the payment card grid + the map container
          both stretch to whichever side is tallest — so the two blocks
          always finish at exactly the same baseline. */}
      <section className="grid lg:grid-cols-2 gap-6 mb-10 items-stretch">
        {/* Payment options */}
        <div className="flex flex-col">
          <h2 className="font-display text-xl font-bold text-hp-ink mb-4">Payment options</h2>
          {/* `auto-rows-fr` makes every row take an equal share of the
              column's height; `flex-1` lets that column grow to match
              the map's height. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 auto-rows-fr">
            {PAYMENT_OPTIONS.map((label) => (
              <div
                key={label}
                className="flex items-center gap-3 bg-white border border-hp-blue/20 rounded-xl px-4 py-3"
              >
                <span className="w-6 h-6 rounded-full bg-accent-mint grid place-items-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2.5} />
                </span>
                <span className="text-sm font-medium text-hp-ink">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex flex-col">
          <h2 className="font-display text-xl font-bold text-hp-ink mb-4">Map & directions</h2>
          <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50 flex-1 min-h-[220px]">
            {hasMap ? (
              <iframe
                title={`${store.name} on map`}
                src={embedSrc}
                loading="lazy"
                className="w-full h-full border-0 block"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="w-full h-full grid place-items-center p-6 text-center">
                <div>
                  <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
                  <div className="font-semibold text-hp-ink mt-3">Map coordinates unavailable</div>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm">
                    Tap "Get Directions" to open this store in Google Maps.
                  </p>
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Open in Maps
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Book a store visit — taps straight into WhatsApp with a message
          pre-filled to name this specific store, so the company team
          doesn't have to ask the customer "which store?" first. */}
      <section className="mb-10">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-hp-navy via-hp-navy/95 to-hp-blue text-white p-6 md:p-10">
          <div className="absolute inset-0 grid-bg opacity-20" />
          <div className="relative grid md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-accent-amber font-semibold">
                <CalendarCheck className="w-3.5 h-3.5" /> Book a visit
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold mt-2 leading-tight">
                Plan a store visit to {store.name}
              </h2>
              <p className="text-white/80 text-sm md:text-base mt-3 max-w-2xl">
                Want a product demo or a one-on-one with our team? Message us on WhatsApp —
                tell us what you'd like to see and we'll book a convenient slot for you.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openEnquiry({ kind: 'appointment', store })}
              className="inline-flex items-center gap-2 bg-[#25D366] text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-[#1EBE5A] transition-colors self-start md:self-auto whitespace-nowrap"
              aria-label={`Book a store visit to ${store.name} on WhatsApp`}
            >
              <MessageCircle className="w-5 h-5" /> Book on WhatsApp
            </button>
          </div>
        </div>
      </section>

      {/* Services */}
      {Array.isArray(store.services) && store.services.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-xl font-bold text-hp-ink mb-3">Services at this store</h2>
          <div className="flex flex-wrap gap-2">
            {store.services.map((s) => (
              <span key={s} className="text-sm bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full">
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* About / description */}
      {store.description && (
        <section className="mb-10 bg-slate-50 border border-slate-100 rounded-2xl p-6 md:p-8">
          <h2 className="font-display text-xl font-bold text-hp-ink">About this store</h2>
          <p className="text-slate-600 mt-3 whitespace-pre-wrap leading-relaxed max-w-3xl">
            {store.description}
          </p>
        </section>
      )}

      {/* Trust row — matches the site's brand tone */}
      <section className="grid sm:grid-cols-3 gap-4 mb-10">
        <Perk icon={BadgeCheck} title="Authorised dealer" desc="Every unit is a genuine HP product with a valid India warranty." />
        <Perk icon={ShieldCheck} title="HP warranty" desc="Service + onsite support handled directly through HP India." />
        <Perk icon={StoreIcon} title="Hands-on demos" desc="Try any laptop, monitor or printer before you commit to buy." />
      </section>

      {/* Related stores in the same city */}
      {related.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-hp-ink">Other stores in {store.city}</h2>
            <Link to="/stores" className="text-sm text-hp-blue font-medium inline-flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((r) => <RelatedStoreCard key={r._id} store={r} />)}
          </div>
        </section>
      )}

      {/* Back link */}
      <div className="mt-10">
        <Link
          to="/stores"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-hp-blue"
        >
          <ChevronLeft className="w-4 h-4" /> Back to all stores
        </Link>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <Icon className="w-4 h-4 text-hp-blue mt-1 shrink-0" />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-widest text-slate-400">{label}</div>
        <div className="text-sm text-slate-700 mt-0.5 break-words">{children}</div>
      </div>
    </div>
  );
}

function Perk({ icon: Icon, title, desc }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5">
      <div className="w-10 h-10 rounded-xl bg-hp-blue/10 grid place-items-center text-hp-blue">
        <Icon className="w-5 h-5" />
      </div>
      <div className="font-semibold text-hp-ink mt-3">{title}</div>
      <p className="text-xs text-slate-500 mt-1">{desc}</p>
    </div>
  );
}

function RelatedStoreCard({ store }) {
  return (
    <Link
      to={`/stores/${store.slug || ''}`}
      className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-hp-blue hover:shadow-md transition-all block"
    >
      <div className="text-[10px] uppercase tracking-widest text-hp-blue font-semibold">
        {store.city}
      </div>
      <div className="font-display font-bold text-hp-ink mt-1 line-clamp-2">{store.name}</div>
      <div className="text-xs text-slate-500 mt-2 line-clamp-2">{store.address}</div>
      <div className="mt-3 text-xs text-hp-blue font-medium inline-flex items-center gap-1">
        View store <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
}
