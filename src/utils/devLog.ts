/**
 * Release-safe logging. No-ops in production builds.
 */

export function devLog(...args: unknown[]): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

export function devWarn(...args: unknown[]): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
}

export function devError(...args: unknown[]): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
}
