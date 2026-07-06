# Cursor Implementation Guide

You are working on the React Native Expo app **Nice Place**.

This Brand Kit is final. Do not redesign the logo, recolor the logo, or invent a new brand style.

## Add Assets To Project

Copy this folder into the project:

```txt
assets/brand/
```

Expected final project paths:

```txt
assets/brand/app-icon/01_App_Icon.png
assets/brand/logos/02_Logo_Light.png
assets/brand/logos/03_Logo_Dark.png
assets/brand/logos/04_Logo_Green.png
assets/brand/logos/05_Logo_Black.png
assets/brand/logos/06_Logo_White.png
```

## Theme Rules

Use the existing `src/theme` tokens. If tokens are missing, add them semantically. Do not hardcode colors in screens.

Use:
```ts
colors.primary
colors.background
colors.glass
colors.textPrimary
radius.lg
spacing.xl
```

Do not use raw values like:
```ts
'#44A878'
borderRadius: 20
```
inside screens unless creating the theme tokens themselves.

## Bottom Navigation

Use the finalized floating glass pill style:
- Dark glass background
- Pill radius
- Subtle border
- Lucide icons
- Active icon green
- Inactive muted gray
- Center Add Place tab green circular background with white plus
- Profile tab shows avatar if available; otherwise Lucide UserRound

## Splash Screen

Create an animated splash using the finalized Brand Kit.

Important:
- Native Expo splash can stay static and short.
- The route-draw animation must be implemented as an in-app AnimatedSplash component.
- Use React Native Reanimated and react-native-svg if needed.
- Background: `#060A10`
- Keep motion premium and minimal.

Suggested timeline:
- 0.0s: dark background
- 0.2s: icon fade/scale in
- 0.8s: route draw begins
- 1.6s: Nice Place text fades in
- 2.0s: tagline fades in
- 2.4s: splash fades out to map

Do not break existing navigation, Supabase, Mapbox, Expo, or screen routes.
