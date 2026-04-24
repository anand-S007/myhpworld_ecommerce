import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackVisit } from '../../services/api.js';

// Mount once at the app root. Fires a POST /api/visits on every client-side
// route change with a client-generated sessionId persisted in localStorage,
// so the admin dashboard can count total pageviews + unique visitors.
//
// Admin routes are skipped — the dashboard itself shouldn't inflate the
// metrics admins are looking at.
const SESSION_KEY = 'myhpworld_session_id';

// Stable random session id per browser. Kept simple — no crypto, no
// fingerprinting; just enough entropy to dedupe unique visitors.
function getSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // localStorage can throw in private mode — fall back to an in-memory id.
    return `mem-${Math.random().toString(36).slice(2, 12)}`;
  }
}

export default function VisitTracker() {
  const { pathname } = useLocation();
  // Last path we logged. Prevents double-firing in React 18 StrictMode
  // development mounts and repeated effect runs on the same URL.
  const lastLogged = useRef(null);

  useEffect(() => {
    if (pathname === lastLogged.current) return;
    // Don't inflate analytics with admin traffic — the dashboard is the
    // audience for this number, not a contributor.
    if (pathname.startsWith('/admin')) return;
    lastLogged.current = pathname;
    trackVisit({
      sessionId: getSessionId(),
      path:      pathname,
      referrer:  document.referrer || '',
    });
  }, [pathname]);

  return null;
}
