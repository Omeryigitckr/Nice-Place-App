import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { brand } from '../theme/brand';
import { radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/ThemeContext';

/** Official Brand Kit app icon — do not replace or redraw. */
const BRAND_APP_ICON = require('../../docs/BrandKit/logos/01_App_Icon.png');
/** Theme-aware horizontal wordmarks (used when a wider brand lockup is preferred). */
const LOGO_LIGHT = require('../../docs/BrandKit/logos/02_Logo_Light.png');
const LOGO_DARK = require('../../docs/BrandKit/logos/03_Logo_Dark.png');

const ICON_SIZE = 96;
const HORIZONTAL_LOGO_WIDTH = 200;
const HORIZONTAL_LOGO_HEIGHT = 56;

type AuthBrandVariant = 'icon' | 'horizontal';

interface AuthBrandHeaderProps {
  /** `icon` = app icon + name (default). `horizontal` = theme logo lockup. */
  variant?: AuthBrandVariant;
}

/**
 * Centered Nice Place brand mark for authentication screens.
 * Default: premium app icon (96px) with brand name and tagline.
 * Horizontal variant swaps in light/dark Brand Kit logos automatically.
 */
export function AuthBrandHeader({ variant = 'icon' }: AuthBrandHeaderProps) {
  const { colors, colorScheme } = useTheme();
  const { t } = useTranslation();

  if (variant === 'horizontal') {
    const logoSource = colorScheme === 'light' ? LOGO_LIGHT : LOGO_DARK;

    return (
      <View style={styles.wrap} accessibilityRole="header">
        <Image
          source={logoSource}
          style={styles.horizontalLogo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessibilityLabel={brand.name}
        />
        <Text style={[styles.tagline, { color: colors.textMuted }]}>{t('auth.brand.tagline')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap} accessibilityRole="header">
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Image
          source={BRAND_APP_ICON}
          style={styles.icon}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          accessibilityLabel="Nice Place"
        />
      </View>

      <Text style={[styles.brandName, { color: colors.textPrimary }]}>{brand.name}</Text>
      <Text style={[styles.tagline, { color: colors.textMuted }]}>{t('auth.brand.tagline')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  horizontalLogo: {
    width: HORIZONTAL_LOGO_WIDTH,
    height: HORIZONTAL_LOGO_HEIGHT,
  },
  brandName: {
    ...typography.title,
    fontSize: 24,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  tagline: {
    ...typography.caption,
    fontSize: 12,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
});
