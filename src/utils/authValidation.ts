import { i18n } from '../i18n/instance';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getRegistrationPasswordHint(): string {
  return i18n.t('auth.validation.passwordHint');
}
export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return i18n.t('auth.validation.emailRequired');
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return i18n.t('auth.validation.emailInvalid');
  }
  return null;
}

export function validateRegistrationPassword(password: string): string | null {
  if (!password) {
    return i18n.t('auth.validation.passwordRequired');
  }

  const meetsLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!meetsLength || !hasUppercase || !hasLowercase || !hasNumber) {
    return i18n.t('auth.validation.passwordHint');
  }

  return null;
}

export function validateNewPassword(password: string): string | null {
  if (!password) {
    return i18n.t('auth.validation.passwordRequired');
  }
  if (password.length < 6) {
    return i18n.t('auth.validation.passwordMinLength');
  }
  return null;
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
): string | null {
  const passwordError = validateNewPassword(password);
  if (passwordError) {
    return passwordError;
  }
  if (password !== confirmPassword) {
    return i18n.t('auth.validation.passwordsDoNotMatch');
  }
  return null;
}
