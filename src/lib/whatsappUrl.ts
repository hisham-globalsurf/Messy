/** wa.me link helpers — plain string building, safe to import from server and client code. */

function normalizeWhatsAppPhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
}

export function whatsAppChatUrl(phone: string | undefined): string {
  return phone ? `https://wa.me/${normalizeWhatsAppPhone(phone)}` : "https://wa.me/";
}

/** A wa.me link with prefilled text — opens that chat directly with the message ready to send. */
export function whatsAppTextUrl(phone: string, text: string): string {
  return `${whatsAppChatUrl(phone)}?text=${encodeURIComponent(text)}`;
}
