
import { useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  RiBuilding4Line,
  RiLockPasswordLine,
  RiUserAddLine,
  RiUserHeartLine,
  RiUserLine,
} from "react-icons/ri";

import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";

export default function Login() {
  const { login } = useAuth();

  const {
    t,
    language,
    setLanguage,
  } = useLanguage();

  const navigate = useNavigate();

  const [
    loginType,
    setLoginType,
  ] = useState("patient");

  const [
    loginValue,
    setLoginValue,
  ] = useState("");

  const [
    organizationBin,
    setOrganizationBin,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    authError,
    setAuthError,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const isPatient =
    loginType === "patient";

  const isOrganizationAdmin =
    loginType ===
    "organization_admin";

  const isStaff =
    loginType === "staff";

  function normalizeLoginValue() {
    if (isPatient) {
      return String(
        loginValue || ""
      )
        .replace(/\D/g, "")
        .slice(0, 12);
    }

    return String(
      loginValue || ""
    ).trim();
  }

  async function handleLogin(
    event
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    const normalizedLogin =
      normalizeLoginValue();

    const normalizedBin =
      String(
        organizationBin || ""
      )
        .replace(/\D/g, "")
        .slice(0, 12);

    if (
      isPatient &&
      !/^\d{12}$/.test(
        normalizedLogin
      )
    ) {
      setAuthError(
        t("patientIinLengthError")
      );

      return;
    }

    if (
      !isPatient &&
      !normalizedLogin
    ) {
      setAuthError(
       t("loginRequiredError")
      );

      return;
    }

    if (
      isOrganizationAdmin &&
      !/^\d{12}$/.test(
        normalizedBin
      )
    ) {
      setAuthError(
        t("organizationBinLengthError")
      );

      return;
    }

    if (!password) {
      setAuthError(
        t("passwordRequiredError")
      );

      return;
    }

    setAuthError("");
    setLoading(true);

    try {
      await login(
        normalizedLogin,
        password,
        isOrganizationAdmin
          ? normalizedBin
          : null,
        loginType
      );

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      setAuthError(
        error?.response?.data
          ?.message ||
          error?.message ||
          t("loginFailedError")
      );
    } finally {
      setLoading(false);
    }
  }

  function switchLanguage() {
    setLanguage(
      language === "ru"
        ? "kk"
        : "ru"
    );
  }

  function selectLoginType(
    type
  ) {
    setLoginType(type);
    setLoginValue("");
    setPassword("");
    setAuthError("");

    if (
      type !==
      "organization_admin"
    ) {
      setOrganizationBin("");
    }
  }

  function handleLoginValueChange(
    event
  ) {
    const value =
      event.target.value;

    if (isPatient) {
      setLoginValue(
        value
          .replace(/\D/g, "")
          .slice(0, 12)
      );

      return;
    }

    setLoginValue(value);
  }

  function getLoginLabel() {
  if (isPatient) {
    return t("patientIinLabel");
  }

  if (isStaff) {
    return t("staffLoginLabel");
  }

  return t("adminLoginLabel");
}

  function getLoginPlaceholder() {
  if (isPatient) {
    return t("patientIinPlaceholder");
  }

  if (isStaff) {
    return t("staffLoginPlaceholder");
  }

  return t("adminLoginPlaceholder");
}

  return (
    <div style={styles.container}>
      <div style={styles.bgBlob1} />
      <div style={styles.bgBlob2} />

      <div
        style={
          styles.langSelector
        }
      >
        <button
          type="button"
          onClick={switchLanguage}
          style={
            styles.langButton
          }
        >
          {language === "ru"
            ? "ҚАЗ"
            : "РУС"}
        </button>
      </div>

      <main style={styles.card}>
        <header
          style={styles.header}
        >
          <div
            style={
              styles.logoContainer
            }
          >
            <RiUserHeartLine
              style={styles.logoIcon}
            />
          </div>

          <h1 style={styles.title}>
            Clinis OS
          </h1>

          <p style={styles.subtitle}>
            {t("welcome_back") ||
              "Единый портал здоровья"}
          </p>
        </header>

        <div
          style={
            styles.loginTitle
          }
        >
          <RiLockPasswordLine
            style={styles.loginIcon}
          />

          <span>
            {t("login_title") ||
              "Вход в систему"}
          </span>
        </div>

        <div
          style={
            styles.typeSelector
          }
        >
          <button
            type="button"
            onClick={() =>
              selectLoginType(
                "patient"
              )
            }
            disabled={loading}
            style={{
              ...styles.typeButton,

              ...(isPatient
                ? styles.activeTypeButton
                : {}),
            }}
          >
            <RiUserHeartLine />

            <span>
              {t("loginRolePatient")}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              selectLoginType(
                "staff"
              )
            }
            disabled={loading}
            style={{
              ...styles.typeButton,

              ...(isStaff
                ? styles.activeTypeButton
                : {}),
            }}
          >
            <RiUserLine />

            <span>
              {t("loginRoleDoctor")}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              selectLoginType(
                "organization_admin"
              )
            }
            disabled={loading}
            style={{
              ...styles.typeButton,

              ...(isOrganizationAdmin
                ? styles.activeTypeButton
                : {}),
            }}
          >
            <RiBuilding4Line />

            <span>
              {t("loginRoleAdmin")}
            </span>
          </button>
        </div>

        {authError && (
          <div
            style={
              styles.errorAlert
            }
            role="alert"
          >
            {authError}
          </div>
        )}

        <form
          onSubmit={handleLogin}
          style={styles.form}
        >
          <div
            style={
              styles.inputGroup
            }
          >
            <label
              htmlFor="login"
              style={styles.label}
            >
              {getLoginLabel()}
            </label>

            <input
              id="login"
              name="login"
              type="text"
              inputMode={
                isPatient
                  ? "numeric"
                  : "text"
              }
              value={loginValue}
              onChange={
                handleLoginValueChange
              }
              placeholder={
                getLoginPlaceholder()
              }
              autoComplete="username"
              maxLength={
                isPatient
                  ? 12
                  : 50
              }
              disabled={loading}
              style={styles.input}
              required
            />

            {isPatient && (
              <span
                style={
                  styles.valueCounter
                }
              >
                {loginValue.length}/12
              </span>
            )}
          </div>

          {isOrganizationAdmin && (
            <div
              style={
                styles.inputGroup
              }
            >
              <label
                htmlFor="organizationBin"
                style={styles.label}
              >
                {t("organizationBinLabel")}
              </label>

              <input
                id="organizationBin"
                name="organizationBin"
                type="text"
                inputMode="numeric"
                value={
                  organizationBin
                }
                onChange={(event) =>
                  setOrganizationBin(
                    event.target.value
                      .replace(
                        /\D/g,
                        ""
                      )
                      .slice(0, 12)
                  )
                }
                placeholder={t(
  "organizationBinPlaceholder"
)}
                maxLength={12}
                disabled={loading}
                style={styles.input}
                required
              />

              <span
                style={
                  styles.valueCounter
                }
              >
                {
                  organizationBin.length
                }
                /12
              </span>
            </div>
          )}

          <div
            style={
              styles.inputGroup
            }
          >
            <label
              htmlFor="password"
              style={styles.label}
            >
              {t(
                "password_label"
              ) || "Пароль"}
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
              placeholder="••••••••"
              autoComplete="current-password"
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
              ? t("logging_in") ||
                "Выполняется вход..."
              : t("login_button") ||
                "Войти"}
          </button>
        </form>

        <div style={styles.footer}>
          <p
            style={
              styles.footerText
            }
          >
            {t("no_account") ||
              "Нет аккаунта?"}{" "}

            <Link
              to="/register"
              style={
                styles.footerLink
              }
            >
              <RiUserAddLine
                style={
                  styles.footerLinkIcon
                }
              />

              {t(
                "register_button"
              ) ||
                "Зарегистрироваться"}
            </Link>
          </p>

          <div
            style={styles.divider}
          >
            <span
              style={
                styles.dividerLine
              }
            />

            <span
              style={
                styles.dividerText
              }
            >
              {t("or") || "или"}
            </span>

            <span
              style={
                styles.dividerLine
              }
            />
          </div>

          <Link
            to="/organization-application"
            style={
              styles.organizationLink
            }
          >
            {t(
              "clinic_application_link"
            ) ||
              "Подать заявку от медицинской организации"}
          </Link>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent:
      "center",
    alignItems: "center",
    minHeight: "100vh",
    width: "100%",
    boxSizing: "border-box",
    padding:
      "80px 20px 40px",
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
    maxWidth: "560px",
    boxSizing: "border-box",
    padding: "34px",
    background:
      "rgba(15,23,42,0.72)",
    backdropFilter:
      "blur(20px)",
    WebkitBackdropFilter:
      "blur(20px)",
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
    marginBottom: "24px",
  },

  logoContainer: {
    width: "62px",
    height: "62px",
    margin: "0 auto 16px",
    borderRadius: "17px",
    background:
      "linear-gradient(135deg, #6366f1 0%, #10b981 100%)",
    display: "flex",
    justifyContent:
      "center",
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
    fontSize: "29px",
    fontWeight: 800,
  },

  subtitle: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "14px",
  },

  loginTitle: {
    display: "flex",
    justifyContent:
      "center",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
    padding: "11px",
    background:
      "rgba(255,255,255,0.06)",
    border:
      "1px solid rgba(255,255,255,0.07)",
    borderRadius: "12px",
    color: "#e2e8f0",
    fontSize: "14px",
    fontWeight: 700,
  },

  loginIcon: {
    fontSize: "18px",
  },

  typeSelector: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "8px",
    marginBottom: "18px",
  },

  typeButton: {
    minHeight: "72px",
    padding: "9px",
    borderRadius: "11px",
    border:
      "1px solid rgba(255,255,255,0.09)",
    background:
      "rgba(0,0,0,0.16)",
    color: "#94a3b8",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    justifyContent:
      "center",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    fontWeight: 700,
    lineHeight: 1.25,
  },

  activeTypeButton: {
    background:
      "rgba(99,102,241,0.18)",
    border:
      "1px solid rgba(99,102,241,0.55)",
    color: "#c7d2fe",
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

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "17px",
  },

  inputGroup: {
    position: "relative",
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

  valueCounter: {
    position: "absolute",
    right: "12px",
    bottom: "14px",
    color: "#64748b",
    fontSize: "11px",
    pointerEvents: "none",
  },

  submitButton: {
    width: "100%",
    marginTop: "4px",
    padding: "14px",
    border: "none",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },

  disabledButton: {
    cursor: "not-allowed",
    opacity: 0.65,
  },

  footer: {
    marginTop: "27px",
    textAlign: "center",
  },

  footerText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "14px",
  },

  footerLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    color: "#818cf8",
    textDecoration: "none",
    fontWeight: 700,
  },

  footerLinkIcon: {
    fontSize: "16px",
  },

  divider: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "21px 0",
  },

  dividerLine: {
    flex: 1,
    height: "1px",
    background:
      "rgba(255,255,255,0.1)",
  },

  dividerText: {
    color: "#64748b",
    fontSize: "12px",
  },

  organizationLink: {
    color: "#94a3b8",
    fontSize: "13px",
    lineHeight: 1.5,
    textDecoration: "none",
    fontWeight: 600,
  },
};
