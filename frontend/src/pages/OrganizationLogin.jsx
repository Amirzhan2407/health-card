import { useEffect, useState } from "react";
import "../styles/organizationLogin.css";

export default function OrganizationLogin() {
  const [theme, setTheme] = useState(localStorage.getItem("orgTheme") || "light");

  const [form, setForm] = useState({
    city: "",
    bin: "",
    login: "",
    password: "",
  });

  useEffect(() => {
    localStorage.setItem("orgTheme", theme);
  }, [theme]);

  function updateField(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    console.log("Organization login:", form);
  }

  return (
    <main className={`org-login-page ${theme === "dark" ? "dark" : "light"}`}>
      <button
        type="button"
        className="org-theme-btn"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? "☀️ Светлая" : "🌙 Тёмная"}
      </button>

      <section className="org-login-card">
        <div className="org-login-left">
          <img
            src="/логтип медицины.jpg"
            alt="Clinic OS"
            className="org-login-logo-img"
          />

          <h1>Clinic OS</h1>
          <p>Вход в кабинет государственной поликлиники</p>

          <div className="org-login-info">
            <h2>Для авторизации укажите данные</h2>
            <ul>
              <li>Город нахождения поликлиники</li>
              <li>БИН государственной поликлиники</li>
              <li>Логин, выданный технической поддержкой</li>
              <li>Одноразовый или постоянный пароль</li>
            </ul>
          </div>
        </div>

        <form className="org-login-right" onSubmit={handleSubmit}>
          

          <h2>Вход для организации</h2>
          <p className="org-login-subtitle">
            Авторизация главного врача и администраторов поликлиники.
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

          <button type="submit">Войти</button>
        </form>
      </section>
    </main>
  );
}