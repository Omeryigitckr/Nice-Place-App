import { Easing } from 'react-native';

/**
 * Nice Place shared motion system.
 * Use these tokens for consistent, premium micro-interactions app-wide.
 */
export const motion = {
  duration: {
    /** Quick press / micro feedback */
    fast: 120,
    /** Default UI transitions */
    normal: 180,
    /** Screen / overlay entrances */
    slow: 260,
  },
  scale: {
    /** Standard buttons and controls */
    press: 0.97,
    /** Cards and list rows */
    cardPress: 0.98,
    /** Map FABs and map controls */
    mapPress: 0.96,
    /** Active emphasis (tabs, icons) */
    active: 1.08,
  },
  translate: {
    /** Full-screen / section entrance */
    screenY: 12,
    /** List / grid item entrance */
    listItemY: 8,
    /** Profile / form section entrance */
    sectionY: 10,
  },
  stagger: {
    baseDelay: 40,
    step: 40,
    listStep: 36,
    /** Only animate the first N list items */
    maxListItems: 6,
  },
  spring: {
    press: {
      damping: 20,
      stiffness: 360,
      mass: 0.65,
    },
    default: {
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    },
    gentle: {
      damping: 22,
      stiffness: 160,
      mass: 1,
    },
  },
} as const;

/** Easing presets (RN Animated). */
export const motionEasing = {
  out: Easing.out(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
  linear: Easing.linear,
} as const;

/** @deprecated Prefer `motion.duration` */
export const duration = {
  fast: motion.duration.fast,
  normal: motion.duration.normal,
  slow: motion.duration.slow,
} as const;

/** @deprecated Prefer `motion.scale` */
export const scale = {
  pressed: motion.scale.press,
  active: motion.scale.active,
} as const;

/** @deprecated Prefer `motion.spring` */
export const spring = {
  default: motion.spring.default,
  gentle: motion.spring.gentle,
} as const;

/** Map floating UI tokens (backed by the shared motion system). */
export const mapMotion = {
  pressScale: motion.scale.mapPress,
  pressMs: motion.duration.fast,
  fadeMs: motion.duration.slow,
  chipMs: motion.duration.normal,
  overlayMs: motion.duration.slow,
  spring: motion.spring.press,
} as const;

export type Motion = typeof motion;
