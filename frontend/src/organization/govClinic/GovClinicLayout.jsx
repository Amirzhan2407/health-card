
import { Outlet, useNavigate, Navigate } from "react-router-dom";
import "./govClinic.css";

export default function GovClinicLayout() {
const navigate = useNavigate();

const user = JSON.parse(
localStorage.getItem("organizationUser") || "null"
);

if (!user) {
return <Navigate to="/organization-login" replace />;
}

const isChiefDoctor = user.role === "chief_doctor";
const isAdmin = user.role === "organization_admin";
const isHr = user.role === "hr";

function logout() {
localStorage.removeItem("organizationUser");
localStorage.removeItem("organizationData");
localStorage.removeItem("organizationToken");
navigate("/organization-login");
}

function goAdminTab(tab) {
navigate("/organization/gov-clinic/system-admin?tab=" + tab);
}

function goChiefTab(tab) {
navigate("/organization/gov-clinic/chief-doctor?tab=" + tab);
}

function goHrTab(tab) {
navigate("/organization/gov-clinic/hr?tab=" + tab);
}

function getCabinetTitle() {
if (isChiefDoctor) {
return "Кабинет главного врача";
}

```
if (isAdmin) {
  return "Кабинет администратора организации";
}

if (isHr) {
  return "Кабинет отдела кадров";
}

return "Кабинет сотрудника организации";
```

}

return ( <div className="gov-clinic-shell"> <aside className="gov-clinic-sidebar"> <div className="gov-clinic-logo"> <h2>Clinic OS</h2> <p>{getCabinetTitle()}</p> </div>

```
    <nav className="gov-clinic-nav">
      {isAdmin ? (
        <>
          <button type="button" onClick={() => goAdminTab("dashboard")}>
            Главная
          </button>

          <button type="button" onClick={() => goAdminTab("departments")}>
            Отделения
          </button>

          <button type="button" onClick={() => goAdminTab("access")}>
            Доступы
          </button>
        </>
      ) : null}

      {isHr ? (
        <>
          <button type="button" onClick={() => goHrTab("dashboard")}>
            Главная
          </button>

          <button type="button" onClick={() => goHrTab("employees")}>
            Сотрудники
          </button>

          <button type="button" onClick={() => goHrTab("documents")}>
            Документы
          </button>
        </>
      ) : null}

      {isChiefDoctor ? (
        <>
          <button type="button" onClick={() => goChiefTab("dashboard")}>
            Главная
          </button>

          <button type="button" onClick={() => goChiefTab("employees")}>
            Сотрудники
          </button>

          <button type="button" onClick={() => goChiefTab("departments")}>
            Отделения
          </button>

          <button type="button" onClick={() => goChiefTab("reports")}>
            Отчёты
          </button>
        </>
      ) : null}
    </nav>

    <button
      type="button"
      className="gov-clinic-logout-mobile"
      onClick={logout}
    >
      Выйти
    </button>
  </aside>

  <main className="gov-clinic-main">
    <header className="gov-clinic-header">
      <div>
        <h1>{getCabinetTitle()}</h1>
        <p>{user.full_name || "Пользователь организации"}</p>
      </div>

      <button
        type="button"
        className="gov-clinic-login-link"
        onClick={logout}
      >
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
