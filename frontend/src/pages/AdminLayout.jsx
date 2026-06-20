import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "../styles/adminLayout.css";
import AdminChannelNotifier from "../components/AdminChannelNotifier";

const allNavItems = [
  {
    to: "/admin-panel",
    label: "Статистика",
    roles: ["super_admin", "site_support", "support_admin"],
  },
  {
    to: "/admin-panel/staff",
    label: "Админы",
    roles: ["super_admin", "site_support", "support_admin"],
  },
  {
    to: "/admin-panel/applications",
    label: "Заявления",
    roles: ["super_admin", "site_support", "support_admin"],
  },
  {
    to: "/admin-panel/organizations",
    label: "Организации",
    roles: ["super_admin", "site_support", "support_admin"],
  },
  {
    to: "/admin-panel/channels",
    label: "Каналы",
    roles: ["super_admin", "site_support", "support_admin"],
  },
  {
    to: "/admin-panel/logs",
    label: "Журнал",
    roles: ["super_admin", "site_support", "support_admin"],
  },
];

function roleLabel(role) {
  return "Сотрудник техподдержки";
}

function getAdminName(adminData) {
  return (
    adminData?.fullName ||
    adminData?.full_name ||
    adminData?.name ||
    adminData?.fio ||
    adminData?.username ||
    "Админ"
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();

  const adminData = JSON.parse(localStorage.getItem("adminData") || "null");

  if (!adminData) {
    navigate("/admin");
    return null;
  }

  const adminRole = adminData.role;

  const navItems = allNavItems.filter((item) =>
    item.roles.includes(adminRole)
  );

  function logout() {
    localStorage.removeItem("adminData");
    navigate("/admin");
  }

  return (
    <div className="adminShell">
      <AdminChannelNotifier />

      <aside className="adminSidebar">
        <div className="adminLogoBlock">
          <div className="adminLogoCircle">
            {getAdminName(adminData).slice(0, 1).toUpperCase()}
          </div>

          <div>
            <b>MedCard Admin</b>
            <span>Техподдержка сайта</span>
          </div>
        </div>

        <nav className="adminNav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin-panel"}
              className={({ isActive }) =>
                isActive ? "adminNavItem active" : "adminNavItem"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="adminSidebarProfile">
          <span>Вы вошли как</span>
          <b>{getAdminName(adminData)}</b>
          <small>{roleLabel(adminData.role)}</small>
        </div>

        <button type="button" className="adminSidebarLogout" onClick={logout}>
          Выйти
        </button>
      </aside>

      <main className="adminMain">
        <Outlet />
      </main>
    </div>
  );
}