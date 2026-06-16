import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./govClinic.css";

export default function GovClinicLayout() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("organizationUser");
    localStorage.removeItem("organizationData");
    navigate("/organization-login");
  }

  return (
    <div className="gov-clinic-shell">
      <aside className="gov-clinic-sidebar">
        <div className="gov-clinic-logo">
          <h2>Clinic OS</h2>
          <p>Государственная поликлиника</p>
        </div>

        <nav className="gov-clinic-nav">
          <NavLink end to="/organization/gov-clinic">
            Главная
          </NavLink>

          <NavLink to="/organization/gov-clinic/chief-doctor">
            Главный врач
          </NavLink>

          <NavLink to="/organization/gov-clinic/system-admin">
            Администратор
          </NavLink>
        </nav>

        <button className="gov-clinic-logout-mobile" onClick={logout}>
          Выйти
        </button>
      </aside>

      <main className="gov-clinic-main">
        <header className="gov-clinic-header">
          <div>
            <h1>Кабинет организации</h1>
            <p>Управление государственной поликлиникой</p>
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