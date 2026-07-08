import { User } from '@supabase/supabase-js';

/** True when the user signed up with email/password and can re-authenticate with a password. */
export function userHasEmailPassword(user: User): boolean {
  const identities = user.identities ?? [];
  return identities.some((identity) => identity.provider === 'email');
}
