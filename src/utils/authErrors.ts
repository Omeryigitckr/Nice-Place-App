import { i18n } from '../i18n/instance';

type AuthMessageKey =
  | 'auth.errors.generic'
  | 'auth.errors.signInFailed'
  | 'auth.errors.signUpFailed'
  | 'auth.errors.invalidCredentials'
  | 'auth.errors.emailAlreadyRegistered'
  | 'auth.errors.emailNotConfirmed'
  | 'auth.errors.weakPassword'
  | 'auth.errors.invalidEmail'
  | 'auth.errors.rateLimited'
  | 'auth.errors.sessionExpired'
  | 'auth.errors.network'
  | 'auth.errors.configMissing'
  | 'auth.errors.resetEmailFailed'
  | 'auth.errors.updatePasswordFailed'
  | 'auth.errors.currentPasswordIncorrect'
  | 'auth.errors.emailChangeFailed'
  | 'auth.errors.linkExpired'
  | 'auth.errors.linkInvalid'
  | 'auth.errors.linkDenied'
  | 'auth.errors.linkMissingData'
  | 'auth.errors.verifyFailed'
  | 'auth.errors.notAuthCallback'
  | 'auth.errors.oauthFailed'
  | 'auth.errors.oauthCancelled'
  | 'auth.errors.googleStartFailed'
  | 'auth.errors.googleCancelled'
  | 'auth.errors.googleFailed'
  | 'auth.errors.appleOnlyIos'
  | 'auth.errors.appleUnavailable'
  | 'auth.errors.appleNoToken'
  | 'auth.errors.appleFailed'
  | 'auth.errors.appleCancelled'
  | 'auth.errors.signInIncomplete';

interface AuthErrorLike {
  message: string;
  code?: string;
}

const CODE_TO_KEY: Record<string, AuthMessageKey> = {
  invalid_credentials: 'auth.errors.invalidCredentials',
  invalid_login_credentials: 'auth.errors.invalidCredentials',
  email_exists: 'auth.errors.emailAlreadyRegistered',
  user_already_exists: 'auth.errors.emailAlreadyRegistered',
  email_not_confirmed: 'auth.errors.emailNotConfirmed',
  weak_password: 'auth.errors.weakPassword',
  validation_failed: 'auth.errors.invalidEmail',
  over_request_rate_limit: 'auth.errors.rateLimited',
  over_email_send_rate_limit: 'auth.errors.rateLimited',
  session_expired: 'auth.errors.sessionExpired',
  otp_expired: 'auth.errors.linkExpired',
  access_denied: 'auth.errors.linkDenied',
};

function mapMessageToKey(message: string): AuthMessageKey | null {
  const lower = message.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('wrong password') ||
    lower.includes('invalid email or password')
  ) {
    return 'auth.errors.invalidCredentials';
  }
  if (
    lower.includes('already registered') ||
    lower.includes('already been registered') ||
    lower.includes('user already registered') ||
    lower.includes('email address is already')
  ) {
    return 'auth.errors.emailAlreadyRegistered';
  }
  if (lower.includes('email not confirmed') || lower.includes('not confirmed')) {
    return 'auth.errors.emailNotConfirmed';
  }
  if (lower.includes('password') && (lower.includes('weak') || lower.includes('at least'))) {
    return 'auth.errors.weakPassword';
  }
  if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
    return 'auth.errors.invalidEmail';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('over_request')) {
    return 'auth.errors.rateLimited';
  }
  if (lower.includes('network') || lower.includes('fetch failed') || lower.includes('failed to fetch')) {
    return 'auth.errors.network';
  }
  if (lower.includes('session') && lower.includes('expired')) {
    return 'auth.errors.sessionExpired';
  }
  if (lower.includes('otp_expired') || (lower.includes('expired') && lower.includes('link'))) {
    return 'auth.errors.linkExpired';
  }
  if (lower.includes('access_denied')) {
    return 'auth.errors.linkDenied';
  }
  if (lower.includes('google') && lower.includes('cancel')) {
    return 'auth.errors.googleCancelled';
  }
  if (lower.includes('apple') && lower.includes('cancel')) {
    return 'auth.errors.appleCancelled';
  }
  if (lower.includes('cancel')) {
    return 'auth.errors.oauthCancelled';
  }

  return null;
}

function isAuthErrorKey(value: string): value is AuthMessageKey {
  return value.startsWith('auth.errors.');
}

/**
 * Resolves a stable auth translation key from Supabase Auth errors / messages.
 * Prefer AuthError.code when present; fall back to message matching.
 * Keep developer logs on the original English/technical message separately.
 */
export function resolveAuthErrorKey(
  error?: string | AuthErrorLike | null,
  fallbackKey: AuthMessageKey = 'auth.errors.generic',
): AuthMessageKey {
  if (!error) {
    return fallbackKey;
  }

  if (typeof error === 'string') {
    if (isAuthErrorKey(error)) {
      return error;
    }
    return mapMessageToKey(error) ?? fallbackKey;
  }

  const code = error.code?.toLowerCase() ?? '';
  if (code && CODE_TO_KEY[code]) {
    return CODE_TO_KEY[code];
  }

  return mapMessageToKey(error.message) ?? fallbackKey;
}

export function getLocalizedAuthError(
  error?: string | AuthErrorLike | null,
  fallbackKey: AuthMessageKey = 'auth.errors.generic',
): string {
  return i18n.t(resolveAuthErrorKey(error, fallbackKey));
}

export function isAuthCancellationError(error?: string | null): boolean {
  if (!error) {
    return false;
  }
  if (
    error === 'auth.errors.oauthCancelled' ||
    error === 'auth.errors.googleCancelled' ||
    error === 'auth.errors.appleCancelled'
  ) {
    return true;
  }
  return error.toLowerCase().includes('cancel');
}

export function authErrorKey(key: AuthMessageKey): AuthMessageKey {
  return key;
}
