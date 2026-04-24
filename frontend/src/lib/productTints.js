// Product-card tint palette — curated so cards stay on-brand across categories.
// Each tint is a Tailwind "from-… to-…" fragment consumed by ProductCard via
// `className={'bg-gradient-to-br ' + product.tint}`. Admins pick one rather
// than typing Tailwind class names or arbitrary hex values.
export const PRODUCT_TINTS = [
  { label: 'Neutral',    value: 'from-slate-50 to-slate-100',      preview: 'linear-gradient(135deg,#f8fafc,#f1f5f9)' },
  { label: 'HP Blue',    value: 'from-sky-50 to-sky-200',          preview: 'linear-gradient(135deg,#f0f9ff,#bae6fd)' },
  { label: 'Navy Mist',  value: 'from-slate-100 to-blue-200',      preview: 'linear-gradient(135deg,#f1f5f9,#bfdbfe)' },
  { label: 'Gaming Red', value: 'from-rose-50 to-rose-200',        preview: 'linear-gradient(135deg,#fff1f2,#fecdd3)' },
  { label: 'Amber Warm', value: 'from-amber-50 to-amber-200',      preview: 'linear-gradient(135deg,#fffbeb,#fde68a)' },
  { label: 'Mint Fresh', value: 'from-emerald-50 to-emerald-200',  preview: 'linear-gradient(135deg,#ecfdf5,#a7f3d0)' },
  { label: 'Lavender',   value: 'from-violet-50 to-violet-200',    preview: 'linear-gradient(135deg,#f5f3ff,#ddd6fe)' },
  { label: 'Graphite',   value: 'from-zinc-100 to-zinc-300',       preview: 'linear-gradient(135deg,#f4f4f5,#d4d4d8)' },
];
