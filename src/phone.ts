import type { StorefrontContact, StorefrontPhone } from "./types.js";

/** "+506 8888 7777" — the phone as a visitor reads it. */
export function formatPhone(phone: StorefrontPhone): string {
  const local = phone.number.replace(/(\d{4})(?=\d)/g, "$1 ");
  return phone.dialCode ? `+${phone.dialCode} ${local}` : local;
}

/** "tel:+50688887777" */
export function telHref(phone: StorefrontPhone): string {
  return `tel:${phone.dialCode ? `+${phone.dialCode}` : ""}${phone.number}`;
}

/**
 * The number WhatsApp orders go to: the store's WhatsApp, else its phone.
 * Null when the store configured neither — callers must not fall back to a
 * placeholder number.
 */
export function whatsappPhone(contact: StorefrontContact | null | undefined): StorefrontPhone | null {
  return contact?.whatsapp ?? contact?.phone ?? null;
}

/** https://wa.me/50688887777?text=… ; wa.me needs the international number. */
export function whatsappUrl(phone: StorefrontPhone, message?: string): string {
  const base = `https://wa.me/${phone.dialCode ?? ""}${phone.number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
