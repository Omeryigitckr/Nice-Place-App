import { duration, scale, spring } from './animations';
import { blur } from './blur';
import { colors } from './colors';
import { fontFamily } from './fonts';
import { iconSizes } from './icons';
import { radius } from './radius';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';

/**
 * Nice Place design system — single source of truth for UI primitives.
 */
export const designSystem = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  iconSizes,
  fontFamily,
  blur,
  duration,
  scale,
  spring,
} as const;

export type DesignSystem = typeof designSystem;
