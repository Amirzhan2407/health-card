import { NavLink, Outlet } from "react-router-dom";
import "./govClinic.css";

export default function GovClinicLayout() {
  return (
    <div className="gov-clinic-shell">
      <aside className="gov-clinic-sidebar">
        <div className="gov-clinic-logo">
          <h2>Clinic OS</h2>
          <p>Гос. поликлиника</p>
        </div>

        <nav className="gov-clinic-nav">
          <NavLink to="/organization/gov-clinic">Обзор</NavLink>
          <NavLink to="/organization/gov-clinic/chief-doctor">
            Главный врач
          </NavLink>
          <NavLink to="/organization/gov-clinic/deputy-chief">
            Зам. главного врача
          </NavLink>
          <NavLink to="/organization/gov-clinic/hr">Отдел кадров</NavLink>
          <NavLink to="/organization/gov-clinic/accounting">Бухгалтерия</NavLink>
          <NavLink to="/organization/gov-clinic/department-head">
            Руководитель отделения
          </NavLink>
          <NavLink to="/organization/gov-clinic/system-admin">
            Администратор
          </NavLink>
          <NavLink to="/organization/gov-clinic/doctor">Врач</NavLink>
        </nav>
      </aside>

      <main className="gov-clinic-main">
        <header className="gov-clinic-header">
          <div>
            <h1>Кабинет организации</h1>
            <p>Управление государственной поликлиникой</p>
          </div>

          <NavLink className="gov-clinic-login-link" to="/organization-login">
            Выйти
          </NavLink>
        </header>

        <section className="gov-clinic-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}