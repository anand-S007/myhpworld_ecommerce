import { createContext, useCallback, useContext, useState } from 'react';
import { useUserStore } from '../store/userStore.js';
import {
  buildEnquiryUrl, buildAppointmentUrl, buildGeneralEnquiryUrl,
} from '../config/contact.js';
import EnquiryModal from '../components/common/EnquiryModal.jsx';

// Single app-wide handle for "the customer wants to message us on WhatsApp".
//
//   ctx.kind === 'product'     → enquire about `ctx.product`
//   ctx.kind === 'appointment' → book a visit to `ctx.store`
//   ctx.kind === 'general'     → no specific subject (used by the FAB)
//
// Signed-in users skip the modal — we already know their name / email /
// phone and can go straight to WhatsApp. Guests see a small modal that
// collects name (required) + email + phone (both optional), and those get
// prepended to the WhatsApp message so the company team can respond
// without asking "who's this?".
const EnquiryContext = createContext(null);

export function EnquiryProvider({ children }) {
  const user = useUserStore((s) => s.user);
  const [ctx, setCtx] = useState(null);

  const buildUrl = useCallback((c, visitor) => {
    if (c?.kind === 'product')     return buildEnquiryUrl(c.product, visitor);
    if (c?.kind === 'appointment') return buildAppointmentUrl(c.store, visitor);
    return buildGeneralEnquiryUrl(visitor);
  }, []);

  const openEnquiry = useCallback((nextCtx = { kind: 'general' }) => {
    if (user) {
      // Known customer — send straight through with their profile info.
      const visitor = {
        name:  user.name  || '',
        email: user.email || '',
        phone: user.phone || '',
      };
      window.open(buildUrl(nextCtx, visitor), '_blank', 'noopener,noreferrer');
      return;
    }
    setCtx(nextCtx);
  }, [user, buildUrl]);

  const handleSubmit = useCallback((visitor) => {
    const url = buildUrl(ctx, visitor);
    window.open(url, '_blank', 'noopener,noreferrer');
    setCtx(null);
  }, [ctx, buildUrl]);

  return (
    <EnquiryContext.Provider value={{ openEnquiry }}>
      {children}
      {ctx && (
        <EnquiryModal
          ctx={ctx}
          onSubmit={handleSubmit}
          onClose={() => setCtx(null)}
        />
      )}
    </EnquiryContext.Provider>
  );
}

export function useEnquiry() {
  const value = useContext(EnquiryContext);
  if (!value) {
    throw new Error('useEnquiry must be called inside <EnquiryProvider>');
  }
  return value;
}
