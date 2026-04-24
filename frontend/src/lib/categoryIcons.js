import * as Lucide from 'lucide-react';

// Non-icon exports from lucide-react we never want to surface in the picker.
const SKIP = new Set(['createLucideIcon', 'Icon', 'LucideIcon', 'icons', 'default']);

// lucide-react v0.441 ships each icon under several aliases — e.g. `Laptop`,
// `LaptopIcon`, and `LucideLaptop` all resolve to the same component. We keep
// the bare name only so the picker doesn't show triplicates of every icon.
function isAliasName(name) {
  if (name.length > 4 && name.endsWith('Icon')) return true;
  if (name.length > 6 && name.startsWith('Lucide')) return true;
  return false;
}

// Flat, alphabetical list of every lucide icon. Used by the admin search +
// grid. Also the single source of truth consumed by `categoryIconMap`.
// Importing the entire lucide-react namespace is intentional here: the user
// explicitly wants the admin to be able to pick ANY icon, and the homepage
// renderer must be able to resolve whichever one they picked.
export const CATEGORY_ICONS = Object.entries(Lucide)
  .filter(([name]) => /^[A-Z]/.test(name))
  .filter(([name]) => !SKIP.has(name))
  .filter(([name]) => !isAliasName(name))
  .map(([name, Icon]) => ({ name, Icon }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Name → component map for fast lookup at render time (CategoryGrid, admin table).
export const categoryIconMap = Object.fromEntries(
  CATEGORY_ICONS.map(({ name, Icon }) => [name, Icon])
);
