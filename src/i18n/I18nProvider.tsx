import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { I18nextProvider } from 'react-i18next';

import {
  changeAppLanguage,
  getCurrentLanguage,
  i18n,
  initI18n,
} from './instance';
import { isSupportedLanguage, SupportedLanguage } from './types';

interface I18nContextValue {
  /** True after i18n has resolved the initial language and initialized. */
  isI18nReady: boolean;
  language: SupportedLanguage;
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
}

const I18nContext = createContext<I18nContextValue>({
  isI18nReady: false,
  language: 'en',
  changeLanguage: async () => undefined,
});

interface I18nProviderProps {
  children: ReactNode;
}

/**
 * Boots localization before painting translated UI.
 * Renders nothing until init completes so the existing splash can cover the wait
 * and avoid a wrong-language flash once screens start using `t()`.
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const [isI18nReady, setIsI18nReady] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>('en');

  useEffect(() => {
    let cancelled = false;

    void initI18n()
      .then(() => {
        if (cancelled) {
          return;
        }
        setLanguage(getCurrentLanguage());
        setIsI18nReady(true);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        // Init failure should not blank the app forever — surface English defaults.
        setLanguage('en');
        setIsI18nReady(true);
      });

    const onLanguageChanged = (next: string) => {
      if (isSupportedLanguage(next)) {
        setLanguage(next);
      }
    };

    i18n.on('languageChanged', onLanguageChanged);

    return () => {
      cancelled = true;
      i18n.off('languageChanged', onLanguageChanged);
    };
  }, []);

  const changeLanguage = useCallback(async (next: SupportedLanguage) => {
    await changeAppLanguage(next);
    setLanguage(next);
  }, []);

  const value = useMemo(
    () => ({
      isI18nReady,
      language,
      changeLanguage,
    }),
    [isI18nReady, language, changeLanguage],
  );

  if (!isI18nReady) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
    </I18nextProvider>
  );
}

export function useAppLanguage(): I18nContextValue {
  return useContext(I18nContext);
}
