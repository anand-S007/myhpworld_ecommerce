import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, HeartOff, MessageCircle, Package, Loader2 } from 'lucide-react';
import { useWishlist, useRemoveFromWishlist } from '../hooks/queries.js';
import { useUserStore } from '../store/userStore.js';
import { useEnquiry } from '../context/EnquiryContext.jsx';

export default function Wishlist() {
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);

  // Only fetch once we know the user is signed in — otherwise the request
  // just bounces with 401. `replace: true` is critical so the Back button
  // can actually leave this page — without it, pressing Back returns to
  // /wishlist, the effect fires again, and the user gets shoved forward.
  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user, navigate]);

  const { data, isLoading } = useWishlist(!!user);
  const items = data?.items || [];

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
      <div className="flex items-center gap-3 mb-6">
        <Heart className="w-5 h-5 text-accent-red fill-accent-red" />
        <h1 className="font-display text-2xl font-bold text-hp-ink">Your wishlist</h1>
        <span className="text-sm text-slate-400">({items.length})</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
          <Package className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="font-semibold text-hp-ink mt-3">Your wishlist is empty</div>
          <p className="text-sm text-slate-500 mt-1">
            Tap the heart icon on any product and it'll show up here.
          </p>
          <Link to="/shop" className="btn-primary mt-5 inline-block px-5 py-2.5 rounded-full text-sm">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <WishlistCard key={p._id || p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// WishlistCard — one entry in the grid. Owns its own "is-removing" state so
// the card can play a collapse/fade animation before the server delete
// fires. Without this, the cache update would snap the card out instantly.
function WishlistCard({ product }) {
  const id  = product._id || product.id;
  const img = (product.images || []).find(Boolean) || product.imageUrl || '';
  const remove = useRemoveFromWishlist();
  const { openEnquiry } = useEnquiry();

  const [isRemoving, setIsRemoving] = useState(false);
  const busy = isRemoving || remove.isPending;

  // Triggers the collapse animation, then after the CSS transition window
  // fires the server-side delete. Cache invalidation then unmounts this
  // card — by which point the user has already seen the smooth collapse.
  const handleRemove = () => {
    if (busy) return;
    setIsRemoving(true);
    // Matches the 320ms max-height / 280ms opacity transition in index.css.
    setTimeout(() => remove.mutate(id), 300);
  };

  return (
    <div
      className={`wishlist-card bg-white border border-slate-100 rounded-2xl overflow-hidden flex flex-col ${
        isRemoving ? 'is-removing' : ''
      }`}
    >
      <Link to={`/product/${id}`} className="aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 grid place-items-center">
        {img ? (
          <img src={img} alt={product.name} className="w-full h-full object-contain p-4" />
        ) : (
          <Package className="w-16 h-16 text-slate-300" />
        )}
      </Link>
      <div className="p-4 flex-1 flex flex-col">
        <div className="text-[11px] uppercase tracking-widest text-slate-400">{product.series}</div>
        <Link to={`/product/${id}`} className="font-semibold text-hp-ink mt-1 line-clamp-2 hover:text-hp-blue">
          {product.name}
        </Link>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="font-display font-bold text-hp-ink">
            ₹{Number(product.price || 0).toLocaleString('en-IN')}
          </div>
          {product.mrp ? (
            <div className="text-xs text-slate-400 line-through">
              ₹{Number(product.mrp).toLocaleString('en-IN')}
            </div>
          ) : null}
        </div>
        <div className="mt-auto pt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEnquiry({ kind: 'product', product })}
            className="btn-primary flex-1 py-2 rounded-full text-xs inline-flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Enquire
          </button>
          <button
            onClick={handleRemove}
            disabled={busy}
            className="w-9 h-9 rounded-full border border-slate-200 grid place-items-center hover:border-accent-red hover:text-accent-red text-slate-500 disabled:opacity-50 transition-all duration-200 hover:scale-110 active:scale-95"
            title="Remove from wishlist"
            aria-label="Remove from wishlist"
          >
            {busy
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <HeartOff className="w-4 h-4" />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
