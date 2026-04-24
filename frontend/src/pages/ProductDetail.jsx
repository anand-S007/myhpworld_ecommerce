import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Star, MessageCircle, Heart, Store, ShieldCheck, BadgeCheck, Laptop, Trash2, Loader2 } from 'lucide-react';
import { useProduct, useProductReviews, useSubmitReview, useDeleteReview, useWishlist, useAddToWishlist, useRemoveFromWishlist } from '../hooks/queries.js';
import { FEATURED } from '../data/mockData.js';
import { buildEnquiryUrl } from '../config/contact.js';
import { useUserStore } from '../store/userStore.js';

export default function ProductDetail() {
  // ── All hooks must run on every render, before any conditional return.
  // Rules-of-Hooks: if any of these moved below an early-return, React would
  // throw "Rendered more hooks than during the previous render" once `data`
  // resolves and the early return stops firing.
  const { id } = useParams();
  const { data, isLoading, isError } = useProduct(id);
  const [active, setActive] = useState(0);       // active gallery image
  // Re-key the heart icon each click so the pop keyframe restarts cleanly.
  // Declared up here alongside the other hooks so it runs every render,
  // even before `product` is available (the early-return below would
  // otherwise violate the Rules of Hooks once `data` arrives).
  const [popKey, setPopKey] = useState(0);
  const user       = useUserStore((s) => s.user);
  const navigate   = useNavigate();
  const wishlist   = useWishlist(!!user);
  const addWish    = useAddToWishlist();
  const removeWish = useRemoveFromWishlist();

  // Fall back to the bundled mock while the request is in-flight or if it
  // errors (e.g. backend offline). Keeps the product page functional demo-mode.
  const product = data
    ? data
    : (isError ? (FEATURED.find((p) => p.id === id) || FEATURED[0]) : null);

  if (!product) {
    if (isLoading) {
      return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">Loading…</div>;
    }
    return null;
  }

  const productId = product._id || product.id;

  const isWishlisted = !!user && (wishlist.data?.ids || []).some((wid) => String(wid) === String(productId));
  const toggleWishlist = () => {
    if (!user) { navigate('/login'); return; }
    setPopKey((k) => k + 1);
    if (isWishlisted) removeWish.mutate(productId);
    else              addWish.mutate(productId);
  };

  // Prefer the new multi-image array; fall back to the legacy single URL.
  const images =
    Array.isArray(product.images) && product.images.filter(Boolean).length > 0
      ? product.images.filter(Boolean)
      : (product.imageUrl ? [product.imageUrl] : []);
  const mainImage = images[Math.min(active, images.length - 1)];

  // Specs are stored as `Mixed` on the server — an object from the admin form,
  // but we also tolerate a JSON string or a legacy [{key, value}] array.
  const specEntries = normalizeSpecs(product.specs);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
      <div className="grid lg:grid-cols-2 gap-10">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl grid place-items-center overflow-hidden">
            {mainImage ? (
              <img src={mainImage} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <Laptop className="w-48 h-48 text-slate-300" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 bg-slate-50 ${
                    i === active ? 'border-hp-blue' : 'border-transparent hover:border-slate-300'
                  }`}
                  aria-label={`Show image ${i + 1}`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="text-xs uppercase tracking-widest text-hp-blue font-semibold">
            {product.series}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-2 text-hp-ink">
            {product.name}
          </h1>
          <div className="flex items-center gap-2 mt-3 text-amber-500">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm text-slate-600">
              {product.rating || 0} · {(product.reviews || 0).toLocaleString()} reviews
            </span>
          </div>
          {/* Pricing — promo discount (if any) takes precedence over the
              static MRP savings line. */}
          <div className="mt-5 flex items-baseline gap-3 flex-wrap">
            <div className="font-display font-bold text-4xl text-hp-ink">
              ₹{Number(product.discountedPrice ?? product.price).toLocaleString('en-IN')}
            </div>
            {product.discountedPrice != null ? (
              <>
                <div className="text-slate-400 line-through">
                  ₹{Number(product.price).toLocaleString('en-IN')}
                </div>
                <div className="text-accent-red font-semibold">
                  {product.promoPercent}% OFF
                </div>
                {product.promoName && (
                  <div className="text-xs text-slate-500">· {product.promoName}</div>
                )}
              </>
            ) : product.mrp ? (
              <>
                <div className="text-slate-400 line-through">
                  ₹{product.mrp.toLocaleString('en-IN')}
                </div>
                <div className="text-accent-mint font-semibold">
                  Save ₹{(product.mrp - product.price).toLocaleString('en-IN')}
                </div>
              </>
            ) : null}
          </div>
          <p className="text-slate-600 mt-5">
            {product.description ||
              'Powerful performance meets refined design. Backed by HP India warranty and 7-day return policy from HP World.'}
          </p>

          <div className="mt-6 flex items-center gap-4">
            <a
              href={buildEnquiryUrl(product)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary px-7 py-3 rounded-full inline-flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Enquire on WhatsApp
            </a>
            <button
              type="button"
              onClick={toggleWishlist}
              title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={isWishlisted}
              className={`w-11 h-11 rounded-full border grid place-items-center transition-all duration-200 hover:scale-110 active:scale-95 ${
                isWishlisted
                  ? 'border-accent-red text-accent-red'
                  : 'border-slate-200 text-slate-500 hover:text-accent-red hover:border-accent-red'
              }`}
            >
              <Heart
                key={popKey}
                className={`w-5 h-5 animate-heart-pop ${isWishlisted ? 'fill-current' : ''}`}
              />
            </button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 text-xs text-slate-600">
            <Perk icon={BadgeCheck} label="Authorized dealer" />
            <Perk icon={ShieldCheck} label="HP warranty" />
            <Perk icon={Store} label="Visit our store" />
          </div>
        </div>
      </div>

      {specEntries.length > 0 && <SpecsSection entries={specEntries} />}

      {/* Customer reviews — the only source of truth for rating + review
          count on the product above. */}
      <ReviewSection productId={productId} />
    </div>
  );
}

function normalizeSpecs(specs) {
  if (!specs) return [];
  if (Array.isArray(specs)) {
    return specs
      .filter((r) => r && (r.key ?? '').toString().trim())
      .map((r) => ({ key: String(r.key).trim(), value: String(r.value ?? '') }));
  }
  if (typeof specs === 'string') {
    try {
      return Object.entries(JSON.parse(specs)).map(([k, v]) => ({ key: k, value: String(v) }));
    } catch { return []; }
  }
  if (typeof specs === 'object') {
    return Object.entries(specs).map(([k, v]) => ({ key: k, value: String(v) }));
  }
  return [];
}

function SpecsSection({ entries }) {
  return (
    <section className="mt-14 border-t border-slate-200 pt-10">
      <h2 className="font-display text-2xl font-bold text-hp-ink">Specifications</h2>
      <dl className="mt-6 rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 sm:divide-y-0 sm:grid sm:grid-cols-2 sm:gap-x-0">
        {entries.map((s, i) => (
          <div
            key={`${s.key}-${i}`}
            className={`flex items-baseline gap-4 px-5 py-3 ${
              i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
            } sm:border-b sm:border-slate-100 sm:[&:nth-last-child(-n+2)]:border-b-0`}
          >
            <dt className="text-sm text-slate-500 w-36 shrink-0">{s.key}</dt>
            <dd className="text-sm text-hp-ink font-medium break-words">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Perk({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50">
      <Icon className="w-4 h-4 text-hp-blue" /> {label}
    </div>
  );
}

function ReviewSection({ productId }) {
  const { data: reviews = [], isLoading } = useProductReviews(productId);
  const me = (() => {
    try { return JSON.parse(localStorage.getItem('myhpworld_user') || 'null'); }
    catch { return null; }
  })();
  const myReview = me ? reviews.find((r) => r.user?._id === me._id) : null;

  return (
    <section className="mt-14 border-t border-slate-200 pt-10">
      <h2 className="font-display text-2xl font-bold text-hp-ink">Customer reviews</h2>
      <p className="text-sm text-slate-500 mt-1">
        Ratings come from customers who have signed in. Admins cannot edit them.
      </p>

      <div className="grid lg:grid-cols-[2fr_3fr] gap-8 mt-6">
        <div>
          {me ? (
            <ReviewForm productId={productId} existing={myReview} />
          ) : (
            <div className="rounded-2xl border border-slate-200 p-6 bg-slate-50">
              <div className="font-semibold text-hp-ink mb-1">Sign in to review</div>
              <p className="text-sm text-slate-500 mb-4">
                Only signed-in customers can leave a rating.
              </p>
              <Link to="/login" className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm">
                Sign in
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {isLoading && <div className="text-sm text-slate-400">Loading reviews…</div>}
          {!isLoading && reviews.length === 0 && (
            <div className="text-sm text-slate-400">No reviews yet. Be the first to leave one.</div>
          )}
          {reviews.map((r) => (
            <ReviewCard
              key={r._id}
              review={r}
              productId={productId}
              isMine={!!(me && r.user?._id === me._id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewForm({ productId, existing }) {
  const [rating, setRating]   = useState(existing?.rating || 0);
  const [hover, setHover]     = useState(0);
  const [title, setTitle]     = useState(existing?.title || '');
  const [comment, setComment] = useState(existing?.comment || '');
  const [err, setErr]         = useState('');
  const submit = useSubmitReview(productId);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (rating < 1) { setErr('Please pick a rating.'); return; }
    try {
      await submit.mutateAsync({ rating, title, comment });
      if (!existing) { setTitle(''); setComment(''); setRating(0); }
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Could not submit review.');
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 p-6 bg-white shadow-soft">
      <div className="font-semibold text-hp-ink mb-1">
        {existing ? 'Update your review' : 'Write a review'}
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Your rating updates the product's overall score.
      </p>

      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className="p-0.5"
          >
            <Star className={`w-6 h-6 ${
              (hover || rating) >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
            }`} />
          </button>
        ))}
        <span className="ml-2 text-sm text-slate-500">
          {rating > 0 ? `${rating} / 5` : 'Tap a star'}
        </span>
      </div>

      <label className="block text-sm mb-3">
        <span className="text-slate-600 mb-1 block">Title (optional)</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Short headline"
          className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
        />
      </label>
      <label className="block text-sm mb-3">
        <span className="text-slate-600 mb-1 block">Comment</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="How has the product been for you?"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm resize-y"
        />
      </label>

      {err && <div className="text-sm text-accent-red mb-3">{err}</div>}

      <button
        type="submit"
        disabled={submit.isPending}
        className="btn-primary px-5 py-2.5 rounded-full text-sm inline-flex items-center gap-2 disabled:opacity-60"
      >
        {submit.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {existing ? 'Update review' : 'Submit review'}
      </button>
    </form>
  );
}

function ReviewCard({ review, productId, isMine }) {
  const remove = useDeleteReview(productId);
  const confirmDelete = async () => {
    if (!window.confirm('Delete your review?')) return;
    try { await remove.mutateAsync(review._id); }
    catch { /* toast omitted for brevity */ }
  };
  return (
    <div className="rounded-2xl border border-slate-200 p-5 bg-white">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-hp-blue/10 text-hp-blue grid place-items-center font-semibold">
          {review.user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-hp-ink text-sm truncate">{review.user?.name || 'Customer'}</div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`w-3.5 h-3.5 ${n <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
            ))}
            <span className="ml-1">{new Date(review.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
          </div>
        </div>
        {isMine && (
          <button
            onClick={confirmDelete}
            className="ml-auto text-slate-400 hover:text-accent-red p-1.5 rounded-lg hover:bg-red-50"
            title="Delete your review"
            aria-label="Delete my review"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {review.title && <div className="font-semibold text-hp-ink mt-3">{review.title}</div>}
      {review.comment && <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{review.comment}</p>}
    </div>
  );
}
