import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { LegalInfoContent } from '../../components/LegalInfoModal';
import { ProfileEntranceBlock } from '../../components/ProfileEntranceBlock';
import { radius, spacing, typography } from '../../theme';
import { motion, motionEasing } from '../../theme/motion';
import { useThemeColors } from '../../theme/ThemeContext';
import appConfig from '../../../app.json';

export const APP_VERSION = appConfig.expo.version;

export const SUPPORT_EMAIL = 'support@niceplace.site';

export const SUPPORT_CONTACT_LINE =
  'For support, bug reports, privacy questions, or account deletion requests, contact support@niceplace.site';

export const LEGAL_CONTENT: Record<string, LegalInfoContent> = {
  about: {
    title: 'About Nice Place',
    body:
      'Nice Place helps you discover quiet outdoor spots, sunset points, and hidden places worth visiting.\n\n' +
      'This beta focuses on map-based discovery, saving places, sharing spots, and community submissions reviewed before they appear publicly.',
  },
  terms: {
    title: 'Terms of Service',
    body:
      'By using Nice Place you agree to share accurate place information, respect private property, and follow local access rules.\n\n' +
      'Community submissions may be reviewed before publication. We may update these terms as the beta evolves.\n\n' +
      SUPPORT_CONTACT_LINE,
  },
  privacy: {
    title: 'Privacy Policy',
    body:
      'Last updated: July 2026\n\n' +
      'Nice Place is a mobile app that helps you discover and share outdoor places. This policy explains what data we collect during the beta and how we use it.\n\n' +
      'Account and authentication\n' +
      'When you create an account, we store your email address and authentication details through Supabase Auth. We also store profile information you choose to provide, such as your display name.\n\n' +
      'Places you submit\n' +
      'When you add a place, we store the information you submit, including place name, description, category, approximate location coordinates, and any photos you upload.\n\n' +
      'Saved and liked places\n' +
      'When you are signed in, we store places you save and places you like so they sync with your account.\n\n' +
      'Location\n' +
      'If you grant permission, we use your device location to show nearby places on the map and sort results by distance. We do not track your location in the background.\n\n' +
      'Images\n' +
      'If you upload a cover photo for a place, that image is stored so it can be shown in the app.\n\n' +
      'Device storage\n' +
      'Some preferences, such as theme settings and recent searches, may be stored locally on your device.\n\n' +
      'How we use your data\n' +
      'We use this data to operate the app, display places on the map, sync your saved and liked places, and review community submissions.\n\n' +
      'Service provider\n' +
      'We use Supabase (supabase.com) for authentication, database storage, and file storage for uploaded images. Supabase processes data on our behalf.\n\n' +
      'Data sharing\n' +
      'We do not sell your personal data.\n\n' +
      'Data deletion\n' +
      'You can delete your account from Settings. This removes your account access and anonymizes your profile data.\n\n' +
      SUPPORT_CONTACT_LINE +
      '\n\n' +
      'Children\n' +
      'Nice Place is not directed at children under 13.\n\n' +
      'Contact\n' +
      SUPPORT_EMAIL,
  },
  guidelines: {
    title: 'Report Guidelines',
    body:
      'Report inaccurate, unsafe, or inappropriate places so the community stays trustworthy.\n\n' +
      'In-app reporting is coming soon. For now, email support@niceplace.site if a place should be reviewed or removed.',
  },
};

export function SettingsSection({
  title,
  children,
  entranceIndex,
}: {
  title: string;
  children: ReactNode;
  entranceIndex?: number;
}) {
  const colors = useThemeColors();

  const card = (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: colors.glass,
            borderColor: colors.glassBorder,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );

  if (entranceIndex == null) {
    return card;
  }

  return <ProfileEntranceBlock index={entranceIndex}>{card}</ProfileEntranceBlock>;
}

export function SettingsLinkRow({
  label,
  onPress,
  subtitle,
}: {
  label: string;
  onPress: () => void;
  subtitle?: string;
}) {
  const colors = useThemeColors();
  const scale = useRef(new Animated.Value(1)).current;

  const animatePress = (toValue: number) => {
    Animated.timing(scale, {
      toValue,
      duration: motion.duration.fast,
      easing: motionEasing.out,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={styles.linkRow}
        onPress={onPress}
        onPressIn={() => animatePress(motion.scale.cardPress)}
        onPressOut={() => animatePress(1)}
        accessibilityRole="button"
      >
        <View style={styles.linkTextWrap}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
          {subtitle ? (
            <Text style={[styles.linkSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

export function PreferenceToggle({
  label,
  value,
  disabled,
  onValueChange,
}: {
  label: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const colors = useThemeColors();
  const rowOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    rowOpacity.setValue(0.88);
    Animated.timing(rowOpacity, {
      toValue: 1,
      duration: motion.duration.fast,
      easing: motionEasing.out,
      useNativeDriver: true,
    }).start();
  }, [rowOpacity, value]);

  return (
    <Animated.View style={[styles.toggleRow, { opacity: rowOpacity }]}>
      <Text style={[styles.rowLabel, { color: colors.textPrimary, flex: 1 }]}>{label}</Text>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primaryLight }}
        thumbColor={value ? colors.primary : colors.textMuted}
        ios_backgroundColor={colors.border}
      />
    </Animated.View>
  );
}

export function SettingsSegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const colors = useThemeColors();
  const [rowWidth, setRowWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const segmentWidth = options.length > 0 && rowWidth > 0 ? rowWidth / options.length : 0;

  useEffect(() => {
    if (segmentWidth <= 0) {
      return;
    }

    Animated.timing(indicatorX, {
      toValue: activeIndex * segmentWidth,
      duration: motion.duration.normal,
      easing: motionEasing.out,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, indicatorX, segmentWidth]);

  const onLayout = (event: LayoutChangeEvent) => {
    setRowWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      style={[
        styles.segmentedTrack,
        {
          backgroundColor: colors.input,
          borderColor: colors.border,
        },
      ]}
      onLayout={onLayout}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.segmentedIndicator,
            {
              width: Math.max(segmentWidth - 4, 0),
              backgroundColor: colors.surface,
              borderColor: colors.primaryBorderStrong,
              transform: [{ translateX: indicatorX }],
            },
          ]}
        />
      ) : null}
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={styles.segmentedOption}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.segmentedLabel,
                { color: active ? colors.primary : colors.textSecondary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const settingsStyles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.screenTitle,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  bioInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  groupLabel: {
    ...typography.label,
  },
  helperText: {
    ...typography.caption,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statusLabel: {
    ...typography.bodySmall,
  },
  statusValue: {
    ...typography.label,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  linkTextWrap: {
    flex: 1,
    gap: 2,
  },
  linkSubtitle: {
    ...typography.caption,
  },
  versionLabel: {
    ...typography.bodySmall,
  },
  versionValue: {
    ...typography.label,
  },
  rowLabel: {
    ...typography.body,
    fontSize: 15,
  },
  error: {
    ...typography.bodySmall,
  },
  segmentedTrack: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  segmentedIndicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  segmentedOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    zIndex: 1,
  },
  segmentedLabel: {
    ...typography.chip,
    fontWeight: '600',
  },
});

const styles = settingsStyles;
