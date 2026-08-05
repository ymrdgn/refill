import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LANGUAGE_CODES } from './lib/languages';

import ar from './locales/ar.json';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fa from './locales/fa.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import ku from './locales/ku.json';
import ptBR from './locales/pt-BR.json';
import ptPT from './locales/pt-PT.json';
import tr from './locales/tr.json';
import zh from './locales/zh.json';

const LANGUAGE_KEY = '@app_language';

const resources = {
  ar: { translation: ar },
  de: { translation: de },
  en: { translation: en },
  es: { translation: es },
  fa: { translation: fa },
  fr: { translation: fr },
  it: { translation: it },
  ja: { translation: ja },
  ku: { translation: ku },
  'pt-BR': { translation: ptBR },
  'pt-PT': { translation: ptPT },
  tr: { translation: tr },
  zh: { translation: zh },
};

/**
 * Cihaz dilini desteklenen bir koda eşler.
 *
 * Sıra önemli: önce tam etiket (pt-BR gibi bölgeli kodlarımız için), sonra
 * yalın dil kodu, en son bölgeye göre tahmin. Örnekler:
 *   pt-BR → pt-BR · pt-PT → pt-PT · pt      → pt-PT (varsayılan)
 *   zh-Hans / zh-CN / zh-TW                 → zh
 *   en-GB  → en    · de-AT → de
 */
const REGIONLESS_FALLBACK: Record<string, string> = {
  pt: 'pt-PT',
  zh: 'zh',
};

const getDeviceLanguage = (): string => {
  try {
    const locale = Localization.getLocales()[0];
    if (!locale) return 'en';

    const tag = locale.languageTag; // ör. "pt-BR", "zh-Hans-CN"
    if (LANGUAGE_CODES.includes(tag)) return tag;

    const lang = locale.languageCode ?? 'en'; // ör. "pt", "zh"
    const region = locale.regionCode; // ör. "BR"

    // Bölgeli bir sürümümüz var mı? (pt + BR → pt-BR)
    if (region && LANGUAGE_CODES.includes(`${lang}-${region}`)) {
      return `${lang}-${region}`;
    }
    if (LANGUAGE_CODES.includes(lang)) return lang;
    if (REGIONLESS_FALLBACK[lang]) return REGIONLESS_FALLBACK[lang];
    return 'en';
  } catch {
    return 'en';
  }
};

const getInitialLanguage = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    // Kayıtlı dil artık desteklenmiyorsa cihaz diline dön.
    if (saved && LANGUAGE_CODES.includes(saved)) return saved;
    return getDeviceLanguage();
  } catch (error) {
    console.error('Error loading language:', error);
    return 'en';
  }
};

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: {
    // Portekizce varyantları birbirine düşsün, sonra İngilizce.
    'pt-BR': ['pt-PT', 'en'],
    'pt-PT': ['pt-BR', 'en'],
    default: ['en'],
  },
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
