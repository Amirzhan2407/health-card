
import { Link } from "react-router-dom";

import {
  RiCalendarCheckLine,
  RiMentalHealthLine,
  RiRobotLine,
} from "react-icons/ri";

import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";

const TEXTS = {
  ru: {
    greeting: "Рады видеть вас",
    subtitle:
      "Ваш персональный медицинский кабинет Clinis OS.",

    bookingTitle:
      "Запись к врачу",

    bookingDescription:
      "Запишитесь на приём к нужному специалисту онлайн.",

    metricsTitle:
      "Показатели здоровья",

    metricsDescription:
      "Мониторинг давления, сахара, веса и ИМТ.",

    aiTitle:
      "AI Консультант",

    aiDescription:
      "Задайте вопрос нейросети о ваших симптомах.",

    defaultUser:
      "Пользователь",
  },

  kk: {
    greeting:
      "Қош келдіңіз",

    subtitle:
      "Сіздің Clinis OS жүйесіндегі жеке медициналық кабинетіңіз.",

    bookingTitle:
      "Дәрігерге жазылу",

    bookingDescription:
      "Қажетті маманның қабылдауына онлайн жазылыңыз.",

    metricsTitle:
      "Денсаулық көрсеткіштері",

    metricsDescription:
      "Қан қысымын, қант деңгейін, салмақты және дене салмағы индексін бақылау.",

    aiTitle:
      "AI кеңесші",

    aiDescription:
      "Белгілеріңіз туралы жасанды интеллектіге сұрақ қойыңыз.",

    defaultUser:
      "Пайдаланушы",
  },
};

export default function PatientDashboard() {
  const { user } = useAuth();

  const { language } =
    useLanguage();

  const isKazakh =
    language === "kk" ||
    language === "kz";

  const text =
    isKazakh
      ? TEXTS.kk
      : TEXTS.ru;

  const userName =
    user?.fullName ||
    user?.full_name ||
    text.defaultUser;

  return (
    <div style={styles.container}>
      <h2 style={styles.greeting}>
        {text.greeting},{" "}
        {userName}!
      </h2>

      <p style={styles.sub}>
        {text.subtitle}
      </p>

      <div style={styles.grid}>
        <Link
          to="/patient/booking"
          style={styles.tile}
        >
          <RiCalendarCheckLine
            style={styles.icon}
          />

          <h3 style={styles.tileTitle}>
            {text.bookingTitle}
          </h3>

          <p style={styles.tileText}>
            {text.bookingDescription}
          </p>
        </Link>

        <Link
          to="/patient/metrics"
          style={styles.tile}
        >
          <RiMentalHealthLine
            style={styles.icon}
          />

          <h3 style={styles.tileTitle}>
            {text.metricsTitle}
          </h3>

          <p style={styles.tileText}>
            {text.metricsDescription}
          </p>
        </Link>

        <Link
          to="/patient/ai"
          style={styles.tile}
        >
          <RiRobotLine
            style={styles.icon}
          />

          <h3 style={styles.tileTitle}>
            {text.aiTitle}
          </h3>

          <p style={styles.tileText}>
            {text.aiDescription}
          </p>
        </Link>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "40px",
    color: "#ffffff",

    fontFamily:
      "'Outfit', sans-serif",
  },

  greeting: {
    margin: "0 0 8px",

    fontSize: "32px",
    fontWeight: 700,
  },

  sub: {
    margin: "0 0 40px",

    color: "#94a3b8",

    fontSize: "16px",
  },

  grid: {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",

    gap: "24px",
  },

  tile: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",

    padding: "24px",

    border:
      "1px solid rgba(255, 255, 255, 0.05)",

    borderRadius: "20px",

    background:
      "rgba(30, 41, 59, 0.4)",

    color: "#ffffff",

    textDecoration: "none",

    cursor: "pointer",

    transition:
      "all 0.3s ease",
  },

  icon: {
    color: "#6366f1",

    fontSize: "36px",
  },

  tileTitle: {
    margin: 0,

    fontSize: "20px",
    fontWeight: 600,
  },

  tileText: {
    margin: 0,

    color: "#94a3b8",

    fontSize: "14px",
    lineHeight: 1.5,
  },
};

