import * as Haptics from 'expo-haptics';

/** Light tap — likes, saves, marker select, tabs. */
export function hapticLight(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/** Selection change — chips, filters, theme. */
export function hapticSelection(): void {
  void Haptics.selectionAsync().catch(() => undefined);
}

/** Success — place submitted, profile saved. */
export function hapticSuccess(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

/** Error — failed actions. */
export function hapticError(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
}
