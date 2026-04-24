import { useEnquiry } from '../../context/EnquiryContext.jsx';

// Brand-accurate WhatsApp glyph as inline SVG (Lucide doesn't ship one).
// Rendered white on the green FAB; currentColor lets the button control it.
function WhatsAppGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.52 3.48A11.82 11.82 0 0 0 12.05 0C5.47 0 .14 5.33.14 11.91c0 2.1.55 4.14 1.59 5.94L0 24l6.33-1.66a11.87 11.87 0 0 0 5.72 1.46h.01c6.58 0 11.91-5.33 11.91-11.91 0-3.18-1.24-6.17-3.45-8.41ZM12.05 21.77h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.75.98 1-3.66-.24-.38a9.85 9.85 0 0 1-1.51-5.21c0-5.47 4.45-9.92 9.91-9.92 2.65 0 5.14 1.03 7.02 2.91a9.85 9.85 0 0 1 2.91 7.02c0 5.47-4.45 9.92-9.94 9.92Zm5.44-7.43c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.96 1.17-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.89-.79-1.5-1.77-1.67-2.07-.18-.3-.02-.46.13-.61.14-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.07-.15-.68-1.63-.93-2.23-.25-.59-.5-.51-.68-.52l-.58-.01c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.13 3.26 5.16 4.57 1.82.78 2.2.63 2.6.59.4-.04 1.77-.72 2.02-1.42.25-.7.25-1.29.18-1.42-.08-.13-.28-.2-.58-.35Z" />
    </svg>
  );
}

// Floating quick-enquiry button. Pinned bottom-right on every customer
// route. Hidden on admin routes — the outer router already skips rendering
// it under `/admin/*` because we only mount it inside <ClientLayout>.
//
// The button itself is lifted + scaled slightly on hover/press. The
// `.fab-ring` pulse and `.fab-bounce` keyframes are defined globally in
// `index.css` — both respect `prefers-reduced-motion`.
export default function WhatsAppFab() {
  const { openEnquiry } = useEnquiry();

  return (
    <button
      type="button"
      onClick={() => openEnquiry({ kind: 'general' })}
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#1EBE5A] active:scale-95 hover:scale-110 transition-all duration-200 grid place-items-center fab-bounce"
    >
      {/* Expanding ring sits behind the icon — creates the "pulse" effect. */}
      <span className="absolute inset-0 rounded-full bg-[#25D366] fab-ring pointer-events-none" aria-hidden="true" />
      <WhatsAppGlyph className="w-7 h-7 relative" />
    </button>
  );
}
