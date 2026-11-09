import "server-only"

/**
 * Viewer token for draft previews (draft mode + the Studio's Presentation tool).
 * Create it at sanity.io/manage → API → Tokens with "Viewer" rights and set
 * SANITY_API_READ_TOKEN. Without it, previews are disabled and the site serves
 * published content only.
 */
export const readToken = process.env.SANITY_API_READ_TOKEN ?? ""
