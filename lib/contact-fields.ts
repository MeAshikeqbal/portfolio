/**
 * Contact form field names shared by the client form and the server action.
 * Kept separate from lib/contact-schema.ts so the form doesn't pull zod into the browser.
 */

/**
 * Name of the hidden honeypot field. Deliberately meaningless: names like "company" or
 * "website" match browser/password-manager autofill, which would silently drop real messages.
 */
export const HONEYPOT_FIELD = "hp_field_7c1"
