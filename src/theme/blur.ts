/** Blur intensity presets for expo-blur / glass surfaces (future use). */
export const blur = {
  tabBarBlurIntensity: 40,
  cardBlurIntensity: 24,
  modalBlurIntensity: 56,
} as const;

export type BlurKey = keyof typeof blur;
