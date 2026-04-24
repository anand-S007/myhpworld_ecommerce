import { useEffect } from 'react';
import { useSettings } from '../../hooks/queries.js';
import { setWhatsAppNumber } from '../../config/contact.js';

// ContactSync — keeps the WhatsApp number inside `config/contact.js` in
// sync with whatever the admin saved in Settings. Mounted once at the app
// root (alongside ScrollToTop / FaviconManager) so every `buildEnquiryUrl`
// / `buildAppointmentUrl` call picks up the live number without the
// consumer having to read the settings hook itself.
export default function ContactSync() {
  const { data } = useSettings();
  const whatsapp = data?.whatsappNumber;

  useEffect(() => {
    if (whatsapp) setWhatsAppNumber(whatsapp);
  }, [whatsapp]);

  return null;
}
