import { Outlet, useNavigate, Navigate } from "react-router-dom";
import "./govClinic.css";

export default function GovClinicLayout() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("organizationUser") || "null");

  if (!user) {
    return <Navigate to="/organization-login" replace />;
  }

  const isChiefDoctor = user.role === "chief_doctor";
  const isAdmin = user.role === "organization_admin";

  function logout() {
    localStorage.removeItem("organizationUser");
    localStorage.removeItem("organizationData");
    navigate("/organization-login");
  }

  function goAdminTab(tab) {
    navigate(`/organization/gov-clinic/system-admin?tab=${tab}`);
  }

  function goChiefTab(tab) {
    navigate(`/organization/gov-clinic/chief-doctor?tab=${tab}`);
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
          {isAdmin && (
            <>
              <button onClick={() => goAdminTab("dashboard")}>Главная</button>
              <button onClick={() => goAdminTab("departments")}>
                Отделения
              </button>
              <button onClick={() => goAdminTab("employees")}>
                Сотрудники
              </button>
              <button onClick={() => goAdminTab("documents")}>
                Документы сотрудников
              </button>
            </>
          )}

          {isChiefDoctor && (
            <>
              <button onClick={() => goChiefTab("dashboard")}>Главная</button>
              <button onClick={() => goChiefTab("employees")}>
                Сотрудники
              </button>
              <button onClick={() => goChiefTab("departments")}>
                Отделения
              </button>
              <button onClick={() => goChiefTab("documents")}>Документы</button>
              <button onClick={() => goChiefTab("reports")}>Отчёты</button>
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
            <p>{user.full_name || "Пользователь организации"}</p>
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