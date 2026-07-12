/** 4px-based spacing scale for Nice Place. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
} as const;

export type SpacingKey = keyof typeof spacing;

/** Minimum interactive target size and default hitSlop for icon/text controls. */
export const touchTarget = {
  min: 44,
  hitSlop: 10,
} as const;
