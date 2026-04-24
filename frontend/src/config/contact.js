// Company WhatsApp number in international format, digits only (no +, spaces, or dashes).
// Replace with the real number before going live.
export const WHATSAPP_NUMBER = '919999999999';

export function buildEnquiryUrl(product) {
  const lines = ['Hello, I would like to enquire about the following product:'];
  if (product?.name) lines.push('');
  if (product?.series) lines.push(`Series: ${product.series}`);
  if (product?.name)   lines.push(`Product: ${product.name}`);
  if (product?.price)  lines.push(`Listed price: \u20B9${Number(product.price).toLocaleString('en-IN')}`);
  lines.push('');
  lines.push('Please share availability and more details. Thank you.');

  const text = lines.join('\n');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

// Build a WhatsApp link for booking a store-visit / demo appointment.
// Used from the store detail page so the opening message already names the
// store the customer wants to visit — no back-and-forth to ask "which one?".
export function buildAppointmentUrl(store) {
  const lines = ['Hello! I would like to book a store visit / product demo.'];
  lines.push('');
  if (store?.name)    lines.push(`Store: ${store.name}`);
  if (store?.city)    lines.push(`City: ${store.city}${store?.state ? `, ${store.state}` : ''}`);
  if (store?.address) lines.push(`Address: ${store.address}${store?.pincode ? ` — ${store.pincode}` : ''}`);
  lines.push('');
  lines.push('Please suggest a convenient time slot. Thank you.');
  const text = lines.join('\n');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
