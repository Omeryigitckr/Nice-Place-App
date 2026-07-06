import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  dismissAppToast,
  subscribeAppToast,
  type ToastPayload,
} from '../feedback';
import { spacing } from '../theme';

import { ToastBanner } from './ToastBanner';

/** Global toast host — mount once near the app root. */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => subscribeAppToast(setToast), []);

  if (!toast) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { top: insets.top + spacing.sm }]}
    >
      <ToastBanner
        key={toast.id}
        message={toast.message}
        visible
        icon={toast.icon}
        tone={toast.tone}
        durationMs={toast.durationMs}
        onDismiss={dismissAppToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 200,
    alignItems: 'center',
  },
});
