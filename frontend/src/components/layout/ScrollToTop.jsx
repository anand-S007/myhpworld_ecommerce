import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

// ScrollToTop — resets window scroll to the top on every route change.
//
// React Router does not reset scroll on navigation, so going from a
// scrolled /shop to /product/:id leaves the browser at the old offset and
// the page feels like it "jumped".
//
// Why useLayoutEffect: fires before paint, so the jump happens before the
// new page becomes visible instead of after.
//
// Why we disable `scroll-behavior: smooth` around the reset: the project's
// index.css sets it globally on <html>, which would otherwise animate the
// scroll on every navigation (long pages → annoying 300–800px animated
// scroll-up). We want navigation to feel instant, not animated.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    html.style.scrollBehavior = prev;
  }, [pathname]);

  return null;
}
