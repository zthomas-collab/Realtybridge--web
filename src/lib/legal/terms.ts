// Changing the agreement materially? Bump TERMS_VERSION here AND public.current_terms_version() in SQL:
// every user is asked to accept the new version on their next visit.
export const TERMS_VERSION = "2026-10-10";

export const TERMS_CHECKBOX_TEXT =
  "I agree to the Terms of Service and Professional Code of Conduct, including the Two-Warning Ban Policy, and I have read the Privacy Policy.";

/** Where members send privacy requests (access, correction, deletion). Set NEXT_PUBLIC_CONTACT_EMAIL in production. */
export const CONTACT_EMAIL = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) || null;
