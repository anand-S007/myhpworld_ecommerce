import { Linkedin, Mail, Phone, Link as LinkIcon, MessageCircle, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../common/Logo.jsx';
import { useSettings } from '../../hooks/queries.js';

// Lucide deprecated most brand glyphs for trademark reasons. Inline SVGs
// avoid the warning and — unlike the lucide versions — render the real
// monochrome logos at any size.
const FacebookIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.14 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.09 0 2.24.19 2.24.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.77l-.44 2.91h-2.33V22c4.78-.8 8.44-4.94 8.44-9.94Z" />
  </svg>
);
const InstagramIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.81.25 2.23.42.56.22.96.48 1.38.9s.68.82.9 1.38c.16.42.37 1.06.42 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.81-.42 2.23a3.72 3.72 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.16-1.06.37-2.23.42-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.81-.25-2.23-.42a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.37-1.06-.42-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.81.42-2.23.22-.56.48-.96.9-1.38s.82-.68 1.38-.9c.42-.16 1.06-.37 2.23-.42C8.42 2.17 8.8 2.16 12 2.16Zm0-2.16C8.74 0 8.33.01 7.05.07 5.77.13 4.9.34 4.14.63a5.88 5.88 0 0 0-2.12 1.39A5.88 5.88 0 0 0 .63 4.14C.34 4.9.13 5.77.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.28.27 2.15.56 2.91.3.79.7 1.46 1.39 2.12a5.88 5.88 0 0 0 2.12 1.39c.76.29 1.63.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.28-.06 2.15-.27 2.91-.56a5.88 5.88 0 0 0 2.12-1.39 5.88 5.88 0 0 0 1.39-2.12c.29-.76.5-1.63.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.27-2.15-.56-2.91a5.88 5.88 0 0 0-1.39-2.12A5.88 5.88 0 0 0 19.86.63C19.1.34 18.23.13 16.95.07 15.67.01 15.26 0 12 0Zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84Zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4Zm6.41-11.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44Z" />
  </svg>
);
const TwitterIcon = (props) => (
  // X / Twitter
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2H21.5l-7.5 8.57L22.75 22H16l-5.25-6.87L4.72 22H1.47l8-9.14L1.25 2H8.1l4.75 6.28L18.24 2Zm-1.14 18h1.8L6.96 4H5.04l12.07 16Z" />
  </svg>
);
const YoutubeIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.51 3.5 12 3.5 12 3.5s-7.51 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.77 31.77 0 0 0 0 12a31.77 31.77 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14C4.49 20.5 12 20.5 12 20.5s7.51 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.77 31.77 0 0 0 24 12a31.77 31.77 0 0 0-.5-5.81ZM9.75 15.52v-7.04L15.82 12Z" />
  </svg>
);

// Footer link structure.
//   { label, to }     → renders a clickable react-router <Link>
//   { label }         → renders as a disabled label (no route exists yet)
//
// As we add real pages later (e.g. /about, /careers, /contact) we just add
// `to: '/about'` to the object — the disabled rendering switches to a link
// automatically.
const shopLinks = [
  { label: 'Laptops',                 to: '/shop/laptops' },
  { label: 'Desktops',                to: '/shop/desktops' },
  { label: 'Printers',                to: '/shop/printers' },
  { label: 'Monitors',                to: '/shop/monitors' },
  { label: 'Gaming (OMEN / Victus)',  to: '/shop/gaming' },
  { label: 'Accessories',             to: '/shop/accessories' },
];
// Support column is in-store-first: no "Track your order" or "Returns &
// refunds" since we don't sell online yet. Add those back when online
// purchases launch.
const supportLinks = [
  { label: 'Warranty registration' },
  { label: 'Service centres',  to: '/stores' },  // re-uses the store locator
  { label: 'Drivers & downloads' },
  { label: 'Contact us' },
];
const companyLinks = [
  { label: 'About HP World' },
  { label: 'Store locator',     to: '/stores' },
  { label: 'Business & EDU' },
  { label: 'Careers' },
  { label: 'Blog & press' },
  { label: 'Become a partner' },
];

