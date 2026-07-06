import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Subscribes to the OS reduce-motion preference. */
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  return reduceMotion;
}
