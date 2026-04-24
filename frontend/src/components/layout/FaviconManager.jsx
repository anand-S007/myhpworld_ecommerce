import { useEffect } from 'react';
import { useSettings } from '../../hooks/queries.js';

// FaviconManager — keeps the browser tab icon in sync with the admin's
// branding settings. It's a zero-render component: mount it once at the
// app root and it mutates the existing <link rel="icon"> href (or creates
// one if the HTML didn't ship with any).
//
// We intentionally clone the link element rather than mutating href in
// place. Chrome and Safari cache favicons aggressively and often ignore a
// same-node href change, but they always re-fetch when the element itself
// is replaced in the <head>.
export default function FaviconManager() {
  const { data } = useSettings();
  const faviconUrl = data?.faviconUrl || '';

  useEffect(() => {
    // Swap the existing icon. If none exists yet, build one from scratch.
    const head = document.head;
    const existing = head.querySelector('link[rel="icon"]');
    const next = document.createElement('link');
    next.rel  = 'icon';
    // Pick a sensible MIME — falls back to image/x-icon when we can't tell.
    const guessed = guessIconType(faviconUrl || existing?.getAttribute('href') || '');
    if (guessed) next.type = guessed;
    // If the admin hasn't uploaded a favicon, respect whatever index.html
    // shipped with (usually /favicon.svg). Passing an empty href would
    // blank the tab icon.
    next.href = faviconUrl || existing?.getAttribute('href') || '/favicon.svg';

    if (existing) existing.remove();
    head.appendChild(next);
  }, [faviconUrl]);

  return null;
}

function guessIconType(src) {
  const lower = (src || '').toLowerCase();
  if (lower.endsWith('.svg'))  return 'image/svg+xml';
  if (lower.endsWith('.png'))  return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.ico'))  return 'image/x-icon';
  return '';
}
