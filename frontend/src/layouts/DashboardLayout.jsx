import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  RiGlobalLine,
  RiLogoutBoxLine,
  RiUserHeartLine,
} from "react-icons/ri";

import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

const NAVIGATION_TRANSLATIONS = {
  "Главная": "Басты бет",

  "Медицинская карта":
    "Медициналық карта",

  "Запись к врачу":
    "Дәрігерге жазылу",

  "Записи": "Жазбалар",

  "Показатели здоровья":
    "Денсаулық көрсеткіштері",

  "Справки": "Анықтамалар",

  "AI Консультант":
    "AI кеңесші",

  "Уведомления":
    "Хабарландырулар",

  "Календарь приемов":
    "Қабылдаулар күнтізбесі",

  "Календарь приёмов":
    "Қабылдаулар күнтізбесі",

  "Медицинские карты":
    "Медициналық карталар",

  "Врачи клиники":
    "Клиника дәрігерлері",

  "Расписание смен":
    "Ауысым кестесі",

  "Перенос приемов":
    "Қабылдауларды ауыстыру",

  "Перенос приёмов":
    "Қабылдауларды ауыстыру",

  "Отделения клиники":
    "Клиника бөлімдері",

  "Заявки клиник":
    "Клиникалар өтінімдері",

  "Техподдержка":
    "Техникалық қолдау",
};

const ROLE_TRANSLATIONS = {
  patient: {
    ru: "Пациент",
    kk: "Емделуші",
  },

  doctor: {
    ru: "Врач",
    kk: "Дәрігер",
  },

  organization_admin: {
    ru: "Администратор",
    kk: "Әкімші",
  },

  support: {
    ru: "Поддержка",
    kk: "Қолдау қызметі",
  },
};

function translateNavigationLabel(
  label,
  isKazakh
) {
  if (!isKazakh) {
    return label;
  }

  return (
    NAVIGATION_TRANSLATIONS[label] ||
    label
  );
}

function getRoleLabel(
  role,
  isKazakh
) {
  const roleTranslation =
    ROLE_TRANSLATIONS[role];

  if (!roleTranslation) {
    return role || "";
  }

  return isKazakh
    ? roleTranslation.kk
    : roleTranslation.ru;
}

