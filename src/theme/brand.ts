/**
 * Brand identity tokens — swap values here during the branding sprint.
 * Screens should consume semantic theme tokens, not hard-coded brand strings.
 */
export const brand = {
  name: 'Nice Place',
  tagline: 'Discover hidden places outdoors',
  /** Short auth / splash line under the logo */
  authTagline: 'Discover • Share • Remember',
  slug: 'nice-place',

  /** Brand Kit logo paths (require() at call sites — Metro needs static requires). */
  assets: {
    appIcon: '../../docs/BrandKit/logos/01_App_Icon.png',
    logoLight: '../../docs/BrandKit/logos/02_Logo_Light.png',
    logoDark: '../../docs/BrandKit/logos/03_Logo_Dark.png',
  },

  /** Semantic color aliases for brand-critical UI (tab bar, CTAs) */
  colors: {
    primary: '#44A878',
    accent: '#E8A04A',
    background: '#060A10',
  },
} as const;

export type Brand = typeof brand;
