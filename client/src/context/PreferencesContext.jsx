import React, {
  createContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import i18n from "../i18n.js";
import { DEFAULT_LANGUAGE } from "../constants/languages.js";
import { DEFAULT_DATE_FORMAT } from "../utils/dateFormat.js";

const PreferencesContext = createContext(undefined);

// Helper to get initial dateFormat synchronously (same pattern as theme)
const getInitialDateFormat = () => {
  const saved = localStorage.getItem("dateFormat");
  return saved || DEFAULT_DATE_FORMAT;
};

export const PreferencesProvider = ({ children }) => {
  // language state mirrors i18n.language, which i18n.js already
  // initializes from localStorage on startup and persists on change.
  const [language, setLanguageState] = useState(
    () => i18n.language || DEFAULT_LANGUAGE,
  );
  const [dateFormat, setDateFormatState] = useState(getInitialDateFormat);

  // Keep this context in sync no matter what triggers the i18n change
  // (Settings page, Navbar LanguageSwitcher, or i18n.changeLanguage
  // called anywhere else).
  useEffect(() => {
    const handleLanguageChanged = (lng) => setLanguageState(lng);
    i18n.on("languageChanged", handleLanguageChanged);
    return () => i18n.off("languageChanged", handleLanguageChanged);
  }, []);

  const setLanguage = useCallback((langCode) => {
    // i18n.js listens for "languageChanged" and persists to localStorage,
    // and the effect above keeps `language` state in sync automatically.
    i18n.changeLanguage(langCode);
  }, []);

  const setDateFormat = useCallback((format) => {
    setDateFormatState(format);
    localStorage.setItem("dateFormat", format);
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      dateFormat,
      setDateFormat,
    }),
    [language, setLanguage, dateFormat, setDateFormat],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export { PreferencesContext };
