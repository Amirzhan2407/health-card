import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import ncalayer from "../../services/ncalayer";
import { RiShieldKeyholeLine, RiLockPasswordLine, RiUserHeartLine } from "react-icons/ri";

export default function Login() {
  const { login, loginEds } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("password"); // 'password' or 'eds'
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const [edsLoading, setEdsLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
    try {
      await login(username, password);
      // Auth success, redirect will be handled by Router based on role, or we can force refresh
      navigate("/");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdsLogin = async () => {
    setAuthError("");
    setEdsLoading(true);
    try {
      // 1. Generate a random challenge message to sign
      const challengeText = `Auth challenge: ${Date.now()}`;
      const challengeBase64 = btoa(challengeText);

      // 2. Connect to local NCALayer and get keys info
      await ncalayer.connect();
      
      // 3. Ask to sign CMS signature of challenge
      const signature = await ncalayer.signData(challengeBase64);
      if (!signature) {
        throw new Error("Не удалось получить подпись от NCALayer.");
      }

      // 4. Authenticate signature with backend
      const res = await loginEds(signature, challengeBase64);
      if (res && res.needRegister) {
        // Redirect to registration pre-populating details
        navigate("/register", {
          state: {
            iin: res.details.iin,
            fullName: res.details.fullName,
          },
        });
      } else {
        navigate("/");
      }
    } catch (err) {
      setAuthError(err.message || "Ошибка подключения к NCALayer. Убедитесь, что приложение NCALayer запущено.");
    } finally {
      setEdsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background elements */}
      <div style={styles.bgBlob1}></div>
      <div style={styles.bgBlob2}></div>

      {/* Language switcher */}
      <div style={styles.langSelector}>
        <button
          onClick={() => setLanguage(language === "ru" ? "kk" : "ru")}
          style={styles.langButton}
        >
          {language === "ru" ? "ҚАЗ" : "РУС"}
        </button>
      </div>

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <RiUserHeartLine style={styles.logoIcon} />
          </div>
          <h2 style={styles.title}>Clinic OS</h2>
          <p style={styles.subtitle}>{t("welcome_back") || "Единый портал здоровья"}</p>
        </div>

        {/* Tab Buttons */}
        <div style={styles.tabContainer}>
          <button
            onClick={() => setActiveTab("password")}
            style={{
              ...styles.tabButton,
              ...(activeTab === "password" ? styles.activeTabButton : {}),
            }}
          >
            <RiLockPasswordLine style={styles.tabIcon} />
            {t("auth_via_password") || "Пароль"}
          </button>
          <button
            onClick={() => setActiveTab("eds")}
            style={{
              ...styles.tabButton,
              ...(activeTab === "eds" ? styles.activeTabButton : {}),
            }}
          >
            <RiShieldKeyholeLine style={styles.tabIcon} />
            {t("auth_via_eds") || "ЭЦП"}
          </button>
        </div>

        {authError && <div style={styles.errorAlert}>{authError}</div>}

        {activeTab === "password" ? (
          <form onSubmit={handlePasswordLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>{t("username_label") || "ИИН или Email"}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="120304506070"
                style={styles.input}
                required
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>{t("password_label") || "Пароль"}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={styles.input}
                required
              />
            </div>
            <button type="submit" disabled={loading} style={styles.submitButton}>
              {loading ? (t("logging_in") || "Вход...") : (t("login_button") || "Войти")}
            </button>
          </form>
        ) : (
          <div style={styles.edsContainer}>
            <p style={styles.edsInstructions}>
              {t("eds_instructions") ||
                "Для авторизации с помощью ЭЦП вам понадобится запущенное приложение NCALayer на вашем компьютере."}
            </p>
            <button
              onClick={handleEdsLogin}
              disabled={edsLoading}
              style={{ ...styles.submitButton, ...styles.edsButton }}
            >
              {edsLoading ? (t("connecting_eds") || "Подключение...") : (t("select_cert_button") || "Выбрать сертификат")}
            </button>
          </div>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>
            {t("no_account_yet") || "Еще нет аккаунта?"}{" "}
            <Link to="/register" style={styles.footerLink}>
              {t("register_link") || "Зарегистрироваться как пациент"}
            </Link>
          </p>
          <p style={styles.footerText}>
            <Link to="/organization-application" style={styles.footerLink}>
              {t("clinic_application_link") || "Подать заявку для клиники"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Sleek glassmorphism styles
const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    fontFamily: "'Outfit', 'Inter', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  bgBlob1: {
    position: "absolute",
    width: "400px",
    height: "400px",
    background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%)",
    top: "-10%",
    left: "-10%",
    borderRadius: "50%",
  },
  bgBlob2: {
    position: "absolute",
    width: "500px",
    height: "500px",
    background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(0,0,0,0) 70%)",
    bottom: "-10%",
    right: "-10%",
    borderRadius: "50%",
  },
  langSelector: {
    position: "absolute",
    top: "20px",
    right: "20px",
  },
  langButton: {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.3s ease",
  },
  card: {
    background: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "24px",
    padding: "40px",
    width: "100%",
    maxWidth: "440px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    textAlign: "center",
    marginBottom: "30px",
  },
  logoContainer: {
    width: "60px",
    height: "60px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #6366f1 0%, #10b981 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "0 auto 16px auto",
  },
  logoIcon: {
    fontSize: "30px",
    color: "#fff",
  },
  title: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#fff",
    margin: "0 0 4px 0",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#94a3b8",
    margin: 0,
  },
  tabContainer: {
    display: "flex",
    background: "rgba(0, 0, 0, 0.2)",
    padding: "4px",
    borderRadius: "12px",
    marginBottom: "24px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  tabButton: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    background: "none",
    border: "none",
    color: "#94a3b8",
    padding: "10px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    transition: "all 0.2s ease",
  },
  activeTabButton: {
    background: "rgba(255, 255, 255, 0.1)",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  tabIcon: {
    fontSize: "16px",
  },
  errorAlert: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#fca5a5",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    marginBottom: "20px",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    color: "#94a3b8",
    fontWeight: 600,
  },
  input: {
    background: "rgba(0, 0, 0, 0.2)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    padding: "12px 16px",
    color: "#fff",
    fontSize: "15px",
    outline: "none",
    transition: "all 0.3s ease",
  },
  submitButton: {
    background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    color: "#fff",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 10px 20px rgba(99, 102, 241, 0.2)",
    marginTop: "10px",
  },
  edsContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "20px",
    padding: "10px 0",
  },
  edsInstructions: {
    fontSize: "14px",
    color: "#94a3b8",
    lineHeight: "1.5",
    margin: 0,
  },
  edsButton: {
    width: "100%",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    boxShadow: "0 10px 20px rgba(16, 185, 129, 0.15)",
  },
  footer: {
    textAlign: "center",
    marginTop: "30px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  footerText: {
    fontSize: "13px",
    color: "#64748b",
    margin: 0,
  },
  footerLink: {
    color: "#6366f1",
    textDecoration: "none",
    fontWeight: 600,
  },
};
