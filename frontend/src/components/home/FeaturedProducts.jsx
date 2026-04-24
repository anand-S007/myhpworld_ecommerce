import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '../common/ProductCard.jsx';
import { FEATURED } from '../../data/mockData.js';
import { useFeatured } from '../../hooks/queries.js';

export default function FeaturedProducts() {
  const [active, setActive] = useState('All');
  const { data } = useFeatured();
  const allProducts = Array.isArray(data) && data.length ? data : FEATURED;

  // Build filter tabs dynamically from loaded products
  const filters = ['All', ...new Set(allProducts.map((p) => capitalize(p.category)).filter(Boolean))];

  const products =
    active === 'All'
      ? allProducts
      : allProducts.filter((p) => p.category === active.toLowerCase());

  return (
    <section className="py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-hp-blue font-semibold">
              Curated for you
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-2 text-hp-ink">
              Featured products
            </h2>
          </div>
          <div className="hidden md:flex gap-2 text-sm font-medium">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActive(f)}
                className={`px-4 py-2 rounded-full border transition ${
                  active === f
                    ? 'bg-hp-ink text-white border-hp-ink'
                    : 'border-slate-200 hover:border-hp-blue hover:text-hp-blue'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.map((p) => (
            // Mongo products expose `_id`; the bundled mock uses `id`.
            // Accept either so every card gets a stable, unique key.
            <ProductCard key={p._id || p.id} product={p} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-hp-ink text-hp-ink font-semibold hover:bg-hp-ink hover:text-white transition"
          >
            View all products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
