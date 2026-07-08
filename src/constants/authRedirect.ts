/**
 * Mobile deep link used for all Supabase Auth redirects (password reset, email change, OAuth).
 *
 * Supabase Dashboard → Authentication → URL Configuration:
 * Add `niceplace://auth/callback` to Redirect URLs.
 *
 * Supabase Dashboard → Authentication → Providers:
 * Enable Google and Apple; use the same redirect URL for OAuth callbacks.
 *
 * Do not use localhost, Expo Go links, or web-only URLs for this mobile flow.
 */
export const AUTH_CALLBACK_REDIRECT = 'niceplace://auth/callback';

/** @deprecated Use AUTH_CALLBACK_REDIRECT */
export const PASSWORD_RESET_REDIRECT = AUTH_CALLBACK_REDIRECT;
