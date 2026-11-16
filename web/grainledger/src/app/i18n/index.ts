import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import vi from './locales/vi.json';

export const normalizeLanguage = (value: string | null | undefined): 'vi' | 'en' =>
  value?.toLowerCase().startsWith('en') ? 'en' : 'vi';
const savedLang = normalizeLanguage(localStorage.getItem('grainledger_lang'));

i18n
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    lng: savedLang,
    fallbackLng: 'vi',
    supportedLngs: ['vi', 'en'],
    load: 'languageOnly',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
