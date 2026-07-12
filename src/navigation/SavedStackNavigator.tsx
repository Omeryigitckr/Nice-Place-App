import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { SAVED_ROUTES } from '../constants';
import { AllSavedPlacesScreen, CollectionDetailScreen, SavedHomeScreen } from '../screens';
import { typography } from '../theme';
import { useThemeColors } from '../theme/ThemeContext';
import { SavedStackParamList } from '../types';

const Stack = createNativeStackNavigator<SavedStackParamList>();

export function SavedStackNavigator() {
  const colors = useThemeColors();
  const { t } = useTranslation();

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
        name={SAVED_ROUTES.SAVED_HOME}
        component={SavedHomeScreen}
        options={{ title: t('navigation.savedPlaces') }}
      />
      <Stack.Screen
        name={SAVED_ROUTES.ALL_SAVED_PLACES}
        component={AllSavedPlacesScreen}
        options={{ title: t('navigation.allSavedPlaces') }}
      />
      <Stack.Screen
        name={SAVED_ROUTES.COLLECTION_DETAIL}
        component={CollectionDetailScreen}
        options={{ title: t('navigation.collection') }}
      />
    </Stack.Navigator>
  );
}
