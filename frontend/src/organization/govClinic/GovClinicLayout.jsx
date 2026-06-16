import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./govClinic.css";

export default function GovClinicLayout() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("organizationUser") || "null");

  const isChiefDoctor = user?.role === "chief_doctor";
  const isAdmin = user?.role === "organization_admin";

  function logout() {
    localStorage.removeItem("organizationUser");
    localStorage.removeItem("organizationData");
    navigate("/organization-login");
  }

  if (!user) {
    return <Navigate to="/organization-login" replace />;
  }

  return (
    <div className="gov-clinic-shell">
      <aside className="gov-clinic-sidebar">
        <div className="gov-clinic-logo">
          <h2>Clinic OS</h2>
          <p>
            {isChiefDoctor
              ? "Кабинет главного врача"
              : "Кабинет администратора"}
          </p>
        </div>

        <nav className="gov-clinic-nav">
          {isChiefDoctor && (
            <>
              <NavLink to="/organization/gov-clinic/chief-doctor">
                Главная
              </NavLink>
              <NavLink to="/organization/gov-clinic/chief-doctor">
                Сотрудники
              </NavLink>
              <NavLink to="/organization/gov-clinic/chief-doctor">
                Отделения
              </NavLink>
              <NavLink to="/organization/gov-clinic/chief-doctor">
                Документы
              </NavLink>
              <NavLink to="/organization/gov-clinic/chief-doctor">
                Отчёты
              </NavLink>
            </>
          )}

          {isAdmin && (
            <>
              <NavLink to="/organization/gov-clinic/system-admin">
                Главная
              </NavLink>
              <NavLink to="/organization/gov-clinic/system-admin">
                Отделения
              </NavLink>
              <NavLink to="/organization/gov-clinic/system-admin">
                Сотрудники
              </NavLink>
              <NavLink to="/organization/gov-clinic/system-admin">
                Документы сотрудников
              </NavLink>
            </>
          )}
        </nav>

        <button className="gov-clinic-logout-mobile" onClick={logout}>
          Выйти
        </button>
      </aside>

      <main className="gov-clinic-main">
        <header className="gov-clinic-header">
          <div>
            <h1>
              {isChiefDoctor
                ? "Кабинет главного врача"
                : "Кабинет администратора"}
            </h1>
            <p>{user?.full_name || "Пользователь организации"}</p>
          </div>

          <button className="gov-clinic-login-link" onClick={logout}>
            Выйти
          </button>
        </header>

        <section className="gov-clinic-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}