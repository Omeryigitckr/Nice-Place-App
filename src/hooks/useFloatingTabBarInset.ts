import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  FLOATING_TAB_BAR_BOTTOM_OFFSET,
  FLOATING_TAB_BAR_EXTRA_SPACING,
  FLOATING_TAB_BAR_HEIGHT,
  getFloatingTabBarTotalSpace,
} from '../theme/navigation';

export function useFloatingTabBarInset(
  extraSpacing: number = FLOATING_TAB_BAR_EXTRA_SPACING,
) {
  const insets = useSafeAreaInsets();
  const totalSpace = getFloatingTabBarTotalSpace(insets.bottom, extraSpacing);

  return {
    height: FLOATING_TAB_BAR_HEIGHT,
    bottomOffset: FLOATING_TAB_BAR_BOTTOM_OFFSET,
    safeAreaBottom: insets.bottom,
    extraSpacing,
    totalSpace,
    contentPaddingBottom: totalSpace,
  };
}
