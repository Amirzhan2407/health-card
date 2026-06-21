
import { useEffect } from "react";
import { Outlet, useNavigate, Navigate, useSearchParams, useLocation } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import "./govClinic.css";

export default function GovClinicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "dashboard";
  const { t } = useLanguage();

  const user = JSON.parse(
    localStorage.getItem("organizationUser") || "null"
  );

  if (!user || user.must_change_password) {
    return <Navigate to="/organization-login" replace />;
  }

  const isEmployeeRole = user?.role === "doctor";
  const isAdmin = user?.role === "organization_admin";

  useEffect(() => {
    const path = location.pathname;
    if (user?.must_change_password) {
      navigate("/organization-login", { replace: true });
      return;
    }
    if (isAdmin && !path.includes("system-admin")) {
      navigate("/organization/gov-clinic/system-admin?tab=dashboard", { replace: true });
    } else if (isEmployeeRole && !path.includes("employee")) {
      navigate("/organization/gov-clinic/employee?tab=dashboard", { replace: true });
    }
  }, [location.pathname, isAdmin, isEmployeeRole, user?.must_change_password]);

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

  function getCabinetTitle() {
    if (isAdmin) {
      return t("cabinetTitleAdmin") || "Кабинет администратора";
    }
    return t("cabinetTitleDoctor") || "Кабинет врача";
  }

  return (
    <div className="gov-clinic-shell">
      <aside className="gov-clinic-sidebar">
        <div className="gov-clinic-logo">
          <h2>Clinic OS</h2>
          <p>{getCabinetTitle()}</p>
        </div>

        <nav className="gov-clinic-nav">
          {isAdmin ? (
            <>
              <button
                type="button"
                className={currentTab === "dashboard" ? "active" : ""}
                onClick={() => goAdminTab("dashboard")}
              >
                {t("orgTab") || "Главная"}
              </button>

              <button
                type="button"
                className={currentTab === "employees" ? "active" : ""}
                onClick={() => goAdminTab("employees")}
              >
                {t("doctorsTab") || "Врачи"}
              </button>

              <button
                type="button"
                className={currentTab === "departments" ? "active" : ""}
                onClick={() => goAdminTab("departments")}
              >
                {t("deptsTab") || "Отделения и кабинеты"}
              </button>

              

              <button
                type="button"
                className={currentTab === "transfers" ? "active" : ""}
                onClick={() => goAdminTab("transfers")}
              >
                {t("transfersTab") || "Перенос записей"}
              </button>

              <button
                type="button"
                className={currentTab === "notifications" ? "active" : ""}
                onClick={() => goAdminTab("notifications")}
              >
                {t("notificationsTab") || "Уведомления"}
              </button>

              <button
                type="button"
                className={currentTab === "support" ? "active" : ""}
                onClick={() => goAdminTab("support")}
              >
                {t("supportTab") || "Чат с технической поддержкой"}
              </button>
            </>
          ) : null}

          {isEmployeeRole ? (
            <>
              <button
                type="button"
                className={currentTab === "dashboard" ? "active" : ""}
                onClick={() => goEmployeeTab("dashboard")}
              >
                {t("dashboardTab") || "Главная"}
              </button>
              <button
                type="button"
                className={currentTab === "appointments" ? "active" : ""}
                onClick={() => goEmployeeTab("appointments")}
              >
                {t("appointmentsTab") || "Записи"}
              </button>
              <button
                type="button"
                className={currentTab === "history" ? "active" : ""}
                onClick={() => goEmployeeTab("history")}
              >
                {t("historyTab") || "История посещений"}
              </button>
              <button
                type="button"
                className={currentTab === "notifications" ? "active" : ""}
                onClick={() => goEmployeeTab("notifications")}
              >
                {t("notificationsTab") || "Уведомления"}
              </button>
              <button
                type="button"
                className={currentTab === "profile" ? "active" : ""}
                onClick={() => goEmployeeTab("profile")}
              >
                {t("profileTab") || "Мой профиль"}
              </button>
            </>
          ) : null}
        </nav>

        <button
          type="button"
          className="gov-clinic-logout-mobile"
          onClick={logout}
        >
          {t("logoutButton") || "Выйти"}
        </button>
      </aside>

      <main className="gov-clinic-main">
        <header className="gov-clinic-header">
          <div>
            <h1>{getCabinetTitle()}</h1>
            <p>{user.full_name || "Пользователь организации"}</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <LanguageSwitcher />
            <button
              type="button"
              className="gov-clinic-login-link"
              onClick={logout}
            >
              {t("logoutButton") || "Выйти"}
            </button>
          </div>
        </header>

        <section className="gov-clinic-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
