import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { mapMotion, radius, spacing, touchTarget, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface ExploreSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onFilterPress: () => void;
  activeFilterCount: number;
  onFocusChange?: (focused: boolean) => void;
  onSubmit?: (text: string) => void;
}

const calmEasing = Easing.out(Easing.cubic);

export function ExploreSearchBar({
  value,
  onChangeText,
  onFilterPress,
  activeFilterCount,
  onFocusChange,
  onSubmit,
}: ExploreSearchBarProps) {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const hasFilters = activeFilterCount > 0;
  const [focused, setFocused] = useState(false);
  const focusProgress = useRef(new Animated.Value(0)).current;
  const clearOpacity = useRef(new Animated.Value(value.length > 0 ? 1 : 0)).current;
  const filterScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(focusProgress, {
      toValue: focused ? 1 : 0,
      duration: mapMotion.chipMs,
      easing: calmEasing,
      useNativeDriver: false,
    }).start();
  }, [focusProgress, focused]);

  useEffect(() => {
    Animated.timing(clearOpacity, {
      toValue: value.length > 0 ? 1 : 0,
      duration: mapMotion.pressMs,
      easing: calmEasing,
      useNativeDriver: true,
    }).start();
  }, [clearOpacity, value.length]);

  const borderColor = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primaryBorderStrong],
  });

  const backgroundColor = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, colors.surfaceElevated],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          ...shadows.sm,
        },
      ]}
    >
      <Ionicons
        name="search"
        size={17}
        color={focused ? colors.primary : colors.textMuted}
        style={styles.searchIcon}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={t('explore.searchPlaceholder')}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.textPrimary }]}
        returnKeyType="search"
        clearButtonMode="never"
        onFocus={() => {
          setFocused(true);
          onFocusChange?.(true);
        }}
        onBlur={() => {
          setFocused(false);
          onFocusChange?.(false);
        }}
        onSubmitEditing={() => onSubmit?.(value)}
      />
      <Animated.View style={{ opacity: clearOpacity }}>
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={touchTarget.hitSlop}
          accessibilityRole="button"
          accessibilityLabel={t('explore.clearSearch')}
          style={styles.clearButton}
          disabled={value.length === 0}
        >
          <Ionicons name="close-circle" size={17} color={colors.textMuted} />
        </Pressable>
      </Animated.View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Animated.View style={{ transform: [{ scale: filterScale }] }}>
        <Pressable
          onPress={onFilterPress}
          onPressIn={() => {
            Animated.timing(filterScale, {
              toValue: mapMotion.pressScale,
              duration: mapMotion.pressMs,
              easing: calmEasing,
              useNativeDriver: true,
            }).start();
          }}
          onPressOut={() => {
            Animated.timing(filterScale, {
              toValue: 1,
              duration: mapMotion.pressMs,
              easing: calmEasing,
              useNativeDriver: true,
            }).start();
          }}
          style={[
            styles.filterButton,
            hasFilters && { backgroundColor: colors.chipActiveBackground },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('explore.filterPlaces')}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={hasFilters ? colors.primary : colors.textSecondary}
          />
          {hasFilters ? (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.filterBadgeText, { color: colors.white }]}>
                {activeFilterCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    fontSize: 15,
    padding: 0,
    letterSpacing: -0.1,
  },
  clearButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  divider: {
    width: 1,
    height: 22,
    marginRight: spacing.xs,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
  },
});
