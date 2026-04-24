// Centralised helpers for store hours — used by the admin picker and the
// storefront locator so formatting + "is open now" logic stay in one place.
//
// Shape in DB:
//   hours = { days: ['mon','tue',…], open: 'HH:MM', close: 'HH:MM' }
// Legacy rows may still hold a free-form string ("10:00 AM – 8:00 PM").
// Helpers below accept either.

export const DAYS = [
  { key: 'mon', short: 'Mon', jsIndex: 1 },
  { key: 'tue', short: 'Tue', jsIndex: 2 },
  { key: 'wed', short: 'Wed', jsIndex: 3 },
  { key: 'thu', short: 'Thu', jsIndex: 4 },
  { key: 'fri', short: 'Fri', jsIndex: 5 },
  { key: 'sat', short: 'Sat', jsIndex: 6 },
  { key: 'sun', short: 'Sun', jsIndex: 0 },
];

const DAY_LABEL = Object.fromEntries(DAYS.map((d) => [d.key, d.short]));

// Legacy-string parser — same logic used previously so old data keeps
// working. Returns { open, close } as fractional hours (e.g. 9.5 = 9:30am).
function parseLegacyRange(raw) {
  if (!raw) return null;
  const re = /(\d{1,2})(?::(\d{2}))?\s*([ap])\s*m\b/gi;
  const matches = [...raw.matchAll(re)];
  if (matches.length < 2) return null;
  const toHour = (m) => {
    let h = parseInt(m[1], 10);
    const mn = parseInt(m[2] || '0', 10);
    const ampm = m[3].toLowerCase();
    if (isNaN(h) || h < 1 || h > 12) return NaN;
    if (ampm === 'p' && h !== 12) h += 12;
    if (ampm === 'a' && h === 12) h = 0;
    return h + mn / 60;
  };
  const open  = toHour(matches[0]);
  const close = toHour(matches[1]);
  if (isNaN(open) || isNaN(close)) return null;
  return { open, close };
}

// Parses a "HH:MM" string to fractional 24h hours. "09:30" → 9.5.
function hhmmToHours(s) {
  if (typeof s !== 'string') return NaN;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return NaN;
  const h = parseInt(m[1], 10);
  const mn = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mn < 0 || mn > 59) return NaN;
  return h + mn / 60;
}

// "09:00" → "9:00 AM", "21:30" → "9:30 PM"
function prettyTime(hhmm) {
  const x = hhmmToHours(hhmm);
  if (isNaN(x)) return '';
  const h = Math.floor(x);
  const mn = Math.round((x - h) * 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(mn).padStart(2, '0')} ${ampm}`;
}

// Compact a set of selected days into a readable list:
//   [mon..sun]           → "Mon–Sun"
//   [mon..sat]           → "Mon–Sat"
//   [mon, wed, fri]      → "Mon, Wed, Fri"
//   []                   → ""
function formatDays(days) {
  if (!Array.isArray(days) || days.length === 0) return '';
  const keys = DAYS.map((d) => d.key);
  const present = keys.filter((k) => days.includes(k));
  if (present.length === 0) return '';
  // Find contiguous ranges across the canonical order (Mon…Sun).
  const ranges = [];
  let start = 0;
  const idx = present.map((k) => keys.indexOf(k)).sort((a, b) => a - b);
  for (let i = 0; i < idx.length; i++) {
    if (i === idx.length - 1 || idx[i + 1] !== idx[i] + 1) {
      ranges.push([idx[start], idx[i]]);
      start = i + 1;
    }
  }
  return ranges
    .map(([a, b]) => (a === b ? DAY_LABEL[keys[a]] : `${DAY_LABEL[keys[a]]}–${DAY_LABEL[keys[b]]}`))
    .join(', ');
}

// Produces the human-readable line shown on store cards, e.g.
// "Mon–Sun · 9:00 AM – 9:00 PM". Returns '' when the store has no usable
// hours set — the caller decides whether to hide the row entirely.
export function formatHours(hours) {
  if (!hours) return '';
  if (typeof hours === 'string') return hours; // legacy
  const days = formatDays(hours.days);
  const open  = prettyTime(hours.open);
  const close = prettyTime(hours.close);
  if (!days && !open && !close) return '';
  if (!open || !close) return days || '';
  return days ? `${days} · ${open} – ${close}` : `${open} – ${close}`;
}

// Shared math used by both the legacy-string and structured paths of
// `storeStatus` below. Returns one of: 'open' | 'closed' | 'opening-soon'
// | 'closing-soon'. `cur`, `open`, `close` are fractional 24-hour values;
// `window` is how many hours before close / open we should flip to the
// "…soon" state (default 1 hour).
function computeStatus(cur, open, close, window = 1) {
  // Same-day range (e.g. 9 → 21)
  if (close > open) {
    if (cur < open) return open - cur <= window ? 'opening-soon' : 'closed';
    if (cur >= close) return 'closed';
    return close - cur <= window ? 'closing-soon' : 'open';
  }
  // Overnight range (e.g. 22 → 2) — "open now" if cur ≥ open OR cur < close.
  if (cur >= open || cur < close) {
    const remaining = cur >= open ? (24 - cur) + close : close - cur;
    return remaining <= window ? 'closing-soon' : 'open';
  }
  return open - cur <= window ? 'opening-soon' : 'closed';
}

// storeStatus — rich status for the StoreCard badge. Returns one of:
//   'open' | 'closed' | 'opening-soon' | 'closing-soon' | null
// null means the schedule couldn't be parsed (neutral "HOURS" badge).
export function storeStatus(hours, now = new Date()) {
  if (!hours) return null;

  // Legacy string path — only has time, no day info, so "closed today"
  // can't be detected. Treat every day as an open day.
  if (typeof hours === 'string') {
    const r = parseLegacyRange(hours);
    if (!r) return null;
    const cur = now.getHours() + now.getMinutes() / 60;
    return computeStatus(cur, r.open, r.close);
  }

  // Structured path.
  const days = Array.isArray(hours.days) ? hours.days : [];
  if (days.length === 0) return null;
  const today = DAYS.find((d) => d.jsIndex === now.getDay());
  if (!today || !days.includes(today.key)) return 'closed';

  const open  = hhmmToHours(hours.open);
  const close = hhmmToHours(hours.close);
  if (isNaN(open) || isNaN(close)) return null;
  const cur = now.getHours() + now.getMinutes() / 60;
  return computeStatus(cur, open, close);
}

// isStoreOpen — kept as a convenience boolean for any caller that only
// needs open/closed. Built on top of storeStatus so the two can't drift.
export function isStoreOpen(hours, now = new Date()) {
  const s = storeStatus(hours, now);
  if (s === null) return null;
  return s === 'open' || s === 'closing-soon';
}
