import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

import { AnimatedListItem } from './AnimatedListItem';

interface ProfileGridItemProps {
  index: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Lightweight grid/list entrance for the first visible items only.
 * Delegates to the shared AnimatedListItem motion primitive.
 */
export function ProfileGridItem({ index, children, style }: ProfileGridItemProps) {
  return (
    <AnimatedListItem index={index} style={style}>
      {children}
    </AnimatedListItem>
  );
}
