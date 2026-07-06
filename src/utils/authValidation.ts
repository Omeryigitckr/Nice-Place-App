const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Please enter your email.';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address.';
  }
  return null;
}

export const REGISTRATION_PASSWORD_HINT =
  'Use at least 8 characters with one uppercase letter, one lowercase letter, and one number.';

export function validateRegistrationPassword(password: string): string | null {
  if (!password) {
    return 'Please enter a password.';
  }

  const meetsLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!meetsLength || !hasUppercase || !hasLowercase || !hasNumber) {
    return REGISTRATION_PASSWORD_HINT;
  }

  return null;
}

export function validateNewPassword(password: string): string | null {
  if (!password) {
    return 'Please enter a password.';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
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
    return 'Passwords do not match.';
  }
  return null;
}
