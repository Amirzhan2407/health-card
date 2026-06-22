
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  RiArrowLeftLine,
  RiMailCheckLine,
  RiRefreshLine,
  RiUserHeartLine,
} from "react-icons/ri";

import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";

export default function Register() {
  const {
    requestRegistrationCode,
    confirmRegistration,
    resendRegistrationCode,
  } = useAuth();

  const {
    t,
    language,
    setLanguage,
  } = useLanguage();

  const navigate = useNavigate();

  const [step, setStep] = useState("form");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [code, setCode] = useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] =
    useState(false);

  const [codeExpiresIn, setCodeExpiresIn] =
    useState(0);

  const [resendDelay, setResendDelay] =
    useState(0);

  useEffect(() => {
    if (
      codeExpiresIn <= 0 &&
      resendDelay <= 0
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCodeExpiresIn((current) =>
        current > 0 ? current - 1 : 0
      );

      setResendDelay((current) =>
        current > 0 ? current - 1 : 0
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [codeExpiresIn, resendDelay]);

  function formatTime(totalSeconds) {
    const minutes = Math.floor(
      totalSeconds / 60
    );

    const seconds =
      totalSeconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }

  function switchLanguage() {
    setLanguage(
      language === "ru" ? "kk" : "ru"
    );
  }

  function validateRegistrationForm() {
    const normalizedUsername =
      username.trim();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      normalizedUsername.length < 3 ||
      normalizedUsername.length > 30
    ) {
      return "Логин должен содержать от 3 до 30 символов.";
    }

    if (
      !/^[\p{L}\p{N}._-]+$/u.test(
        normalizedUsername
      )
    ) {
      return "Логин может содержать буквы, цифры и символы . _ -";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      return "Введите корректную электронную почту.";
    }

    if (password.length < 8) {
      return "Пароль должен содержать минимум 8 символов.";
    }

    if (password !== confirmPassword) {
      return "Пароли не совпадают.";
    }

    return "";
  }

  async function handleRequestCode(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const validationError =
      validateRegistrationForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);

    try {
      const result =
        await requestRegistrationCode({
          username: username.trim(),
          email: email
            .trim()
            .toLowerCase(),
          password,
          confirmPassword,
          preferredLanguage:
            language === "kk"
              ? "kz"
              : "ru",
        });

      setStep("code");
      setCode("");
      setCodeExpiresIn(
        result.expiresInSeconds || 600
      );
      setResendDelay(30);

      setSuccessMessage(
        result.message ||
          "Код подтверждения отправлен на электронную почту."
      );
    } catch (error) {
      setErrorMessage(
        error?.message ||
          "Не удалось отправить код подтверждения."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmCode(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (!/^\d{6}$/.test(code)) {
      setErrorMessage(
        "Введите код из 6 цифр."
      );
      return;
    }

    if (codeExpiresIn <= 0) {
      setErrorMessage(
        "Срок действия кода истёк. Запросите новый код."
      );
      return;
    }

    setLoading(true);

    try {
      await confirmRegistration(
        email.trim().toLowerCase(),
        code
      );

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      setErrorMessage(
        error?.message ||
          "Не удалось подтвердить регистрацию."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (
      resendLoading ||
      resendDelay > 0
    ) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setResendLoading(true);

    try {
      const result =
        await resendRegistrationCode(
          email.trim().toLowerCase()
        );

      setCode("");
      setCodeExpiresIn(
        result.expiresInSeconds || 600
      );
      setResendDelay(30);

      setSuccessMessage(
        result.message ||
          "Новый код отправлен на электронную почту."
      );
    } catch (error) {
      setErrorMessage(
        error?.message ||
          "Не удалось повторно отправить код."
      );
    } finally {
      setResendLoading(false);
    }
  }

  function handleChangeRegistrationData() {
    setStep("form");
    setCode("");
    setCodeExpiresIn(0);
    setResendDelay(0);
    setErrorMessage("");
    setSuccessMessage("");
  }

  return (
    <div style={styles.container}>
      <div style={styles.bgBlob1} />
      <div style={styles.bgBlob2} />

      <div style={styles.langSelector}>
        <button
          type="button"
          onClick={switchLanguage}
          style={styles.langButton}
        >
          {language === "ru"
            ? "ҚАЗ"
            : "РУС"}
        </button>
      </div>

      <main style={styles.card}>
        <header style={styles.header}>
          <div style={styles.logoContainer}>
            {step === "form" ? (
              <RiUserHeartLine
                style={styles.logoIcon}
              />
            ) : (
              <RiMailCheckLine
                style={styles.logoIcon}
              />
            )}
          </div>

          <h1 style={styles.title}>
            {step === "form"
              ? t("registration_title") ||
                "Регистрация"
              : "Подтверждение Email"}
          </h1>

          <p style={styles.subtitle}>
            {step === "form"
              ? t(
                  "registration_subtitle"
                ) ||
                "Создание аккаунта пациента"
              : `Код отправлен на ${email}`}
          </p>
        </header>

        {errorMessage && (
          <div
            style={styles.errorAlert}
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            style={styles.successAlert}
            role="status"
          >
            {successMessage}
          </div>
        )}

        {step === "form" ? (
          <form
            onSubmit={handleRequestCode}
            style={styles.form}
          >
            <div style={styles.inputGroup}>
              <label
                htmlFor="username"
                style={styles.label}
              >
                Логин
              </label>

              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value
                  )
                }
                placeholder="Например: amir123"
                autoComplete="username"
                minLength={3}
                maxLength={30}
                disabled={loading}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label
                htmlFor="email"
                style={styles.label}
              >
                Электронная почта
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="example@gmail.com"
                autoComplete="email"
                disabled={loading}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label
                htmlFor="password"
                style={styles.label}
              >
                {t("password_label") ||
                  "Пароль"}
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Минимум 8 символов"
                autoComplete="new-password"
                minLength={8}
                disabled={loading}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label
                htmlFor="confirmPassword"
                style={styles.label}
              >
                {t(
                  "confirm_password_label"
                ) ||
                  "Повторите пароль"}
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Повторите пароль"
                autoComplete="new-password"
                minLength={8}
                disabled={loading}
                style={styles.input}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,
                ...(loading
                  ? styles.disabledButton
                  : {}),
              }}
            >
              {loading
                ? "Отправка кода..."
                : "Получить код"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleConfirmCode}
            style={styles.form}
          >
            <div style={styles.emailBox}>
              <span style={styles.emailLabel}>
                Электронная почта
              </span>

              <strong style={styles.emailValue}>
                {email}
              </strong>
            </div>

            <div style={styles.inputGroup}>
              <label
                htmlFor="confirmationCode"
                style={styles.label}
              >
                Код подтверждения
              </label>

              <input
                id="confirmationCode"
                name="confirmationCode"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(event) => {
                  const digits =
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6);

                  setCode(digits);
                }}
                placeholder="000000"
                autoComplete="one-time-code"
                maxLength={6}
                disabled={loading}
                style={styles.codeInput}
                required
                autoFocus
              />
            </div>

            <div style={styles.codeInfo}>
              {codeExpiresIn > 0 ? (
                <span>
                  Код действует ещё{" "}
                  <strong>
                    {formatTime(
                      codeExpiresIn
                    )}
                  </strong>
                </span>
              ) : (
                <span style={styles.expiredText}>
                  Срок действия кода истёк
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                code.length !== 6 ||
                codeExpiresIn <= 0
              }
              style={{
                ...styles.submitButton,
                ...(loading ||
                code.length !== 6 ||
                codeExpiresIn <= 0
                  ? styles.disabledButton
                  : {}),
              }}
            >
              {loading
                ? "Проверка кода..."
                : "Подтвердить регистрацию"}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={
                resendLoading ||
                resendDelay > 0
              }
              style={{
                ...styles.secondaryButton,
                ...(resendLoading ||
                resendDelay > 0
                  ? styles.disabledButton
                  : {}),
              }}
            >
              <RiRefreshLine />

              {resendLoading
                ? "Отправка..."
                : resendDelay > 0
                  ? `Отправить повторно через ${resendDelay} сек.`
                  : "Отправить новый код"}
            </button>

            <button
              type="button"
              onClick={
                handleChangeRegistrationData
              }
              disabled={loading}
              style={styles.backButton}
            >
              <RiArrowLeftLine />
              Изменить данные
            </button>
          </form>
        )}

        <footer style={styles.footer}>
          <p style={styles.footerText}>
            {t(
              "already_have_account"
            ) || "Уже есть аккаунт?"}{" "}

            <Link
              to="/login"
              style={styles.footerLink}
            >
              {t("login_link") || "Войти"}
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    width: "100%",
    boxSizing: "border-box",
    padding: "80px 20px 40px",
    background:
      "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    fontFamily:
      "'Outfit', 'Inter', sans-serif",
    position: "relative",
    overflow: "hidden",
  },

  bgBlob1: {
    position: "absolute",
    width: "420px",
    height: "420px",
    background:
      "radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(0,0,0,0) 70%)",
    top: "-160px",
    left: "-160px",
    borderRadius: "50%",
  },

  bgBlob2: {
    position: "absolute",
    width: "520px",
    height: "520px",
    background:
      "radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(0,0,0,0) 70%)",
    right: "-200px",
    bottom: "-220px",
    borderRadius: "50%",
  },

  langSelector: {
    position: "absolute",
    top: "20px",
    right: "20px",
    zIndex: 20,
  },

  langButton: {
    background:
      "rgba(255,255,255,0.06)",
    border:
      "1px solid rgba(255,255,255,0.14)",
    color: "#ffffff",
    padding: "9px 17px",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700,
  },

  card: {
    width: "100%",
    maxWidth: "460px",
    boxSizing: "border-box",
    padding: "38px",
    background:
      "rgba(15,23,42,0.72)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border:
      "1px solid rgba(255,255,255,0.1)",
    borderRadius: "24px",
    boxShadow:
      "0 24px 60px rgba(0,0,0,0.35)",
    position: "relative",
    zIndex: 10,
  },

  header: {
    textAlign: "center",
    marginBottom: "27px",
  },

  logoContainer: {
    width: "62px",
    height: "62px",
    margin: "0 auto 16px",
    borderRadius: "17px",
    background:
      "linear-gradient(135deg, #6366f1 0%, #10b981 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    boxShadow:
      "0 12px 28px rgba(99,102,241,0.28)",
  },

  logoIcon: {
    fontSize: "31px",
    color: "#ffffff",
  },

  title: {
    margin: "0 0 5px",
    color: "#ffffff",
    fontSize: "28px",
    fontWeight: 800,
  },

  subtitle: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "14px",
    lineHeight: 1.5,
    overflowWrap: "anywhere",
  },

  errorAlert: {
    marginBottom: "18px",
    padding: "12px 15px",
    borderRadius: "12px",
    background:
      "rgba(239,68,68,0.15)",
    border:
      "1px solid rgba(239,68,68,0.32)",
    color: "#fca5a5",
    fontSize: "14px",
    lineHeight: 1.5,
    textAlign: "center",
  },

  successAlert: {
    marginBottom: "18px",
    padding: "12px 15px",
    borderRadius: "12px",
    background:
      "rgba(16,185,129,0.15)",
    border:
      "1px solid rgba(16,185,129,0.32)",
    color: "#6ee7b7",
    fontSize: "14px",
    lineHeight: 1.5,
    textAlign: "center",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "17px",
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  label: {
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: 700,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 15px",
    background:
      "rgba(0,0,0,0.22)",
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "15px",
    outline: "none",
  },

  codeInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "15px",
    background:
      "rgba(0,0,0,0.22)",
    border:
      "1px solid rgba(255,255,255,0.14)",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "28px",
    fontWeight: 800,
    letterSpacing: "10px",
    textAlign: "center",
    outline: "none",
  },

  submitButton: {
    width: "100%",
    marginTop: "4px",
    padding: "14px",
    border: "none",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    boxShadow:
      "0 10px 22px rgba(99,102,241,0.24)",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },

  secondaryButton: {
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    background:
      "rgba(16,185,129,0.12)",
    border:
      "1px solid rgba(16,185,129,0.25)",
    color: "#6ee7b7",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
  },

  backButton: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },

  disabledButton: {
    cursor: "not-allowed",
    opacity: 0.55,
  },

  emailBox: {
    padding: "13px 15px",
    borderRadius: "12px",
    background:
      "rgba(255,255,255,0.05)",
    border:
      "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  emailLabel: {
    color: "#64748b",
    fontSize: "12px",
  },

  emailValue: {
    color: "#e2e8f0",
    fontSize: "14px",
    overflowWrap: "anywhere",
  },

  codeInfo: {
    color: "#94a3b8",
    fontSize: "13px",
    textAlign: "center",
  },

  expiredText: {
    color: "#fca5a5",
  },

  footer: {
    marginTop: "25px",
    textAlign: "center",
  },

  footerText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "14px",
  },

  footerLink: {
    color: "#818cf8",
    textDecoration: "none",
    fontWeight: 700,
  },
};
