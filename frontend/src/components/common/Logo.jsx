import { Link } from 'react-router-dom';
import { useSettings } from '../../hooks/queries.js';

// Logo — single source of truth for how the site logo appears, reused by
// Navbar, Footer, and AdminLayout.
//
// Reads branding from the admin-managed /api/settings endpoint. When a
// custom logoUrl has been uploaded, render it as an image constrained by
// height (so wide / square logos both fit without distortion). Otherwise
// fall back to the stylised "hp" badge + brand text.
//
// Props
//   `variant`    'light' (default) — dark text on light backgrounds (Navbar)
//                'dark'            — white text on dark backgrounds (Footer / Admin sidebar)
//   `size`       'md' (default, h-10 ≈ 40px) | 'sm' (h-9 ≈ 36px used in admin sidebar)
//   `showText`   whether to render brand name + tagline alongside the badge.
//                If a custom logo is uploaded, the image replaces the whole
//                mark so text is hidden regardless.
//   `to`         wrap in a <Link to={to}>. Pass null to render as a plain div.
export default function Logo({
  variant = 'light',
  size = 'md',
  showText = true,
  to = '/',
  subtitle,         // override the tagline for this instance (e.g. "Control Panel")
  nameOverride,     // override the brand name (e.g. "HP World Admin")
  className = '',
}) {
  const { data } = useSettings();
  const logoUrl   = data?.logoUrl   || '';
  const brandName = nameOverride || data?.brandName || 'HP World';
  const tagline   = subtitle      ?? data?.tagline  ?? 'myhpworld.com';

  const dim = size === 'sm' ? 'w-9 h-9 text-base' : 'w-10 h-10 text-lg';
  const imgHeight = size === 'sm' ? 'h-9' : 'h-10';
  const text = variant === 'dark' ? 'text-white' : 'text-hp-navy';
  const subColor = variant === 'dark' ? 'text-white/60' : 'text-slate-500';

  const body = logoUrl ? (
    // Custom logo image — constrained by height so square and wide logos
    // both fit. `max-w` keeps an oversized logo from pushing the navbar.
    <img
      src={logoUrl}
      alt={brandName}
      className={`${imgHeight} w-auto max-w-[180px] object-contain`}
    />
  ) : (
    <>
      <div className={`${dim} rounded-lg bg-hp-blue grid place-items-center font-display font-extrabold text-white shrink-0`}>
        hp
      </div>
      {showText && (
        <div className="leading-tight min-w-0">
          <div className={`font-display font-extrabold ${text} ${size === 'sm' ? 'text-sm' : 'text-lg'}`}>
            {brandName}
          </div>
          {tagline && (
            <div className={`text-[10px] tracking-widest uppercase ${subColor}`}>
              {tagline}
            </div>
          )}
        </div>
      )}
    </>
  );

  const wrapper = `flex items-center gap-2 shrink-0 ${className}`;
  if (!to) return <div className={wrapper}>{body}</div>;
  return (
    <Link to={to} className={wrapper}>
      {body}
    </Link>
  );
}
