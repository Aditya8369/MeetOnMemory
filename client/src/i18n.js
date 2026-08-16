import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import { DEFAULT_LANGUAGE } from "./constants/languages.js";

// Same pattern as getInitialTheme() in ThemeContext.jsx: read a saved
// preference synchronously so there's no flash of the wrong language.
const getInitialLanguage = () => {
  const saved = localStorage.getItem("language");
  return saved || DEFAULT_LANGUAGE;
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: getInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false, // React already handles XSS
  },
});

// Persist on every language change, no matter what triggered it
// (Navbar LanguageSwitcher, Settings page, etc). This is what makes the
// language choice survive a page refresh.
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("language", lng);
});

export default i18n;
