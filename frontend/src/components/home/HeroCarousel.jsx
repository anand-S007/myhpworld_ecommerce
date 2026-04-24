import { useEffect, useState } from 'react';
import { ArrowRight, Play, ChevronLeft, ChevronRight, Zap, Cpu, Monitor as MonitorIcon, Gamepad2, GraduationCap } from 'lucide-react';
import { BANNERS } from '../../data/mockData.js';
import { useBanners } from '../../hooks/queries.js';

const featureIconMap = { Zap, Cpu, Monitor: MonitorIcon, Gamepad2 };

function renderTitle(slide) {
  const line1 = slide.titleHighlight
    ? (() => {
        const parts = slide.title.split(slide.titleHighlight);
        return (
          <>
            {parts[0]}
            <span className={slide.titleHighlightClass}>{slide.titleHighlight}</span>
            {parts[1]}
          </>
        );
      })()
    : slide.title;

  if (!slide.titleLine2) return line1;
  return (
    <>
      {line1}
      <br />
      {slide.titleLine2}
    </>
  );
}

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const { data } = useBanners();
  const slides = Array.isArray(data) && data.length ? data : BANNERS;

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [slides.length]);

  const go = (i) => setCurrent((i + slides.length) % slides.length);

  return (
    <section className="relative overflow-hidden">
      <div className="relative hero-gradient text-white">
        <div className="absolute inset-0 grid-bg opacity-60" />

        {slides.map((s, i) => (
          <div
            key={i}
            className={`slide transition-opacity duration-700 ${
              i === current
                ? 'opacity-100 relative'
                : 'opacity-0 pointer-events-none absolute inset-0'
            }`}
          >
            <div className="max-w-7xl mx-auto px-4 py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center relative">
              <div className="relative z-10 animate-fadeUp">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-widest ${
                    s.badge?.red
                      ? 'bg-accent-red/90 text-white'
                      : 'bg-white/10 border border-white/20 text-white'
                  }`}
                >
                  {s.badge?.pulse && (
                    <span className="relative inline-block w-2 h-2 rounded-full bg-accent-mint pulse-dot" />
                  )}
                  {s.badge?.label}
                </span>
                <h1 className="mt-4 font-display font-extrabold text-4xl sm:text-5xl md:text-6xl leading-[1.02]">
                  {renderTitle(s)}
                </h1>
                <p className="mt-5 text-white/75 max-w-lg">{s.desc}</p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <a
                    href={s.cta?.primaryLink || '#'}
                    className="btn-primary px-6 py-3 rounded-full inline-flex items-center gap-2"
                  >
                    {s.cta?.primary} <ArrowRight className="w-4 h-4" />
                  </a>
                  {s.cta?.secondary && (
                    <a
                      href={s.cta?.secondaryLink || '#'}
                      className="btn-ghost text-white px-6 py-3 rounded-full inline-flex items-center gap-2 font-semibold"
                    >
                      {s.cta.secondary} <Play className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {s.features?.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-6 text-sm text-white/70">
                    {s.features.map(({ icon, label }, k) => {
                      const Icon = featureIconMap[icon];
                      return (
                        <div key={k} className="flex items-center gap-2">
                          {Icon && <Icon className="w-4 h-4 text-hp-blue" />} {label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Visual */}
              <div className="relative h-[320px] md:h-[440px]">
                {s.imageUrl ? (
                  <img
                    src={s.imageUrl}
                    alt={s.title}
                    className="w-full h-full object-contain drop-shadow-2xl"
                  />
                ) : (
                  <>
                    {s.visual === 'laptop' && <LaptopVisual />}
                    {s.visual === 'omen' && <OmenVisual />}
                    {s.visual === 'student' && <StudentVisual />}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Dots */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? 'w-8 bg-white' : 'w-3 bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Arrows */}
        <button
          onClick={() => go(current - 1)}
          className="hidden md:grid place-items-center absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/20 backdrop-blur hover:bg-white/20"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => go(current + 1)}
          className="hidden md:grid place-items-center absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/20 backdrop-blur hover:bg-white/20"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>
    </section>
  );
}

function LaptopVisual() {
  return (
    <div className="relative h-full">
      <div className="absolute inset-0 grid place-items-center">
        <div className="w-[380px] h-[380px] md:w-[480px] md:h-[480px] rounded-full border border-white/15" />
        <div className="absolute w-[280px] h-[280px] md:w-[360px] md:h-[360px] rounded-full border border-white/10" />
        <div className="absolute w-[180px] h-[180px] md:w-[240px] md:h-[240px] rounded-full bg-hp-blue/20 blur-2xl" />
      </div>
      <div className="relative z-10 h-full flex items-center justify-center">
        <svg viewBox="0 0 400 260" className="w-full max-w-md drop-shadow-2xl">
          <defs>
            <linearGradient id="lidG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1a2a44" />
              <stop offset="100%" stopColor="#0b1221" />
            </linearGradient>
            <linearGradient id="screenG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0096D6" />
              <stop offset="100%" stopColor="#002F5F" />
            </linearGradient>
          </defs>
          <rect x="40" y="20" width="320" height="190" rx="10" fill="url(#lidG)" stroke="#2a3a58" strokeWidth="1" />
          <rect x="54" y="34" width="292" height="162" rx="4" fill="url(#screenG)" />
          <rect x="70" y="52" width="120" height="8" rx="2" fill="#ffffff" opacity=".7" />
          <rect x="70" y="68" width="200" height="4" rx="2" fill="#ffffff" opacity=".3" />
          <rect x="70" y="78" width="160" height="4" rx="2" fill="#ffffff" opacity=".3" />
          <rect x="70" y="100" width="80" height="60" rx="4" fill="#ffffff" opacity=".18" />
          <rect x="160" y="100" width="80" height="60" rx="4" fill="#ffffff" opacity=".22" />
          <rect x="250" y="100" width="80" height="60" rx="4" fill="#ffffff" opacity=".15" />
          <path d="M20 210 L380 210 L360 236 L40 236 Z" fill="#0e1a2e" />
          <rect x="170" y="210" width="60" height="6" rx="2" fill="#1a2a44" />
        </svg>
      </div>
    </div>
  );
}

function OmenVisual() {
  return (
    <div className="relative h-full grid place-items-center">
      <div className="absolute w-[300px] h-[300px] md:w-[380px] md:h-[380px] rounded-full bg-accent-red/25 blur-3xl" />
      <div className="text-[180px] md:text-[240px] font-display font-extrabold text-white/10 leading-none">
        OMEN
      </div>
      <Gamepad2 className="w-40 h-40 md:w-56 md:h-56 text-white absolute" />
    </div>
  );
}

function StudentVisual() {
  return (
    <div className="relative h-full grid place-items-center">
      <div className="absolute w-[300px] h-[300px] rounded-full bg-hp-blue/30 blur-3xl" />
      <GraduationCap className="w-48 h-48 md:w-64 md:h-64 text-white/90" />
    </div>
  );
}
