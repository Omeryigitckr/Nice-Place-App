import { TextStyle } from 'react-native';

import { colors } from './colors';
import { fontFamily } from './fonts';

const regular = fontFamily.regular;
const medium = fontFamily.medium;
const semibold = fontFamily.semibold;
const bold = fontFamily.bold;

export const typography = {
  display: {
    fontFamily: bold,
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 42,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  } satisfies TextStyle,

  h1: {
    fontFamily: bold,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.4,
    color: colors.textPrimary,
  } satisfies TextStyle,

  h2: {
    fontFamily: semibold,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 30,
    letterSpacing: -0.3,
    color: colors.textPrimary,
  } satisfies TextStyle,

  h3: {
    fontFamily: semibold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  } satisfies TextStyle,

  title: {
    fontFamily: semibold,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  } satisfies TextStyle,

  body: {
    fontFamily: regular,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: colors.textPrimary,
  } satisfies TextStyle,

  bodySmall: {
    fontFamily: regular,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.textSecondary,
  } satisfies TextStyle,

  caption: {
    fontFamily: medium,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    color: colors.textMuted,
  } satisfies TextStyle,

  tabLabel: {
    fontFamily: semibold,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
    letterSpacing: 0.2,
    color: colors.textMuted,
  } satisfies TextStyle,

  /** Legacy presets — map to brand styles above */
  hero: {
    fontFamily: bold,
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 42,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  } satisfies TextStyle,

  subtitle: {
    fontFamily: semibold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    color: colors.textPrimary,
  } satisfies TextStyle,

  label: {
    fontFamily: semibold,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: colors.textSecondary,
  } satisfies TextStyle,

  chip: {
    fontFamily: semibold,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  } satisfies TextStyle,

  screenTitle: {
    fontFamily: semibold,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  } satisfies TextStyle,

  overline: {
    fontFamily: semibold,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  } satisfies TextStyle,

  button: {
    fontFamily: semibold,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: -0.1,
  } satisfies TextStyle,
} as const;

export type TypographyKey = keyof typeof typography;
