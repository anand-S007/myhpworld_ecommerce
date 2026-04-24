import { ArrowRight, CreditCard, CalendarClock, Repeat } from 'lucide-react';
import { OFFERS } from '../../data/mockData.js';
import { useOffers } from '../../hooks/queries.js';

const iconMap = { CreditCard, CalendarClock, Repeat };

export default function OfferStrip() {
  const { data } = useOffers();
  const offers = Array.isArray(data) && data.length ? data : OFFERS;

  return (
    <section className="py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-5">
        {offers.map((o, i) => {
          const Icon = iconMap[o.icon];
          return (
            <a
              key={i}
              href={o.link || '#'}
              className={`relative rounded-3xl p-7 overflow-hidden group ${o.textColor}`}
              style={{ background: o.bg }}
            >
              <div className="relative z-10">
                <div className={`text-xs font-semibold tracking-widest uppercase ${o.tagStyle}`}>
                  {o.tag}
                </div>
                <div className="font-display font-bold text-2xl mt-1 leading-tight">{o.title}</div>
                <p className="text-sm mt-2 opacity-80">{o.desc}</p>
                <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
                  {o.cta} <ArrowRight className="w-4 h-4 transition group-hover:translate-x-1" />
                </div>
              </div>
              {Icon && <Icon className={`w-28 h-28 absolute -right-4 -bottom-4 ${o.iconColor}`} />}
            </a>
          );
        })}
      </div>
    </section>
  );
}
