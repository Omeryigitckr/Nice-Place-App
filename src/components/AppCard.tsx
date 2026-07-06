import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

import { AnimatedCard } from './AnimatedCard';

interface AppCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  padded?: boolean;
  /** Optional press handler — enables card press feedback. */
  onPress?: () => void;
  /** Optional staggered entrance index. */
  entranceIndex?: number;
}

/**
 * Theme-safe card surface. Backed by AnimatedCard for optional press/entrance motion.
 */
export function AppCard({
  children,
  style,
  elevated = false,
  padded = true,
  onPress,
  entranceIndex,
}: AppCardProps) {
  return (
    <AnimatedCard
      elevated={elevated}
      padded={padded}
      onPress={onPress}
      entranceIndex={entranceIndex}
      style={style}
    >
      {children}
    </AnimatedCard>
  );
}
