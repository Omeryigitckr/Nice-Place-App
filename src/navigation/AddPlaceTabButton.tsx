import { Plus } from 'lucide-react-native';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { AuthRequiredModal } from '../components/AuthRequiredModal';
import { useAuth } from '../hooks';
import { iconSizes, radius, spacing } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { navigateToAuth, requireAuth } from '../utils/authGuard';

const BUTTON_SIZE = 48;
const PRESS_SCALE = 0.94;

export function AddPlaceTabButton({
  onPress,
  accessibilityState,
  accessibilityLabel,
}: BottomTabBarButtonProps) {
  const navigation = useNavigation();
  const { colors, shadows } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const focused = accessibilityState?.selected ?? false;
  const scale = useRef(new Animated.Value(1)).current;

  const animatePress = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      damping: 18,
      stiffness: 340,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = (event: Parameters<NonNullable<BottomTabBarButtonProps['onPress']>>[0]) => {
    if (authLoading) {
      return;
    }

    if (!requireAuth(user, 'add_place')) {
      setAuthPromptVisible(true);
      return;
    }

    onPress?.(event);
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.shadowWrap,
          {
            transform: [{ scale }],
            ...(focused ? shadows.md : shadows.sm),
          },
        ]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={() => animatePress(PRESS_SCALE)}
          onPressOut={() => animatePress(1)}
          accessibilityRole="button"
          accessibilityState={accessibilityState}
          accessibilityLabel={accessibilityLabel ?? 'Add place'}
          style={[
            styles.button,
            {
              backgroundColor: focused ? colors.primaryDark : colors.tabAddBackground,
              borderColor: colors.tabBarBackground,
            },
          ]}
        >
          <Plus size={iconSizes.sm} color={colors.tabAddIcon} strokeWidth={2.5} />
        </Pressable>
      </Animated.View>

      <AuthRequiredModal
        visible={authPromptVisible}
        message="Sign in to share a new place with the community."
        onSignIn={() => {
          setAuthPromptVisible(false);
          navigateToAuth(navigation);
        }}
        onCancel={() => setAuthPromptVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -spacing.sm,
  },
  shadowWrap: {
    borderRadius: radius.circle,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
});
