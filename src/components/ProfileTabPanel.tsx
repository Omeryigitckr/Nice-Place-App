import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { duration } from '../theme';

const calmEasing = Easing.out(Easing.cubic);

interface ProfileTabPanelProps {
  /** Changes when the active tab changes — triggers a light content transition. */
  tabKey: string;
  children: ReactNode;
}

/** Fades/slides tab content in without blank flashes. */
export function ProfileTabPanel({ tabKey, children }: ProfileTabPanelProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(8);

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration.normal,
        easing: calmEasing,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: duration.normal,
        easing: calmEasing,
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [opacity, tabKey, translateY]);

  return (
    <Animated.View style={[styles.panel, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
  },
});
