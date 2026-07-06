import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { preloadAppData } from '../cache/preload';
import { ROOT_ROUTES } from '../constants';
import { colors } from '../theme';
import { RootStackParamList } from '../types';
import { resolveBootstrapRoute } from '../utils/appBootstrap';
import { warnMissingEnvOnce } from '../utils/env';

type Props = NativeStackScreenProps<RootStackParamList, typeof ROOT_ROUTES.SPLASH>;

/** Bootstrap route only — visual splash runs at app root via AnimatedSplashScreen. */
export function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      warnMissingEnvOnce();

      const nextRoute = await resolveBootstrapRoute();

      // Warm caches without blocking navigation for long.
      void preloadAppData();

      if (cancelled) {
        return;
      }

      navigation.replace(nextRoute);
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [navigation]);

  return <View style={styles.root} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
