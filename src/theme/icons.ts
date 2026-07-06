/** Lucide icon size scale — use with lucide-react-native. */
export const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
} as const;

export type IconSizeKey = keyof typeof iconSizes;
