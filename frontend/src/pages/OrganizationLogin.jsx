import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/organizationLogin.css";

export default function OrganizationLogin() {
  const navigate = useNavigate();

  const [iinOrLogin, setIinOrLogin] = useState("");
  const [password, setPassword] = useState("");
  const [organizationType, setOrganizationType] = useState("gov_clinic");
  const [role, setRole] = useState("chief_doctor");
  const [error, setError] = useState("");

  const roleRoutes = {
    gov_clinic: {
      chief_doctor: "/organization/gov-clinic/chief-doctor",
      deputy_chief: "/organization/gov-clinic/deputy-chief",
      hr: "/organization/gov-clinic/hr",
      accounting: "/organization/gov-clinic/accounting",
      department_head: "/organization/gov-clinic/department-head",
      system_admin: "/organization/gov-clinic/system-admin",
      doctor: "/organization/gov-clinic/doctor",
    },
  };

  function handleLogin(e) {
    e.preventDefault();
    setError("");

    if (!iinOrLogin.trim()) {
      setError("Введите ИИН или логин.");
      return;
    }

    if (!password.trim()) {
      setError("Введите пароль.");
      return;
    }

    const targetRoute = roleRoutes?.[organizationType]?.[role];

    if (!targetRoute) {
      setError("Для выбранной роли пока не создан кабинет.");
      return;
    }

    navigate(targetRoute);
  }

  return (
    <div className="org-login-page">
      <div className="org-login-card">
        <div className="org-login-info">
          <div className="org-login-badge">Clinic OS</div>

          <h1>Вход для организаций</h1>

          <p>
            Единая авторизация для государственных поликлиник, больниц, частных
            клиник, стоматологий и медицинских лабораторий.
          </p>

          <div className="org-login-points">
            <span>Без ЭЦП на странице входа</span>
            <span>Роли сотрудников</span>
            <span>Отдельные кабинеты организаций</span>
          </div>
        </div>

        <form className="org-login-form" onSubmit={handleLogin}>
          <h2>Авторизация сотрудника</h2>

          <label>
            ИИН или логин
            <input
              type="text"
              value={iinOrLogin}
              onChange={(e) => setIinOrLogin(e.target.value)}
              placeholder="Введите ИИН или логин"
            />
          </label>

          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
            />
          </label>

          <label>
            Тип организации
            <select
              value={organizationType}
              onChange={(e) => setOrganizationType(e.target.value)}
            >
              <option value="gov_clinic">Государственная поликлиника</option>
              <option value="gov_hospital" disabled>
                Государственная больница
              </option>
              <option value="private_clinic" disabled>
                Частная клиника
              </option>
              <option value="dentistry" disabled>
                Стоматология
              </option>
              <option value="laboratory" disabled>
                Медицинская лаборатория
              </option>
            </select>
          </label>

          <label>
            Роль
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="chief_doctor">Главный врач</option>
              <option value="deputy_chief">Заместитель главного врача</option>
              <option value="hr">Отдел кадров</option>
              <option value="accounting">Бухгалтерия</option>
              <option value="department_head">Руководитель отделения</option>
              <option value="system_admin">Администратор системы</option>
              <option value="doctor">Врач</option>
            </select>
          </label>

          {error && <div className="org-login-error">{error}</div>}

          <button type="submit">Войти</button>
        </form>
      </div>
    </div>
  );
}