/** Source screenshot pixel size (all onboarding UI captures). */
export const ONBOARDING_SCREENSHOT_WIDTH = 576;
export const ONBOARDING_SCREENSHOT_HEIGHT = 1024;
export const ONBOARDING_SCREENSHOT_ASPECT =
  ONBOARDING_SCREENSHOT_HEIGHT / ONBOARDING_SCREENSHOT_WIDTH;

/** Thin bezel around the screenshot inside the phone frame. */
export const PHONE_FRAME_INSET = 3;

export interface PhoneMockupSize {
  /** Outer frame width (integer px). */
  frameWidth: number;
  /** Outer frame height (integer px). */
  frameHeight: number;
  /** Inner screenshot width (integer px). */
  screenWidth: number;
  /** Inner screenshot height (integer px). */
  screenHeight: number;
}

/**
 * Derive crisp mockup dimensions from a desired outer width.
 * Keeps the exact screenshot aspect ratio and rounds to whole pixels
 * so Android avoids subpixel resampling blur.
 */
export function getPhoneMockupSize(desiredOuterWidth: number): PhoneMockupSize {
  const frameWidth = Math.max(1, Math.round(desiredOuterWidth));
  const screenWidth = Math.max(1, frameWidth - PHONE_FRAME_INSET * 2);
  const screenHeight = Math.round(screenWidth * ONBOARDING_SCREENSHOT_ASPECT);
  const frameHeight = screenHeight + PHONE_FRAME_INSET * 2;

  return { frameWidth, frameHeight, screenWidth, screenHeight };
}

/** Primary single-phone mockups (~12% larger than the original 0.62 / 280 cap). */
export function getPrimaryMockupWidth(windowWidth: number): number {
  return Math.min(Math.round(windowWidth * 0.7), 320);
}

/** Split-layout phones on Save & Share. */
export function getSplitMockupWidth(windowWidth: number): number {
  return Math.min(Math.round(windowWidth * 0.42), 190);
}