export default function DashboardLayout({
  links = [],
}) {
  const {
    user,
    logout,
  } = useAuth();

  const {
    language,
    setLanguage,
  } = useLanguage();

  const navigate =
    useNavigate();

  const isKazakh =
    language === "kk" ||
    language === "kz";

  async function handleLogout() {
    await logout();

    navigate("/login", {
      replace: true,
    });
  }

  function handleLanguageChange() {
    setLanguage(
      isKazakh
        ? "ru"
        : "kk"
    );
  }

  const userName =
    user?.fullName ||
    user?.full_name ||
    (isKazakh
      ? "Пайдаланушы"
      : "Пользователь");

  const userRole =
    getRoleLabel(
      user?.role,
      isKazakh
    );

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.logoBox}>
            <RiUserHeartLine
              style={{
                fontSize: "20px",
              }}
            />
          </div>

          <span style={styles.brandName}>
            Clinis OS
          </span>
        </div>

        <nav style={styles.nav}>
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={
                link.path ===
                  "/patient" ||
                link.path ===
                  "/doctor" ||
                link.path ===
                  "/org-admin" ||
                link.path ===
                  "/support"
              }
              style={({
                isActive,
              }) => ({
                ...styles.navLink,

                ...(isActive
                  ? styles.activeNavLink
                  : {}),
              })}
            >
              <span style={styles.navIcon}>
                {link.icon}
              </span>

              <span>
                {translateNavigationLabel(
                  link.label,
                  isKazakh
                )}
              </span>
            </NavLink>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <span style={styles.userName}>
              {userName}
            </span>

            <span style={styles.userRole}>
              {userRole}
            </span>
          </div>

          <div style={styles.actionsGrid}>
            <button
              type="button"
              onClick={
                handleLanguageChange
              }
              style={styles.actionBtn}
              title={
                isKazakh
                  ? "Переключить на русский"
                  : "Қазақ тіліне ауысу"
              }
              aria-label={
                isKazakh
                  ? "Переключить на русский"
                  : "Қазақ тіліне ауысу"
              }
            >
              <RiGlobalLine
                style={{
                  fontSize: "18px",
                }}
              />

              <span style={styles.languageText}>
                {isKazakh
                  ? "РУС"
                  : "ҚАЗ"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                ...styles.actionBtn,
                ...styles.logoutButton,
              }}
              title={
                isKazakh
                  ? "Жүйеден шығу"
                  : "Выйти"
              }
              aria-label={
                isKazakh
                  ? "Жүйеден шығу"
                  : "Выйти"
              }
            >
              <RiLogoutBoxLine
                style={{
                  fontSize: "19px",
                }}
              />
            </button>
          </div>
        </div>
      </aside>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",

    background:
      "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",

    fontFamily:
      "'Outfit', sans-serif",
  },

  sidebar: {
    width: "260px",
    minWidth: "260px",
    height: "100vh",
    boxSizing: "border-box",

    background:
      "rgba(15, 23, 42, 0.4)",

    backdropFilter: "blur(15px)",

    WebkitBackdropFilter:
      "blur(15px)",

    borderRight:
      "1px solid rgba(255, 255, 255, 0.05)",

    display: "flex",
    flexDirection: "column",

    padding: "30px 20px",

    position: "sticky",
    top: 0,
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",

    marginBottom: "40px",
  },

  logoBox: {
    width: "36px",
    height: "36px",

    flexShrink: 0,

    borderRadius: "10px",

    background:
      "linear-gradient(135deg, #6366f1 0%, #10b981 100%)",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    color: "#ffffff",
  },

  brandName: {
    color: "#ffffff",

    fontSize: "20px",
    fontWeight: 700,
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",

    flex: 1,
  },

  navLink: {
    minHeight: "44px",

    display: "flex",
    alignItems: "center",
    gap: "12px",

    boxSizing: "border-box",

    padding: "11px 14px",

    border:
      "1px solid transparent",

    borderRadius: "12px",

    color: "#94a3b8",

    textDecoration: "none",

    fontSize: "14px",
    fontWeight: 600,

    transition:
      "background 0.2s ease, color 0.2s ease, border-color 0.2s ease",
  },

  activeNavLink: {
    color: "#ffffff",

    borderColor:
      "rgba(99, 102, 241, 0.25)",

    background:
      "rgba(99, 102, 241, 0.15)",
  },

  navIcon: {
    width: "18px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    flexShrink: 0,

    fontSize: "16px",
  },

  sidebarFooter: {
    borderTop:
      "1px solid rgba(255,255,255,0.05)",

    paddingTop: "20px",

    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  userInfo: {
    display: "flex",
    flexDirection: "column",
  },

  userName: {
    color: "#ffffff",

    fontSize: "13px",
    fontWeight: 700,

    lineHeight: 1.35,
  },

  userRole: {
    marginTop: "3px",

    color: "#64748b",

    fontSize: "11px",
    fontWeight: 700,

    textTransform: "uppercase",
  },

  actionsGrid: {
    display: "flex",
    gap: "12px",
  },

  actionBtn: {
    minHeight: "42px",

    flex: 1,

    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "7px",

    padding: "9px 12px",

    border:
      "1px solid rgba(255,255,255,0.04)",

    borderRadius: "10px",

    background:
      "rgba(255,255,255,0.05)",

    color: "#94a3b8",

    cursor: "pointer",

    fontFamily: "inherit",
    fontWeight: 700,

    transition:
      "background 0.2s ease, color 0.2s ease",
  },

  languageText: {
    fontSize: "11px",
    fontWeight: 800,
  },

  logoutButton: {
    color: "#fca5a5",
  },

  main: {
    flex: 1,

    height: "100vh",

    overflowX: "hidden",
    overflowY: "auto",
  },
};

export const option = {};