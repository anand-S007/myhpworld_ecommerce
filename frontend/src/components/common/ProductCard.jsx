import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Laptop } from 'lucide-react';
import { useCategoryIconMap } from '../../lib/useCategoryIconMap.js';
import { useUserStore } from '../../store/userStore.js';
import { useWishlist, useAddToWishlist, useRemoveFromWishlist } from '../../hooks/queries.js';
import { useEnquiry } from '../../context/EnquiryContext.jsx';

const badgeStyles = {
  BESTSELLER: 'bg-accent-red text-white',
  NEW: 'bg-hp-ink text-white',
  'SAVE 22%': 'bg-accent-amber text-hp-ink',
};

export default function ProductCard({ product }) {
  const iconMap = useCategoryIconMap();
  const Icon = (iconMap && iconMap[product.icon]) || Laptop;
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);

  // DB documents expose `_id`; the bundled mock uses `id`. Accept either so
  // clicking a card navigates to the right detail page instead of `/product/undefined`.
  const linkId = product._id || product.id;

  // Wishlist state — only fetch for signed-in customers. The id-set on the
  // cache makes isWishlisted an O(1) lookup.
  const wishlist = useWishlist(!!user);
  const add      = useAddToWishlist();
  const remove   = useRemoveFromWishlist();
  const isWishlisted = !!user && (wishlist.data?.ids || []).some((id) => String(id) === String(linkId));

  // Replay the heart-pop keyframe on every click. React won't restart the
  // animation if we leave the same class on the same element, so we toggle
  // it off and back on across frames with a bumping key.
  const [popKey, setPopKey] = useState(0);

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Non-signed-in visitors get sent to login with a hint of where to come back.
    if (!user) { navigate('/login'); return; }
    setPopKey((k) => k + 1);
    if (isWishlisted) remove.mutate(linkId);
    else              add.mutate(linkId);
  };

  // Prefer the first uploaded image. Fall back to the legacy single imageUrl,
  // and finally to the category icon if the product has no image at all.
  const primaryImage =
    (Array.isArray(product.images) && product.images.find(Boolean)) ||
    product.imageUrl ||
    '';

  const { openEnquiry } = useEnquiry();
  const handleEnquire = (e) => {
    // Card is wrapped in a <Link>, so stop the click from navigating to the detail page.
    e.preventDefault();
    e.stopPropagation();
    openEnquiry({ kind: 'product', product });
  };

  return (
    <Link
      to={`/product/${linkId}`}
      className="product-card block bg-white rounded-2xl border border-slate-100 overflow-hidden"
    >
      <div className={`relative aspect-square bg-gradient-to-br ${product.tint} grid place-items-center overflow-hidden`}>
        {product.badge && (
          <span
            className={`absolute top-3 left-3 text-[10px] font-semibold tracking-wide px-2 py-1 rounded z-10 ${
              badgeStyles[product.badge] || 'bg-hp-ink text-white'
            }`}
          >
            {product.badge}
          </span>
        )}
        <button
          type="button"
          onClick={handleWishlist}
          title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isWishlisted}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full bg-white grid place-items-center shadow-soft z-10 transition-all duration-200 hover:scale-110 active:scale-95 ${
            isWishlisted ? 'text-accent-red' : 'hover:text-accent-red text-slate-500'
          }`}
        >
          {/* key={popKey} remounts the icon each click so the keyframe
              restarts cleanly — no CSS hack needed. */}
          <Heart
            key={popKey}
            className={`w-4 h-4 animate-heart-pop ${isWishlisted ? 'fill-current' : ''}`}
          />
        </button>
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="w-full h-full object-contain p-6"
            loading="lazy"
          />
        ) : (
          <Icon className="w-24 h-24 text-slate-400" />
        )}
      </div>
      <div className="p-5">
        <div className="text-[11px] uppercase tracking-widest text-slate-400">{product.series}</div>
        <h3 className="font-semibold text-hp-ink mt-1 line-clamp-2">{product.name}</h3>
        <div className="flex items-center gap-1 mt-2 text-amber-500 text-xs">
          ★★★★★ <span className="text-slate-400 ml-1">{product.rating || 0} · {(product.reviews || 0).toLocaleString()}</span>
        </div>
        {/* Pricing — if a promotion is active, show the discounted price as
            primary, the original price struck-through, and a % badge. MRP
            still appears strike-through when there's no promo. */}
        <div className="mt-3">
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className="font-display font-bold text-hp-ink text-xl">
              ₹{Number(product.discountedPrice ?? product.price).toLocaleString('en-IN')}
            </div>
            {product.discountedPrice != null ? (
              <>
                <div className="text-slate-400 text-sm line-through">
                  ₹{Number(product.price).toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] font-bold bg-accent-red text-white px-1.5 py-0.5 rounded">
                  {product.promoPercent}% OFF
                </span>
              </>
            ) : product.mrp ? (
              <div className="text-slate-400 text-sm line-through">
                ₹{product.mrp.toLocaleString('en-IN')}
              </div>
            ) : null}
          </div>
        </div>
        <button
          onClick={handleEnquire}
          className="mt-4 w-full btn-primary py-2.5 rounded-full text-sm inline-flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" /> Enquire on WhatsApp
        </button>
      </div>
    </Link>
  );
}
