import { shadows } from './shadows';

/** @deprecated Prefer shadows.* directly */
export const elevation = {
  none: shadows.none,
  low: shadows.sm,
  medium: shadows.md,
  high: shadows.lg,
  card: shadows.card,
  floating: shadows.fab,
  tabBar: shadows.glass,
  glass: shadows.glass,
} as const;

export type ElevationKey = keyof typeof elevation;
