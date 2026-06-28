import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import tr from './locales/tr.json';

const LANGUAGE_KEY = '@app_language';

const SUPPORTED_LANGUAGES = ['en', 'tr'];

const getDeviceLanguage = () => {
  const locales = Localization.getLocales();
  const deviceLanguage = locales[0]?.languageCode || 'en';
  return SUPPORTED_LANGUAGES.includes(deviceLanguage) ? deviceLanguage : 'en';
};

const getInitialLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage) {
      return savedLanguage;
    }
    return getDeviceLanguage();
  } catch (error) {
    console.error('Error loading language:', error);
    return 'en';
  }
};

const resources = {
  en: { translation: en },
  tr: { translation: tr },
};

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export const changeLanguage = async (language: string) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    await i18n.changeLanguage(language);
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

export const initializeLanguage = async () => {
  const language = await getInitialLanguage();
  await i18n.changeLanguage(language);
};

export default i18n;
