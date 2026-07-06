import { Image, StyleSheet, View } from 'react-native';
import { UserRound } from 'lucide-react-native';

import { useAuth } from '../hooks';
import { iconSizes, radius } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface ProfileTabIconProps {
  color: string;
  focused: boolean;
}

export function ProfileTabIcon({ color, focused }: ProfileTabIconProps) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const avatarUrl = profile?.avatar_url;

  if (avatarUrl) {
    return (
      <View
        style={[
          styles.avatarWrap,
          {
            borderColor: focused ? colors.tabActive : colors.tabInactive,
          },
        ]}
      >
        <Image key={avatarUrl} source={{ uri: avatarUrl }} style={styles.avatar} resizeMode="cover" />
      </View>
    );
  }

  return <UserRound size={iconSizes.sm} color={color} strokeWidth={focused ? 2.5 : 2} />;
}

const styles = StyleSheet.create({
  avatarWrap: {
    width: 26,
    height: 26,
    borderRadius: radius.circle,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
});
