import { ViewStyle } from 'react-native';

import { colors } from './colors';
import { radius } from './radius';
import { shadows } from './shadows';
import { spacing } from './spacing';

export const glassSurface: ViewStyle = {
  backgroundColor: colors.glass,
  borderWidth: 1,
  borderColor: colors.glassBorder,
  borderRadius: radius.lg,
};

export const glassSurfaceElevated: ViewStyle = {
  ...glassSurface,
  ...shadows.md,
};

export const cardSurface: ViewStyle = {
  ...glassSurface,
  ...shadows.card,
};

export const insetSurface: ViewStyle = {
  backgroundColor: colors.inset,
  borderWidth: 1,
  borderColor: colors.glassBorder,
  borderRadius: radius.md,
};

export const insetSurfaceLight: ViewStyle = {
  backgroundColor: colors.insetLight,
  borderWidth: 1,
  borderColor: colors.glassBorder,
  borderRadius: radius.md,
};

export const badgeSurface: ViewStyle = {
  backgroundColor: colors.primaryLight,
  borderWidth: 1,
  borderColor: colors.primaryBorder,
  borderRadius: radius.full,
};

export const iconButtonSurface: ViewStyle = {
  backgroundColor: colors.scrim,
  borderWidth: 1,
  borderColor: colors.glassBorder,
  borderRadius: radius.full,
  alignItems: 'center',
  justifyContent: 'center',
};

export const sectionPadding: ViewStyle = {
  padding: spacing.md,
};

/** Frosted map overlay — no native blur; high-opacity glass reads over terrain. */
export const mapGlassSurface: ViewStyle = {
  backgroundColor: colors.glassStrong,
  borderWidth: 1,
  borderColor: colors.glassBorder,
  borderRadius: radius.xl,
  ...shadows.sm,
};

export const mapSearchSurface: ViewStyle = {
  backgroundColor: colors.glassStrong,
  borderWidth: 1,
  borderColor: colors.glassBorderSubtle,
  borderRadius: radius.full,
  ...shadows.sm,
};
