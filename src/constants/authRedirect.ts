/**
 * Mobile deep link used for all Supabase Auth email redirects (password reset, email change).
 *
 * Supabase Dashboard → Authentication → URL Configuration:
 * Add `niceplace://auth/callback` to Redirect URLs.
 *
 * Do not use localhost, Expo Go links, or web-only URLs for this mobile flow.
 * A production website redirect can be added separately later if needed.
 */
export const AUTH_CALLBACK_REDIRECT = 'niceplace://auth/callback';

/** @deprecated Use AUTH_CALLBACK_REDIRECT */
export const PASSWORD_RESET_REDIRECT = AUTH_CALLBACK_REDIRECT;
