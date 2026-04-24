// Default WhatsApp number — digits-only international format. Falls back
// to this value when the admin-managed Settings doc hasn't loaded yet (or
// on the very first page view before React Query hydrates the cache).
export const DEFAULT_WHATSAPP_NUMBER = '919946126608';

// Live number used by the URL helpers below. Updated by <ContactSync /> in
// App.jsx whenever the admin saves a new value via the branding page.
// Using a module-level variable (not a React hook) means every helper
// export can remain a plain function — components keep calling
// `buildEnquiryUrl(product)` with no new wiring.
let CURRENT_WHATSAPP = DEFAULT_WHATSAPP_NUMBER;

export function setWhatsAppNumber(n) {
  const digits = String(n || '').replace(/\D/g, '');
  CURRENT_WHATSAPP = digits || DEFAULT_WHATSAPP_NUMBER;
}

export function getWhatsAppNumber() {
  return CURRENT_WHATSAPP;
}

// Backwards-compat export: some older modules imported the constant
// directly. They'll still see the default on import, but for any real
// wa.me link construction you should use `getWhatsAppNumber()` or one of
// the URL builders below so the admin's saved number flows through.
export const WHATSAPP_NUMBER = DEFAULT_WHATSAPP_NUMBER;

// Prepend the visitor's details to the outgoing message so the company
// team sees who they're talking to before opening the chat. Skipped when
// no visitor info is available.
function visitorLines(visitor) {
  if (!visitor || !visitor.name) return [];
  const lines = [`Hi, I'm ${visitor.name}.`];
  if (visitor.email) lines.push(`Email: ${visitor.email}`);
  if (visitor.phone) lines.push(`Phone: ${visitor.phone}`);
  lines.push('');
  return lines;
}

function wa(text) {
  return `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(text)}`;
}

export function buildEnquiryUrl(product, visitor) {
  const lines = [
    ...visitorLines(visitor),
    'Hello, I would like to enquire about the following product:',
  ];
  if (product?.name) lines.push('');
  if (product?.series) lines.push(`Series: ${product.series}`);
  if (product?.name)   lines.push(`Product: ${product.name}`);
  if (product?.price)  lines.push(`Listed price: \u20B9${Number(product.price).toLocaleString('en-IN')}`);
  lines.push('');
  lines.push('Please share availability and more details. Thank you.');
  return wa(lines.join('\n'));
}

// Build a WhatsApp link for booking a store-visit / demo appointment.
// Used from the store detail page so the opening message already names the
// store the customer wants to visit — no back-and-forth to ask "which one?".
export function buildAppointmentUrl(store, visitor) {
  const lines = [
    ...visitorLines(visitor),
    'Hello! I would like to book a store visit / product demo.',
    '',
  ];
  if (store?.name)    lines.push(`Store: ${store.name}`);
  if (store?.city)    lines.push(`City: ${store.city}${store?.state ? `, ${store.state}` : ''}`);
  if (store?.address) lines.push(`Address: ${store.address}${store?.pincode ? ` — ${store.pincode}` : ''}`);
  lines.push('');
  lines.push('Please suggest a convenient time slot. Thank you.');
  return wa(lines.join('\n'));
}

// Generic enquiry — used by the floating WhatsApp button when the customer
// isn't asking about a specific product or store.
export function buildGeneralEnquiryUrl(visitor) {
  const lines = [
    ...visitorLines(visitor),
    visitor?.name
      ? 'I have a general enquiry about HP World. Please get in touch.'
      : 'Hello! I have an enquiry about HP World. Please get in touch.',
  ];
  return wa(lines.join('\n'));
}
