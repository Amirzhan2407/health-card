

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/organizationLogin.css";

const API_URL = "[https://health-card.onrender.com](https://health-card.onrender.com)";

export default function OrganizationLogin() {
const navigate = useNavigate();

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

```
setForm({
  ...form,
  [name]: value,
});

setError("");
```

}

function updatePasswordField(event) {
const name = event.target.name;
const value = event.target.value;

```
setPasswordForm({
  ...passwordForm,
  [name]: value,
});

setError("");
```

}

async function handleSubmit(event) {
event.preventDefault();
setError("");
setLoading(true);

```
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
```

}

async function changePassword(event) {
event.preventDefault();
setError("");

```
if (!loggedUser) {
  setError("Пользователь не найден. Войдите заново.");
  return;
}

if (passwordForm.newPassword !== passwordForm.repeatPassword) {
  setError("Новые пароли не совпадают.");
  return;
}

if (passwordForm.newPassword.length < 8) {
  setError("Новый пароль должен быть минимум 8 символов.");
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
      currentPassword: passwordForm.currentPassword,
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
```

}

return (
<main className={"org-login-page " + theme}>
<button
type="button"
className="org-theme-btn"
onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
>
{theme === "dark" ? "☀️ Светлая" : "🌙 Тёмная"} </button>

```
  <section className="org-login-card">
    <div className="org-login-left">
      <img
        src="/логтип медицины.jpg"
        alt="Clinic OS"
        className="org-login-logo-img"
      />

      <h1>Clinic OS</h1>
      <p>Вход в кабинет медицинской организации</p>

      <div className="org-login-info">
        <h2>Для авторизации укажите данные</h2>
        <ul>
          <li>Город нахождения организации</li>
          <li>БИН медицинской организации</li>
          <li>Логин, выданный технической поддержкой</li>
          <li>Одноразовый или постоянный пароль</li>
        </ul>
      </div>
    </div>

    {mode === "login" ? (
      <form className="org-login-right" onSubmit={handleSubmit}>
        <h2>Вход для организации</h2>
        <p className="org-login-subtitle">
          Вход для главного врача, администратора и отдела кадров.
        </p>

        <label>
          Город
          <input
            name="city"
            value={form.city}
            onChange={updateField}
            placeholder="Например: Астана"
            required
          />
        </label>

        <label>
          БИН организации
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
          Логин
          <input
            name="login"
            value={form.login}
            onChange={updateField}
            placeholder="Введите логин"
            required
          />
        </label>

        <label>
          Пароль
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
          {loading ? "Проверка..." : "Войти"}
        </button>
      </form>
    ) : (
      <form className="org-login-right" onSubmit={changePassword}>
        <h2>Смена пароля</h2>
        <p className="org-login-subtitle">
          Это первый вход. Создайте постоянный пароль.
        </p>

        <label>
          Текущий одноразовый пароль
          <input
            type="password"
            name="currentPassword"
            value={passwordForm.currentPassword}
            onChange={updatePasswordField}
            required
          />
        </label>

        <label>
          Новый пароль
          <input
            type="password"
            name="newPassword"
            value={passwordForm.newPassword}
            onChange={updatePasswordField}
            required
          />
        </label>

        <label>
          Повторите новый пароль
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
          {loading ? "Сохранение..." : "Сменить пароль и войти"}
        </button>

        <button type="button" onClick={() => setMode("login")}>
          Назад
        </button>
      </form>
    )}
  </section>
</main>


);
}
