import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { duration, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

const calmEasing = Easing.out(Easing.cubic);

export interface ProfileTabOption<T extends string> {
  key: T;
  label: string;
}

interface ProfileTabsProps<T extends string> {
  tabs: ProfileTabOption<T>[];
  activeKey: T;
  onChange: (key: T) => void;
}

/** Profile section tabs with a sliding active indicator. */
export function ProfileTabs<T extends string>({ tabs, activeKey, onChange }: ProfileTabsProps<T>) {
  const { colors } = useTheme();
  const [rowWidth, setRowWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === activeKey),
  );
  const tabWidth = tabs.length > 0 && rowWidth > 0 ? rowWidth / tabs.length : 0;

  useEffect(() => {
    if (tabWidth <= 0) {
      return;
    }

    Animated.timing(indicatorX, {
      toValue: activeIndex * tabWidth,
      duration: duration.normal,
      easing: calmEasing,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, indicatorX, tabWidth]);

  const onRowLayout = (event: LayoutChangeEvent) => {
    setRowWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={[styles.wrap, { borderBottomColor: colors.border }]} onLayout={onRowLayout}>
      <View style={styles.row}>
        {tabs.map((tab) => {
          const active = tab.key === activeKey;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={styles.tabButton}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.textMuted }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {tabWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              width: tabWidth,
              backgroundColor: colors.primary,
              transform: [{ translateX: indicatorX }],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  tabLabel: {
    ...typography.label,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    borderRadius: 99,
  },
});
