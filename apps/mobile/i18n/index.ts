import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import cs from './cs.json';
import en from './en.json';

export function getDeviceLocale(): 'cs' | 'en' {
  const locales = getLocales();
  const lang = locales[0]?.languageCode;
  return lang === 'cs' ? 'cs' : 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    cs: { translation: cs },
    en: { translation: en },
  },
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
