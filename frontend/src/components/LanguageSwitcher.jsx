import { useLanguage } from "../i18n/LanguageContext";
import "../styles/languageSwitcher.css";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="language-switcher">
      <button
        type="button"
        className={language === "ru" ? "active" : ""}
        onClick={() => setLanguage("ru")}
      >
        RU
      </button>

      <button
        type="button"
        className={language === "kz" ? "active" : ""}
        onClick={() => setLanguage("kz")}
      >
        KZ
      </button>

      <button
        type="button"
        className={language === "en" ? "active" : ""}
        onClick={() => setLanguage("en")}
      >
        EN
      </button>
    </div>
  );
}