import { ShieldCheck, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../../hooks/queries.js';

// Top strip on every page. Intentionally no delivery / shipping / order-
// tracking messaging — the site is in-store-purchase mode for now. The
// strip promotes the warranty promise, the store locator, and the phone
// line so shoppers know how to actually reach us.
//
// Phone number is read from the admin-managed Settings doc; falls back
// to the project's placeholder until the settings query resolves.
const FALLBACK_PHONE = '+91 99461 26608';

export default function AnnouncementBar() {
  const { data } = useSettings();
  const phone = data?.phone || FALLBACK_PHONE;
  // Strip everything except digits + leading + for the `tel:` href so
  // iOS / Android autodialers pick it up cleanly.
  const telHref = `tel:${phone.replace(/[^\d+]/g, '')}`;

  return (
    <div className="bg-hp-ink text-white text-xs">
      <div className="max-w-7xl mx-auto px-4 h-9 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> 100% Genuine HP products · Full HP India warranty
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/stores" className="flex items-center gap-1.5 hover:text-hp-blue">
            <MapPin className="w-3.5 h-3.5" /> Find a Store
          </Link>
          <span className="hidden sm:inline text-white/30">|</span>
          <a href={telHref} className="flex items-center gap-1.5 hover:text-hp-blue">
            <Phone className="w-3.5 h-3.5" /> {phone}
          </a>
        </div>
      </div>
    </div>
  );
}
