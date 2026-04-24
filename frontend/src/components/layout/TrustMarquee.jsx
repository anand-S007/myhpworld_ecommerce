import { BadgeCheck, RotateCcw, CreditCard, Wrench, Gift, ShieldCheck } from 'lucide-react';

const items = [
  { icon: BadgeCheck, label: 'Authorised HP Reseller' },
  { icon: RotateCcw, label: '7-day easy returns' },
  { icon: CreditCard, label: 'No-cost EMI from ₹2,999/mo' },
  { icon: Wrench, label: 'Onsite warranty service' },
  { icon: Gift, label: 'Exclusive member rewards' },
  { icon: ShieldCheck, label: '100% genuine products' },
];

export default function TrustMarquee() {
  return (
    <div className="bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-3 overflow-hidden">
        <div className="animate-marquee flex gap-14 whitespace-nowrap w-[200%] text-slate-500 text-sm">
          {[...items, ...items].map(({ icon: Icon, label }, i) => (
            <span key={i} className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-hp-blue" /> {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
