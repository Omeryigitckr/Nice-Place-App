import { Bookmark, Compass } from 'lucide-react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_ROUTES } from '../constants';
import { SavedPlacesScreen } from '../screens';
import {
  floatingTabBarLayout,
  iconSizes,
  spacing,
  typography,
} from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { MainTabParamList } from '../types';

import { AddPlaceStackNavigator } from './AddPlaceStackNavigator';
import { AddPlaceTabButton } from './AddPlaceTabButton';
import { AnimatedTabBarButton } from './AnimatedTabBarButton';
import { MapStackNavigator } from './MapStackNavigator';
import { ProfileStackNavigator } from './ProfileStackNavigator';
import { ProfileTabIcon } from './ProfileTabIcon';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  [TAB_ROUTES.EXPLORE]: 'Explore',
  [TAB_ROUTES.SAVED]: 'Saved',
  [TAB_ROUTES.ADD_PLACE]: 'Add Place',
  [TAB_ROUTES.PROFILE]: 'Profile',
};

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const { colors, shadows, colorScheme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: true,
        tabBarStyle: [
          styles.tabBar,
          {
            bottom: insets.bottom + floatingTabBarLayout.bottomOffset,
            marginHorizontal: floatingTabBarLayout.horizontalInset,
            height: floatingTabBarLayout.height,
            backgroundColor: colors.tabBarBackground,
            borderTopColor: colors.tabBarBorder,
            ...(colorScheme === 'light' ? shadows.tabBar : floatingTabBarLayout.shadow),
          },
        ],
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarButton:
          route.name === TAB_ROUTES.ADD_PLACE
            ? (props) => <AddPlaceTabButton {...props} />
            : (props) => <AnimatedTabBarButton {...props} />,
        tabBarIcon:
          route.name === TAB_ROUTES.ADD_PLACE
            ? undefined
            : ({ color, focused, size }) => {
                const strokeWidth = focused ? 2.5 : 2;
                const iconSize = size ?? iconSizes.sm;

                if (route.name === TAB_ROUTES.EXPLORE) {
                  return <Compass size={iconSize} color={color} strokeWidth={strokeWidth} />;
                }

                if (route.name === TAB_ROUTES.SAVED) {
                  return <Bookmark size={iconSize} color={color} strokeWidth={strokeWidth} />;
                }

                if (route.name === TAB_ROUTES.PROFILE) {
                  return <ProfileTabIcon color={color} focused={focused} />;
                }

                return null;
              },
      })}
    >
      <Tab.Screen
        name={TAB_ROUTES.EXPLORE}
        component={MapStackNavigator}
        options={{ tabBarLabel: TAB_LABELS[TAB_ROUTES.EXPLORE] }}
      />
      <Tab.Screen
        name={TAB_ROUTES.SAVED}
        component={SavedPlacesScreen}
        options={{
          tabBarLabel: TAB_LABELS[TAB_ROUTES.SAVED],
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          headerTitleStyle: {
            ...typography.screenTitle,
            fontSize: 17,
            color: colors.textPrimary,
          },
          title: 'Saved Places',
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.ADD_PLACE}
        component={AddPlaceStackNavigator}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => <AddPlaceTabButton {...props} />,
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.PROFILE}
        component={ProfileStackNavigator}
        options={{ tabBarLabel: TAB_LABELS[TAB_ROUTES.PROFILE] }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
    borderTopWidth: 1,
    borderRadius: floatingTabBarLayout.borderRadius,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  tabBarItem: {
    paddingTop: 4,
  },
  tabBarLabel: {
    ...typography.tabLabel,
    marginTop: 2,
  },
});
