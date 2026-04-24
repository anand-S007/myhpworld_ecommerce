import { BadgeCheck, Store, Headphones, Wallet } from 'lucide-react';

// Feature cards are in-store-first right now — the "Fast nationwide
// delivery" promise was removed because we don't ship yet. When online
// purchase launches later, add the Truck card back with accurate copy.
const features = [
  {
    icon: BadgeCheck,
    title: 'Authorised HP Store',
    desc: 'Every product is 100% genuine with full HP India warranty.',
  },
  {
    icon: Store,
    title: 'Walk-in & carry-home',
    desc: 'Hands-on demos at our stores · Take it home the same day.',
  },
  {
    icon: Headphones,
    title: 'Expert support',
    desc: 'Pre-sales advice, setup help & onsite service from trained HP engineers.',
  },
  {
    icon: Wallet,
    title: 'Flexible financing',
    desc: 'No-cost EMI, bank offers, and exchange bonus up to ₹15,000.',
  },
];

export default function WhyHpWorld() {
  return (
    <section className="py-16 md:py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.25em] text-hp-blue font-semibold">
            Why HP World
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold mt-3 text-hp-ink">
            India's most trusted HP experience
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-soft">
                <div className="w-12 h-12 rounded-xl bg-hp-blue/10 grid place-items-center mb-4">
                  <Icon className="w-6 h-6 text-hp-blue" />
                </div>
                <div className="font-semibold text-hp-ink">{f.title}</div>
                <div className="text-sm text-slate-500 mt-1">{f.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
