import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MAP_ROUTES } from '../constants';
import { EditPlaceScreen, MapHomeScreen, PickLocationScreen, PlaceDetailScreen, PublicProfileScreen } from '../screens';
import { typography } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';
import { MapStackParamList } from '../types';

const Stack = createNativeStackNavigator<MapStackParamList>();

export function MapStackNavigator() {
  const colors = useThemeColors();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          ...typography.screenTitle,
          fontSize: 17,
          color: colors.textPrimary,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name={MAP_ROUTES.MAP_HOME}
        component={MapHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={MAP_ROUTES.PLACE_DETAIL}
        component={PlaceDetailScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_bottom',
          animationDuration: 240,
          gestureDirection: 'vertical',
          fullScreenGestureEnabled: true,
        }}
      />
      <Stack.Screen
        name={MAP_ROUTES.EDIT_PLACE}
        component={EditPlaceScreen}
        options={{ title: 'Edit Place' }}
      />
      <Stack.Screen
        name={MAP_ROUTES.PUBLIC_PROFILE}
        component={PublicProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={MAP_ROUTES.PICK_LOCATION}
        component={PickLocationScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
