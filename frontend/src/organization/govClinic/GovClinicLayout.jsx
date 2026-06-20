
import { useEffect } from "react";
import { Outlet, useNavigate, Navigate, useSearchParams, useLocation } from "react-router-dom";
import "./govClinic.css";

export default function GovClinicLayout() {
const navigate = useNavigate();
const location = useLocation();
const [searchParams] = useSearchParams();
const currentTab = searchParams.get("tab") || "dashboard";

const user = JSON.parse(
localStorage.getItem("organizationUser") || "null"
);

if (!user) {
return <Navigate to="/organization-login" replace />;
}

const isEmployeeRole = ["doctor", "nurse", "registrar", "department_head", "deputy_chief_doctor"].includes(user?.role);
const isAdmin = user?.role === "organization_admin" || user?.role === "admin" || user?.role === "hr" || (user?.role === "employee" && !isEmployeeRole);
const isChiefDoctor = false;
const isHr = false;

useEffect(() => {
  const path = location.pathname;
  if (isAdmin && !path.includes("system-admin")) {
    navigate("/organization/gov-clinic/system-admin?tab=dashboard", { replace: true });
  } else if (isEmployeeRole && !path.includes("employee")) {
    navigate("/organization/gov-clinic/employee?tab=dashboard", { replace: true });
  }
}, [location.pathname, isAdmin, isEmployeeRole]);


function logout() {
  localStorage.removeItem("organizationUser");
  localStorage.removeItem("organizationData");
  localStorage.removeItem("organizationToken");
  navigate("/organization-login");
}

function goAdminTab(tab) {
  navigate("/organization/gov-clinic/system-admin?tab=" + tab);
}

function goEmployeeTab(tab) {
  navigate("/organization/gov-clinic/employee?tab=" + tab);
}

const employeeTabs = {
  doctor: [
    { id: "dashboard", label: "Главная" },
    { id: "appointments", label: "Записи" },
    { id: "patients", label: "Пациенты" },
    { id: "medical_records", label: "Медицинская карта" },
    { id: "documents", label: "Документы" },
    { id: "notifications", label: "Уведомления" }
  ],
  nurse: [
    { id: "dashboard", label: "Главная" },
    { id: "appointments", label: "Записи" },
    { id: "patients", label: "Пациенты" },
    { id: "documents", label: "Документы" },
    { id: "notifications", label: "Уведомления" }
  ],
  registrar: [
    { id: "dashboard", label: "Главная" },
    { id: "appointments", label: "Записи" },
    { id: "patients", label: "Пациенты" },
    { id: "notifications", label: "Уведомления" }
  ],
  department_head: [
    { id: "dashboard", label: "Главная" },
    { id: "appointments", label: "Записи" },
    { id: "patients", label: "Пациенты" },
    { id: "medical_records", label: "Медицинская карта" },
    { id: "documents", label: "Документы" },
    { id: "notifications", label: "Уведомления" },
    { id: "department_staff", label: "Сотрудники отделения" }
  ],
  deputy_chief_doctor: [
    { id: "dashboard", label: "Главная" },
    { id: "appointments", label: "Записи" },
    { id: "patients", label: "Пациенты" },
    { id: "medical_records", label: "Медицинская карта" },
    { id: "documents", label: "Документы" },
    { id: "notifications", label: "Уведомления" },
    { id: "control", label: "Контроль" }
  ]
};

function getCabinetTitle() {
  if (isAdmin) {
    return "Кабинет администратора организации";
  }

  if (isEmployeeRole) {
    return "Кабинет сотрудника";
  }

  return "Кабинет сотрудника организации";
}

return ( <div className="gov-clinic-shell"> <aside className="gov-clinic-sidebar"> <div className="gov-clinic-logo"> <h2>Clinic OS</h2> <p>{getCabinetTitle()}</p> </div>


    <nav className="gov-clinic-nav">
      {isAdmin ? (
        <>
          <button
            type="button"
            className={currentTab === "dashboard" ? "active" : ""}
            onClick={() => goAdminTab("dashboard")}
          >
            Организация
          </button>

          <button
            type="button"
            className={currentTab === "departments" ? "active" : ""}
            onClick={() => goAdminTab("departments")}
          >
            Отделения
          </button>

          <button
            type="button"
            className={currentTab === "employees" || currentTab === "add" ? "active" : ""}
            onClick={() => goAdminTab("employees")}
          >
            Сотрудники
          </button>

          <button
            type="button"
            className={currentTab === "documents" ? "active" : ""}
            onClick={() => goAdminTab("documents")}
          >
            Документы
          </button>

          <button
            type="button"
            className={currentTab === "support" ? "active" : ""}
            onClick={() => goAdminTab("support")}
          >
            Поддержка
          </button>
        </>
      ) : null}

      {isEmployeeRole ? (
        <>
          {(employeeTabs[user?.role] || []).map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={currentTab === tab.id ? "active" : ""}
              onClick={() => goEmployeeTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
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
