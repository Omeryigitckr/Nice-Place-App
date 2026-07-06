/** Border radius scale — pill/circle for fully rounded controls. */
export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  pill: 999,
  circle: 9999,
  /** @deprecated Use circle */
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radius;
