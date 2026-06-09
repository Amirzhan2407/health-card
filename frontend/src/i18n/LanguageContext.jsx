import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { translations } from "./translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("clinic_os_language") || "ru";
  });

  useEffect(() => {
    localStorage.setItem("clinic_os_language", language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations.ru[key] || key;
  };

  const value = useMemo(() => {
    return {
      language,
      setLanguage,
      t
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}