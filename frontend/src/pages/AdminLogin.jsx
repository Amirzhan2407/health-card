import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/adminLogin.css";

const API_URL = "https://health-card.onrender.com";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loginAdmin = async () => {
    setError("");

    if (!username.trim()) {
      setError("Введите название аккаунта.");
      return;
    }

    if (!password.trim()) {
      setError("Введите пароль.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Неверные данные для входа.");
      }

      localStorage.setItem(
        "adminData",
        JSON.stringify({
          id: data.admin.id,
          username: data.admin.username,
          fullName: data.admin.fullName,
          role: data.admin.role,
          category: data.admin.category,
          token: data.token,
        })
      );

      navigate("/admin-panel");
    } catch (err) {
      console.error(err);
      setError(err.message || "Ошибка входа в админ-панель.");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      loginAdmin();
    }
  };

  return (
    <div className="adminLoginPage">
      <div className="adminLoginBgCircle one" />
      <div className="adminLoginBgCircle two" />

      <div className="adminLoginCard">
        <div className="adminLoginBadge">Служебный вход</div>

        <h1>Админ-панель</h1>

        <p>
          Вход предназначен только для техподдержки сайта. Пациенты, врачи и
          главные врачи используют отдельные страницы авторизации.
        </p>

        <div className="adminLoginForm">
          <div className="adminLoginField">
            <label>Название аккаунта</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Например: Amir_zhan_07"
              autoComplete="username"
            />
          </div>

          <div className="adminLoginField">
            <label>Пароль</label>

            <div className="adminPasswordBox">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Введите пароль"
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "Скрыть" : "Показать"}
              </button>
            </div>
          </div>

          {error && <div className="adminLoginError">{error}</div>}

          <button
            type="button"
            className="adminLoginBtn"
            onClick={loginAdmin}
            disabled={loading}
          >
            {loading ? "Проверка..." : "Войти"}
          </button>
        </div>

        <div className="adminLoginHint">
          После входа администратор сможет проверять организации по БИН,
          назначать главных врачей и управлять заявками медицинских учреждений.
        </div>
      </div>
    </div>
  );
}