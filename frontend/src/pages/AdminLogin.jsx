import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/adminLogin.css";

const API_URL = "https://health-card.onrender.com";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const saveAdminAndRedirect = (data) => {
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
  };

  const checkUsername = async () => {
    setError("");

    if (!username.trim()) {
      setError("Введите название аккаунта.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/admin/check-username`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Ошибка проверки аккаунта.");
      }

      if (data.needPasswordCreate) {
        setMode("createPassword");
        setError("");
        return;
      }

      setMode("password");
      setError("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Ошибка проверки аккаунта.");
    } finally {
      setLoading(false);
    }
  };

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

      saveAdminAndRedirect(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Ошибка входа в админ-панель.");
    } finally {
      setLoading(false);
    }
  };

  const createPassword = async () => {
    setError("");

    if (!employeeNumber.trim()) {
      setError("Введите уникальный номер.");
      return;
    }

    if (!newPassword.trim()) {
      setError("Введите новый пароль.");
      return;
    }

    if (!repeatPassword.trim()) {
      setError("Повторите новый пароль.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/admin/create-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          username: username.trim(),
          employeeNumber: employeeNumber.trim(),
          password: newPassword.trim(),
          repeatPassword: repeatPassword.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось создать пароль.");
      }

      saveAdminAndRedirect(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Ошибка создания пароля.");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key !== "Enter") return;

    if (mode === "login") {
      checkUsername();
      return;
    }

    if (mode === "password") {
      loginAdmin();
      return;
    }

    if (mode === "createPassword") {
      createPassword();
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
              onChange={(e) => {
                setUsername(e.target.value);
                setMode("login");
                setPassword("");
                setEmployeeNumber("");
                setNewPassword("");
                setRepeatPassword("");
              }}
              onKeyDown={onKeyDown}
              placeholder="Например: Amir_zhan_07"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          {mode === "password" && (
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
          )}

          {mode === "createPassword" && (
            <>
              <div className="adminLoginNotice">
                У вас ещё нет пароля. Введите уникальный номер и создайте
                пароль для дальнейших входов.
              </div>

              <div className="adminLoginField">
                <label>Уникальный номер</label>
                <input
                  type="text"
                  value={employeeNumber}
                  onChange={(e) =>
                    setEmployeeNumber(e.target.value.replace(/\D/g, ""))
                  }
                  onKeyDown={onKeyDown}
                  placeholder="Например: 100001"
                />
              </div>

              <div className="adminLoginField">
                <label>Новый пароль</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Минимум 8 символов"
                />
              </div>

              <div className="adminLoginField">
                <label>Повторите пароль</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Повторите пароль"
                />
              </div>

              <button
                type="button"
                className="adminSecondaryBtn"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "Скрыть пароль" : "Показать пароль"}
              </button>
            </>
          )}

          {error && <div className="adminLoginError">{error}</div>}

          {mode === "login" && (
            <button
              type="button"
              className="adminLoginBtn"
              onClick={checkUsername}
              disabled={loading}
            >
              {loading ? "Проверка..." : "Войти"}
            </button>
          )}

          {mode === "password" && (
            <button
              type="button"
              className="adminLoginBtn"
              onClick={loginAdmin}
              disabled={loading}
            >
              {loading ? "Проверка..." : "Войти"}
            </button>
          )}

          {mode === "createPassword" && (
            <button
              type="button"
              className="adminLoginBtn"
              onClick={createPassword}
              disabled={loading}
            >
              {loading ? "Создание..." : "Создать пароль и войти"}
            </button>
          )}
        </div>

        <div className="adminLoginHint">
          Если вы новый админ, введите только логин. Система сама предложит
          создать пароль через уникальный номер.
        </div>
      </div>
    </div>
  );
}