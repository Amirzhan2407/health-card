import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/organizationLogin.css";

export default function OrganizationLogin() {
  const navigate = useNavigate();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // временно отправляем в кабинет гос. поликлиники
    navigate("/organization/gov-clinic");
  };

  return (
    <div className="org-login-page">
      <div className="org-login-card">
        <div className="org-login-left">
          <div className="org-login-logo">
            <h1>Clinic OS</h1>
            <p>Вход для медицинских организаций</p>
          </div>

          <div className="org-login-info">
            <h2>Единая система управления медицинской организацией</h2>

            <ul>
              <li>Государственные поликлиники</li>
              <li>Государственные больницы</li>
              <li>Частные клиники</li>
              <li>Стоматологии</li>
              <li>Медицинские лаборатории</li>
            </ul>
          </div>
        </div>

        <div className="org-login-right">
          <form onSubmit={handleSubmit}>
            <h2>Авторизация</h2>

            <div className="form-group">
              <label>ИИН или логин</label>

              <input
                type="text"
                placeholder="Введите ИИН или логин"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Пароль</label>

              <input
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-btn">
              Войти
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}