import { Ionicons } from '@expo/vector-icons';
import { Image, ImageContentFit, ImageProps } from 'expo-image';
import { memo, useEffect, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { radius } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface CachedImageProps {
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  /** Stable key (e.g. place.id) — prevents reload churn while scrolling. */
  recyclingKey?: string;
  accessibilityLabel?: string;
  /** Fixed size prevents layout shift while the image loads. */
  width?: number | `${number}%` | '100%';
  height?: number | `${number}%` | '100%';
  borderRadius?: number;
  priority?: ImageProps['priority'];
  /** List thumbs should stay low priority; heroes can use high. */
  transitionMs?: number;
}

/**
 * expo-image with memory-disk cache, fixed frame, static placeholder, and fail fallback.
 * No animated shimmer — release-safe on Android lists.
 */
function CachedImageComponent({
  uri,
  style,
  contentFit = 'cover',
  recyclingKey,
  accessibilityLabel,
  width,
  height,
  borderRadius = radius.md,
  priority = 'low',
  transitionMs = 0,
}: CachedImageProps) {
  const { colors } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(uri) && !failed;
  const showFallback = !uri || failed;

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [uri, recyclingKey]);

  return (
    <View
      style={[
        styles.frame,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceSecondary,
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
    >
      {showImage ? (
        <Image
          source={{ uri: uri as string }}
          style={[styles.image, { opacity: loaded ? 1 : 0, borderRadius }]}
          contentFit={contentFit}
          cachePolicy="memory-disk"
          recyclingKey={recyclingKey ?? uri ?? undefined}
          priority={priority}
          transition={transitionMs}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(false);
          }}
        />
      ) : null}

      {showFallback || !loaded ? (
        <View
          style={[styles.placeholder, { backgroundColor: colors.surfaceSecondary }]}
          pointerEvents="none"
        >
          {showFallback ? (
            <Ionicons name="image-outline" size={22} color={colors.textMuted} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const CachedImage = memo(CachedImageComponent);
