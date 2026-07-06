import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MAP_ROUTES } from '../constants';
import { AddPlaceScreen, PickLocationScreen } from '../screens';
import { stackScreenOptions } from '../theme';
import { AddPlaceStackParamList } from '../types';

const Stack = createNativeStackNavigator<AddPlaceStackParamList>();

export function AddPlaceStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        ...stackScreenOptions,
        animation: 'slide_from_bottom',
        animationDuration: 260,
        gestureDirection: 'vertical',
      }}
    >
      <Stack.Screen
        name={MAP_ROUTES.ADD_PLACE}
        component={AddPlaceScreen}
        options={{ title: 'Add Place' }}
      />
      <Stack.Screen
        name={MAP_ROUTES.PICK_LOCATION}
        component={PickLocationScreen}
        options={{
          headerShown: false,
          // Modal keeps Add Place mounted underneath (picker, not a new add flow).
          presentation: 'modal',
          animation: 'slide_from_bottom',
          gestureDirection: 'vertical',
        }}
      />
    </Stack.Navigator>
  );
}
