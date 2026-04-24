export default function BrandRibbon() {
  return (
    <section className="py-10 border-y border-slate-100 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-around gap-8 text-slate-500">
        <div className="text-xs uppercase tracking-[0.25em] font-semibold text-slate-400">
          Trusted brands in-store
        </div>
        <div className="font-display font-bold text-2xl">hp</div>
        <div className="font-display font-bold text-2xl">OMEN</div>
        <div className="font-display font-bold text-2xl tracking-widest">POLY</div>
        <div className="font-display font-bold text-2xl italic">HyperX</div>
        <div className="font-display font-bold text-2xl">Instant Ink</div>
      </div>
    </section>
  );
}