// Socials — the icon component + the settings key. Empty URLs get skipped
// so only filled accounts render. Order mirrors how most brands list them.
// Lookup table: admin-chosen platform key → icon component + default label.
// Anything not here falls back to a generic link glyph + the admin-entered
// `label` (or the raw URL) so custom platforms still render a button.
const PLATFORM_META = {
  facebook:  { icon: FacebookIcon,  label: 'Facebook' },
  instagram: { icon: InstagramIcon, label: 'Instagram' },
  twitter:   { icon: TwitterIcon,   label: 'Twitter / X' },
  x:         { icon: TwitterIcon,   label: 'X' },
  linkedin:  { icon: Linkedin,      label: 'LinkedIn' },
  youtube:   { icon: YoutubeIcon,   label: 'YouTube' },
  whatsapp:  { icon: MessageCircle, label: 'WhatsApp' },
  telegram:  { icon: Send,          label: 'Telegram' },
};

export default function Footer() {
  const { data } = useSettings();
  const email   = data?.email || '';
  const phone   = data?.phone || '';
  // Normalise socials to an array — legacy docs may still be the old
  // object shape on the first read before a save.
  const rawSocials = data?.socials;
  const socials = Array.isArray(rawSocials)
    ? rawSocials.filter((s) => s?.url)
    : (rawSocials && typeof rawSocials === 'object'
        ? Object.entries(rawSocials)
            .filter(([, v]) => typeof v === 'string' && v.trim())
            .map(([platform, url]) => ({ platform, label: '', url }))
        : []);
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '';

  return (
    <footer className="bg-[#05080F] text-slate-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-5 gap-10 pb-10 border-b border-white/10">
          <div className="md:col-span-2">
            <Logo to="/" variant="dark" size="md" />
            <p className="text-sm text-slate-400 mt-5 max-w-sm">
              Authorised HP World retail stores across India — genuine HP laptops, desktops, printers,
              monitors and accessories, backed by authorised warranty and service.
            </p>

            {/* Contact lines — only rendered when the admin has set a value */}
            {(email || phone) && (
              <div className="mt-5 space-y-2 text-sm">
                {phone && (
                  <a
                    href={telHref}
                    className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                  >
                    <Phone className="w-4 h-4 text-hp-blue shrink-0" /> {phone}
                  </a>
                )}
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors break-all"
                  >
                    <Mail className="w-4 h-4 text-hp-blue shrink-0" /> {email}
                  </a>
                )}
              </div>
            )}

            {/* Social icons — each row in admin's socials list renders
                here. Unknown platforms get a generic link icon + the
                admin's `label` (or URL) as the tooltip. */}
            {socials.length > 0 && (
              <div className="mt-5 flex items-center gap-2 flex-wrap">
                {socials.map((s, i) => {
                  const meta = PLATFORM_META[s.platform] || {};
                  const Icon = meta.icon || LinkIcon;
                  const label = s.label?.trim() || meta.label || s.platform || s.url;
                  return (
                    <a
                      key={s._id || `${s.platform}-${i}`}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                      className="w-9 h-9 rounded-full grid place-items-center bg-white/5 hover:bg-hp-blue text-slate-300 hover:text-white transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <FooterCol title="Shop" links={shopLinks} />
          <FooterCol title="Support" links={supportLinks} />
          <FooterCol title="Company" links={companyLinks} />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-6 text-xs text-slate-500">
          <div>© 2026 HP World India. All rights reserved. HP and the HP logo are trademarks of HP Inc.</div>
          <div className="flex items-center gap-5">
            <a className="hover:text-white" href="#">Privacy</a>
            <a className="hover:text-white" href="#">Terms</a>
            <a className="hover:text-white" href="#">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div className="text-white font-semibold mb-4">{title}</div>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            {l.to ? (
              <Link to={l.to} className="hover:text-white transition-colors">
                {l.label}
              </Link>
            ) : (
              // No route yet — render as a plain disabled label so the
              // section structure is still visible to the user but the
              // entry doesn't pretend to navigate anywhere.
              <span
                className="text-slate-500 cursor-not-allowed select-none"
                title="Coming soon"
                aria-disabled="true"
              >
                {l.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
