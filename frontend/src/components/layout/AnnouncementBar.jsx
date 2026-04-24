import { ShieldCheck, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

// Top strip on every page. Intentionally no delivery / shipping / order-
// tracking messaging — the site is in-store-purchase mode for now. The
// strip promotes the warranty promise, the store locator, and the phone
// line so shoppers know how to actually reach us.
export default function AnnouncementBar() {
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
          <a href="tel:18001234567" className="flex items-center gap-1.5 hover:text-hp-blue">
            <Phone className="w-3.5 h-3.5" /> 1800-123-4567
          </a>
        </div>
      </div>
    </div>
  );
}
