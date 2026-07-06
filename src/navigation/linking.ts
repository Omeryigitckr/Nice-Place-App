import { LinkingOptions } from '@react-navigation/native';

import { AUTH_ROUTES, ROOT_ROUTES } from '../constants';
import { RootStackParamList } from '../types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['niceplace://'],
  config: {
    screens: {
      [ROOT_ROUTES.AUTH]: {
        screens: {
          [AUTH_ROUTES.AUTH_CALLBACK]: 'auth/callback',
        },
      },
    },
  },
};
