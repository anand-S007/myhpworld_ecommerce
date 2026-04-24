// Standard spec keys per category slug. Used by both the admin form
// (AdminProducts) and the bulk upload modal (BulkUploadProducts) to:
//   - pre-fill the specs grid on the single-product form
//   - generate the category-specific CSV/Excel template for bulk import
//
// Adding a new key here immediately shows up in both flows. Unknown
// categories (i.e. ones the admin created in the Categories UI but not
// listed here) fall back to just the core product columns — the admin
// can add custom spec columns to the downloaded template by hand.
export const SPEC_TEMPLATES = {
  laptops:     ['Processor', 'RAM', 'Storage', 'Graphics', 'Screen', 'Operating System', 'Battery', 'Weight', 'Ports', 'Warranty'],
  desktops:    ['Processor', 'RAM', 'Storage', 'Graphics', 'Display', 'Operating System', 'Ports', 'Warranty'],
  printers:    ['Type', 'Print Speed', 'Print Resolution', 'Connectivity', 'Paper Size', 'Duplex', 'Warranty'],
  monitors:    ['Screen Size', 'Resolution', 'Panel Type', 'Refresh Rate', 'Response Time', 'Ports', 'Warranty'],
  gaming:      ['Processor', 'RAM', 'Storage', 'Graphics', 'Screen', 'Cooling', 'Keyboard', 'Operating System', 'Warranty'],
  accessories: ['Type', 'Compatibility', 'Connectivity', 'Warranty'],
  'ink-toner': ['Type', 'Compatible Printers', 'Yield (Pages)', 'Color', 'Warranty'],
};

export const CORE_BULK_HEADERS = [
  'Series', 'Model', 'Sub Category', 'MOP', 'Offer Price', 'Stock',
];
export const IMAGE_BULK_HEADERS = ['Image1', 'Image2', 'Image3'];

// Build the full header row for a given category slug. Callers supply
// the category; the spec keys fall out of SPEC_TEMPLATES (or [] for an
// unknown category — see note at the top of this file).
export function buildTemplateHeaders(categorySlug) {
  const specKeys = SPEC_TEMPLATES[categorySlug] || [];
  return [...CORE_BULK_HEADERS, ...specKeys, ...IMAGE_BULK_HEADERS];
}
