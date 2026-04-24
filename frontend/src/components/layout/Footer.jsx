import Logo from '../common/Logo.jsx';

const shopLinks = ['Laptops', 'Desktops', 'Printers', 'Monitors', 'Gaming (OMEN / Victus)', 'Accessories'];
// Support column is in-store-first: no "Track your order" or "Returns &
// refunds" since we don't sell online yet. Add those back when online
// purchases launch.
const supportLinks = [
  'Warranty registration',
  'Service centres',
  'Drivers & downloads',
  'Contact us',
];
const companyLinks = [
  'About HP World',
  'Store locator',
  'Business & EDU',
  'Careers',
  'Blog & press',
  'Become a partner',
];

export default function Footer() {
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
            {/* Social icons removed for now — lucide-react dropped its brand
                glyphs and the hrefs were placeholders. Re-add with inline
                SVGs once the client has real social accounts. */}
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
          <li key={l}>
            <a className="hover:text-white" href="#">
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
