/**
 * Plus Jakarta Sans font family tokens.
 *
 * TODO: Add font files to assets/fonts/ then wire in App.tsx with useFonts:
 *   - PlusJakartaSans-Regular.ttf    → PlusJakartaSans-Regular
 *   - PlusJakartaSans-Medium.ttf     → PlusJakartaSans-Medium
 *   - PlusJakartaSans-SemiBold.ttf   → PlusJakartaSans-SemiBold
 *   - PlusJakartaSans-Bold.ttf       → PlusJakartaSans-Bold
 *
 * Download from: https://fonts.google.com/specimen/Plus+Jakarta+Sans
 */
export const fontFamily = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semibold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
} as const;

export type FontFamilyKey = keyof typeof fontFamily;
