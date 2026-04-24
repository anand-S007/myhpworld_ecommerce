// Offer card theming — curated to the brand palette declared in
// tailwind.config.js. Admins pick from these presets instead of entering
// arbitrary CSS so the storefront stays on-brand.

// Each preset stores everything needed to drive an offer card:
//   bg         — CSS linear-gradient string saved to the offer document
//   textColor  — Tailwind class for the title/desc text
//   tagStyle   — Tailwind class for the small tag label
//   iconColor  — Tailwind class for the background icon
export const OFFER_GRADIENTS = [
  {
    label: 'Blue → Navy',
    bg: 'linear-gradient(135deg,#0096D6,#00205B)',
    textColor: 'text-white',
    tagStyle: 'opacity-80',
    iconColor: 'text-white/15',
  },
  {
    label: 'Amber Warm',
    bg: 'linear-gradient(135deg,#FCE7C8,#F59E0B)',
    textColor: 'text-hp-ink',
    tagStyle: 'opacity-80',
    iconColor: 'text-hp-ink/15',
  },
  {
    label: 'Deep Navy',
    bg: 'linear-gradient(135deg,#0B1221,#1a2a44)',
    textColor: 'text-white',
    tagStyle: 'text-accent-amber',
    iconColor: 'text-white/15',
  },
  {
    label: 'Blue → Mint',
    bg: 'linear-gradient(135deg,#0096D6,#10B981)',
    textColor: 'text-white',
    tagStyle: 'opacity-80',
    iconColor: 'text-white/15',
  },
  {
    label: 'Red → Amber',
    bg: 'linear-gradient(135deg,#E0261B,#F59E0B)',
    textColor: 'text-white',
    tagStyle: 'opacity-80',
    iconColor: 'text-white/15',
  },
  {
    label: 'Navy → Ink',
    bg: 'linear-gradient(135deg,#002F5F,#0B1221)',
    textColor: 'text-white',
    tagStyle: 'text-accent-amber',
    iconColor: 'text-white/15',
  },
];

// Admins choose one of these for offer text. These are the two legible
// choices against any of the presets above — light on dark gradients, dark
// on the amber gradient. Each option bundles the matching tag and icon
// tints so the card stays cohesive.
export const OFFER_TEXT_COLORS = [
  {
    label: 'Light (for dark backgrounds)',
    textColor: 'text-white',
    tagStyle: 'opacity-80',
    iconColor: 'text-white/15',
    swatch: '#FFFFFF',
  },
  {
    label: 'Dark (for light backgrounds)',
    textColor: 'text-hp-ink',
    tagStyle: 'opacity-80',
    iconColor: 'text-hp-ink/15',
    swatch: '#0B1221',
  },
];
