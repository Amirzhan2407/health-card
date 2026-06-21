import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { translations } from "./translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const stored = localStorage.getItem("clinic_os_language") || "ru";
    return stored === "kk" ? "kz" : stored;
  });

  useEffect(() => {
    localStorage.setItem("clinic_os_language", language);
    // Sync language selection to database if authenticated
    const orgUser = JSON.parse(localStorage.getItem("organizationUser") || "null");
    if (orgUser && orgUser.id) {
      fetch("https://health-card.onrender.com/api/organizations/profile/language", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: orgUser.id,
          language: language,
          role: orgUser.role
        })
      }).catch(err => console.warn("Failed to sync language to DB:", err));
    }
  }, [language]);

  const t = (key) => {
    const activeLang = language === "kk" ? "kz" : language;
    return translations[activeLang]?.[key] || translations.ru[key] || key;
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