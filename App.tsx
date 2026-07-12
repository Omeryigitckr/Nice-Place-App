import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';
import { OfflineBanner } from './src/components/OfflineBanner';
import { ToastHost } from './src/components/ToastHost';
import { I18nProvider } from './src/i18n';
import { SavePlaceWithCollectionsProvider } from './src/providers/SavePlaceWithCollectionsProvider';
import { PushNotificationsProvider } from './src/providers/PushNotificationsProvider';
import { ModerationGate } from './src/providers/ModerationGate';
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

function ThemedSplashOverlay({
  visible,
  onReady,
  onFinish,
}: {
  visible: boolean;
  onReady: () => void;
  onFinish: () => void;
}) {
  const { colors } = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <View
      style={[styles.splashLayer, { backgroundColor: colors.background }]}
      pointerEvents="box-none"
    >
      <AnimatedSplashScreen onReady={onReady} onFinish={onFinish} />
    </View>
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
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          {/*
            I18n initializes before UI that will use t(). Splash stays outside
            the ready-gate so it still covers the brief AsyncStorage/locale wait.
          */}
          <I18nProvider>
            <SavePlaceWithCollectionsProvider>
              <PushNotificationsProvider>
                <ModerationGate>
                  <AppNavigation />
                </ModerationGate>
              </PushNotificationsProvider>
            </SavePlaceWithCollectionsProvider>
            <OfflineBanner />
            <ToastHost />
          </I18nProvider>

          <ThemedSplashOverlay
            visible={splashVisible}
            onReady={handleSplashReady}
            onFinish={handleSplashFinish}
          />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splashLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
  },
});
