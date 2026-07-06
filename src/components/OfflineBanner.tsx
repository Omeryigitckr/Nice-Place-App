import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

/**
 * Optional offline indicator. Only appears after a failed network request
 * when the app is serving cached data. Never requires a native module.
 */
export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-48)).current;
  const wasOffline = useRef(false);

  useEffect(() => {
    try {
      if (isOffline) {
        wasOffline.current = true;
        setVisible(true);
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 9,
          tension: 80,
        }).start();
        return;
      }

      if (!wasOffline.current) {
        return;
      }

      Animated.timing(translateY, {
        toValue: -48,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setVisible(false);
        }
      });
    } catch {
      setVisible(false);
    }
  }, [isOffline, translateY]);

  if (!visible || !isOffline) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + spacing.xs,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        style={[
          styles.banner,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
        <Text style={[styles.text, { color: colors.textPrimary }]}>
          You're offline — showing saved data
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
  },
});
