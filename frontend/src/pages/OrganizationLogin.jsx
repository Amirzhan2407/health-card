

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "../styles/organizationLogin.css";

const API_URL = "https://health-card.onrender.com";

export default function OrganizationLogin() {
const navigate = useNavigate();
const { t } = useLanguage();

const [theme, setTheme] = useState(localStorage.getItem("orgTheme") || "light");
const [mode, setMode] = useState("login");
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);
const [loggedUser, setLoggedUser] = useState(null);
const [redirectPath, setRedirectPath] = useState("");

const [form, setForm] = useState({
city: "",
bin: "",
login: "",
password: "",
});

const [passwordForm, setPasswordForm] = useState({
currentPassword: "",
newPassword: "",
repeatPassword: "",
});

useEffect(() => {
localStorage.setItem("orgTheme", theme);
}, [theme]);

function updateField(event) {
const name = event.target.name;
const value = event.target.value;


setForm({
  ...form,
  [name]: value,
});

setError("");


}

function updatePasswordField(event) {
const name = event.target.name;
const value = event.target.value;


setPasswordForm({
  ...passwordForm,
  [name]: value,
});

setError("");


}

async function handleSubmit(event) {
event.preventDefault();
setError("");
setLoading(true);


try {
  const response = await fetch(API_URL + "/api/organizations/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      city: form.city.trim(),
      bin: form.bin.trim(),
      login: form.login.trim(),
      password: form.password,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Ошибка входа.");
  }

  localStorage.setItem("organizationUser", JSON.stringify(result.user));
  localStorage.setItem("organizationData", JSON.stringify(result.organization));
  if (result.user && result.user.preferred_language) {
    localStorage.setItem("clinic_os_language", result.user.preferred_language);
  }

  const path = result.redirectPath || "/organization/gov-clinic";

  if (result.mustChangePassword) {
    setLoggedUser(result.user);
    setRedirectPath(path);
    setPasswordForm({
      currentPassword: form.password,
      newPassword: "",
      repeatPassword: "",
    });
    setMode("change-password");
    setLoading(false);
    return;
  }

  navigate(path);
} catch (err) {
  setError(err.message || "Не удалось войти.");
} finally {
  setLoading(false);
}


}

async function changePassword(event) {
  event.preventDefault();
  setError("");

  if (!loggedUser) {
    setError("Пользователь не найден. Войдите заново.");
    return;
  }

  if (passwordForm.newPassword !== passwordForm.repeatPassword) {
    setError("Новые пароли не совпадают.");
    return;
  }

  if (passwordForm.newPassword.length < 6) {
    setError("Новый пароль должен быть минимум 6 символов.");
    return;
  }

  if (passwordForm.newPassword === form.password) {
    setError("Новый пароль не должен совпадать с временным паролем.");
    return;
  }

  if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(passwordForm.newPassword)) {
    setError("Пароль должен содержать как буквы, так и цифры.");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(API_URL + "/api/organizations/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: loggedUser.id,
        currentPassword: "",
        newPassword: passwordForm.newPassword,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Ошибка смены пароля.");
    }

    if (result.user) {
      localStorage.setItem("organizationUser", JSON.stringify(result.user));
    }

    navigate(result.redirectPath || redirectPath || "/organization/gov-clinic");
  } catch (err) {
    setError(err.message || "Не удалось сменить пароль.");
  } finally {
    setLoading(false);
  }
}

return (
<main className={"org-login-page " + theme}>
<div style={{ position: "absolute", top: "20px", right: "20px", display: "flex", gap: "12px", alignItems: "center", zIndex: 10 }}>
  <LanguageSwitcher />
  <button
    type="button"
    className="org-theme-btn"
    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    style={{ position: "static" }}
  >
    {theme === "dark" ? "☀️" : "🌙"}
  </button>
</div>

  <section className="org-login-card">
    <div className="org-login-left">
      <img
        src="/логтип медицины.jpg"
        alt="Clinic OS"
        className="org-login-logo-img"
      />

      <h1>Clinic OS</h1>
      <p>{t("orgLoginTitle")}</p>

      <div className="org-login-info">
        <h2>{t("orgLoginInstructions")}</h2>
        <ul>
          <li>{t("orgLoginCityHint")}</li>
          <li>{t("orgLoginBinHint")}</li>
          <li>{t("orgLoginLoginHint")}</li>
          <li>{t("orgLoginPasswordHint")}</li>
        </ul>
      </div>
    </div>

    {mode === "login" ? (
      <form className="org-login-right" onSubmit={handleSubmit}>
        <h2>{t("orgLoginHeading")}</h2>
        <p className="org-login-subtitle">
          {t("orgLoginSubheading")}
        </p>

        <label>
          {t("orgCityLabel")}
          <input
            name="city"
            value={form.city}
            onChange={updateField}
            placeholder="Например: Астана"
            required
          />
        </label>

        <label>
          {t("orgBinLabel")}
          <input
            name="bin"
            value={form.bin}
            onChange={updateField}
            placeholder="12 цифр"
            maxLength={12}
            required
          />
        </label>

        <label>
          {t("orgLoginLabel")}
          <input
            name="login"
            value={form.login}
            onChange={updateField}
            placeholder="Введите логин"
            required
          />
        </label>

        <label>
          {t("orgPasswordLabel")}
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={updateField}
            placeholder="Введите пароль"
            required
          />
        </label>

        {error ? <div className="org-login-error">{error}</div> : null}

        <button type="submit" disabled={loading}>
          {loading ? t("orgChecking") : t("orgLoginBtn")}
        </button>
      </form>
    ) : (
      <form className="org-login-right" onSubmit={changePassword}>
        <h2>{t("orgChangePasswordHeading")}</h2>
        <p className="org-login-subtitle">
          {t("orgFirstLoginSubheading")}
        </p>

        <label>
          {t("orgNewPasswordLabel")}
          <input
            type="password"
            name="newPassword"
            value={passwordForm.newPassword}
            onChange={updatePasswordField}
            required
          />
        </label>

        <label>
          {t("orgRepeatPasswordLabel")}
          <input
            type="password"
            name="repeatPassword"
            value={passwordForm.repeatPassword}
            onChange={updatePasswordField}
            required
          />
        </label>

        {error ? <div className="org-login-error">{error}</div> : null}

        <button type="submit" disabled={loading}>
          {loading ? t("orgSaving") : t("orgChangePasswordBtn")}
        </button>

        <button type="button" onClick={() => {
          localStorage.removeItem("organizationUser");
          localStorage.removeItem("organizationData");
          setLoggedUser(null);
          setMode("login");
        }}>
          {t("orgBackBtn")}
        </button>
      </form>
    )}
  </section>
</main>
);
}
