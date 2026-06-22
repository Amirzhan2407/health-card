import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { RiUserHeartLine } from "react-icons/ri";

export default function Register() {
  const { registerPatient } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [iin, setIin] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("unknown");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Prepopulate if redirected from ECP Login
  useEffect(() => {
    if (location.state) {
      if (location.state.iin) setIin(location.state.iin);
      if (location.state.fullName) setFullName(location.state.fullName);
    }
  }, [location.state]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (iin.length !== 12 || !/^\d+$/.test(iin)) {
      return setErrorMsg("ИИН должен состоять ровно из 12 цифр.");
    }

    if (password.length < 8) {
      return setErrorMsg("Пароль должен быть не менее 8 символов.");
    }

    if (password !== confirmPassword) {
      return setErrorMsg("Пароли не совпадают.");
    }

    setLoading(true);
    try {
      await registerPatient({
        iin,
        fullName,
        gender,
        password,
      });
      navigate("/");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgBlob1}></div>
      <div style={styles.bgBlob2}></div>

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <RiUserHeartLine style={styles.logoIcon} />
          </div>
          <h2 style={styles.title}>{t("registration_title") || "Регистрация"}</h2>
          <p style={styles.subtitle}>{t("registration_subtitle") || "Создание учетной записи пациента"}</p>
        </div>

        {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}

        <form onSubmit={handleRegister} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>{t("iin_label") || "ИИН"}</label>
            <input
              type="text"
              value={iin}
              onChange={(e) => setIin(e.target.value)}
              placeholder="120304506070"
              style={styles.input}
              maxLength={12}
              required
              disabled={!!location.state?.iin} // Disable edit if came from ECP verification
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>{t("fullname_label") || "ФИО"}</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иванов Иван Иванович"
              style={styles.input}
              required
              disabled={!!location.state?.fullName}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>{t("gender_label") || "Пол"}</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              style={styles.select}
            >
              <option value="unknown">{t("gender_unknown") || "Не указан"}</option>
              <option value="male">{t("gender_male") || "Мужской"}</option>
              <option value="female">{t("gender_female") || "Женский"}</option>
            </select>
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

          <div style={styles.inputGroup}>
            <label style={styles.label}>{t("confirm_password_label") || "Подтвердите пароль"}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
            />
          </div>

          <button type="submit" disabled={loading} style={styles.submitButton}>
            {loading ? (t("registering") || "Регистрация...") : (t("register_button") || "Зарегистрироваться")}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            {t("already_have_account") || "Уже есть аккаунт?"}{" "}
            <Link to="/login" style={styles.footerLink}>
              {t("login_link") || "Войти"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Reuse styles
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
    gap: "16px",
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
  select: {
    background: "rgba(0, 0, 0, 0.2)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    padding: "12px 16px",
    color: "#fff",
    fontSize: "15px",
    outline: "none",
    cursor: "pointer",
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
  footer: {
    textAlign: "center",
    marginTop: "24px",
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
