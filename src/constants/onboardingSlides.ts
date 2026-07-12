export const ONBOARDING_SLIDE_COUNT = 5;

export type OnboardingSlideId = 'welcome' | 'explore' | 'details' | 'save-share' | 'ready';

export interface OnboardingSlideConfig {
  id: OnboardingSlideId;
  headlineKey:
    | 'onboarding.slides.welcome.headline'
    | 'onboarding.slides.explore.headline'
    | 'onboarding.slides.details.headline'
    | 'onboarding.slides.saveShare.headline'
    | 'onboarding.slides.ready.headline';
  subtitleKey:
    | 'onboarding.slides.welcome.subtitle'
    | 'onboarding.slides.explore.subtitle'
    | 'onboarding.slides.details.subtitle'
    | 'onboarding.slides.saveShare.subtitle'
    | 'onboarding.slides.ready.subtitle';
}

export const onboardingSlides: readonly OnboardingSlideConfig[] = [
  {
    id: 'welcome',
    headlineKey: 'onboarding.slides.welcome.headline',
    subtitleKey: 'onboarding.slides.welcome.subtitle',
  },
  {
    id: 'explore',
    headlineKey: 'onboarding.slides.explore.headline',
    subtitleKey: 'onboarding.slides.explore.subtitle',
  },
  {
    id: 'details',
    headlineKey: 'onboarding.slides.details.headline',
    subtitleKey: 'onboarding.slides.details.subtitle',
  },
  {
    id: 'save-share',
    headlineKey: 'onboarding.slides.saveShare.headline',
    subtitleKey: 'onboarding.slides.saveShare.subtitle',
  },
  {
    id: 'ready',
    headlineKey: 'onboarding.slides.ready.headline',
    subtitleKey: 'onboarding.slides.ready.subtitle',
  },
] as const;
