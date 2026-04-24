import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Laptop, ArrowRight } from 'lucide-react';
import { CATEGORIES } from '../../data/mockData.js';
import { useCategories } from '../../hooks/queries.js';

export default function CategoryGrid() {
  const { data } = useCategories();
  const categories = Array.isArray(data) && data.length ? data : CATEGORIES;

  // The full lucide icon map (~1,700 components) is only loaded when this
  // section mounts — a dynamic import keeps it out of the main storefront
  // bundle. Until the chunk arrives we render a generic Laptop icon so the
  // layout doesn't pop.
  const [iconMap, setIconMap] = useState(null);
  useEffect(() => {
    let alive = true;
    import('../../lib/categoryIcons.js').then((mod) => {
      if (alive) setIconMap(() => mod.categoryIconMap);
    });
    return () => { alive = false; };
  }, []);

  return (
    <section className="py-16 md:py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-hp-blue font-semibold">Explore</div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-2 text-hp-ink">
              Shop by category
            </h2>
          </div>
          <Link to="/shop" className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-hp-navy hover:text-hp-blue">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((c) => {
            const Icon = (iconMap && iconMap[c.icon]) || Laptop;
            return (
              <Link
                key={c.slug}
                to={`/shop/${c.slug}`}
                className="cat-card group bg-white rounded-2xl p-5 shadow-soft hover:shadow-lift relative overflow-hidden"
              >
                {c.imageUrl ? (
                  <img src={c.imageUrl} alt={c.name} className="w-14 h-14 rounded-xl object-cover mb-4" />
                ) : (
                  <div className="w-14 h-14 rounded-xl icon-tile grid place-items-center mb-4">
                    <Icon className="w-7 h-7 text-hp-blue" />
                  </div>
                )}
                <div className="font-semibold text-hp-ink">{c.name}</div>
                <div className="text-xs text-slate-500 mt-1">{c.subtitle}</div>
                <div className={`cat-bar absolute bottom-0 left-0 h-1 w-6 ${c.accent ? 'bg-accent-red' : 'bg-hp-blue'}`} />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
