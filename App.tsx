import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';
import { OfflineBanner } from './src/components/OfflineBanner';
import { ToastHost } from './src/components/ToastHost';
import { linking } from './src/navigation/linking';
import { navigationRef } from './src/navigation/navigationRef';
import { RootNavigator } from './src/navigation';
import { useAuthDeepLinks } from './src/navigation/useAuthDeepLinks';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

ExpoSplashScreen.preventAutoHideAsync().catch(() => undefined);

function AppNavigation() {
  const { colorScheme, colors } = useTheme();
  useAuthDeepLinks();

  const navigationTheme: Theme = {
    ...(colorScheme === 'light' ? DefaultTheme : DarkTheme),
    dark: colorScheme === 'dark',
    colors: {
      ...(colorScheme === 'light' ? DefaultTheme.colors : DarkTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.accent,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} linking={linking} theme={navigationTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

/**
 * TODO: Plus Jakarta Sans — add font files to assets/fonts/ (see assets/fonts/README.md),
 * then load with expo-font before rendering the app.
 */
export default function App() {
  const [splashVisible, setSplashVisible] = useState(true);

  const handleSplashReady = useCallback(async () => {
    // Native splash hides only after the themed splash background is on screen.
    await ExpoSplashScreen.hideAsync().catch(() => undefined);
  }, []);

  const handleSplashFinish = useCallback(() => {
    setSplashVisible(false);
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {/* App boots under the splash so auth/bootstrap are not blocked. */}
        <AppNavigation />
        <OfflineBanner />
        <ToastHost />

        {splashVisible ? (
          <View style={styles.splashLayer} pointerEvents="box-none">
            <AnimatedSplashScreen onReady={handleSplashReady} onFinish={handleSplashFinish} />
          </View>
        ) : null}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
  },
});
