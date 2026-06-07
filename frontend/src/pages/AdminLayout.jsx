import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "../styles/adminLayout.css";

const allNavItems = [
  {
    to: "/admin-panel",
    label: "Главная",
    roles: ["super_admin", "site_support"],
  },
  {
    to: "/admin-panel/staff",
    label: "Админы",
    roles: ["super_admin"],
  },
  {
    to: "/admin-panel/applications",
    label: "Заявления",
    roles: ["super_admin", "site_support"],
  },
  {
    to: "/admin-panel/orgs",
    label: "Организации",
    roles: ["super_admin", "site_support"],
  },
  {
    to: "/admin-panel/channels",
    label: "Каналы",
    roles: ["super_admin", "site_support"],
  },
  {
    to: "/admin-panel/logs",
    label: "Журнал",
    roles: ["super_admin", "site_support"],
  },
  {
    to: "/admin-panel/roles",
    label: "Роли и права",
    roles: ["super_admin"],
  },
];

function roleLabel(role) {
  if (role === "super_admin") return "Главный админ";
  if (role === "site_support") return "Обычный админ";
  return "Админ";
}

export default function AdminLayout() {
  const navigate = useNavigate();

  const adminData = JSON.parse(localStorage.getItem("adminData") || "null");

  if (!adminData) {
    navigate("/admin");
    return null;
  }

  const navItems = allNavItems.filter((item) =>
    item.roles.includes(adminData.role)
  );

  const logout = () => {
    localStorage.removeItem("adminData");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    navigate("/admin");
  };

  return (
    <div className="adminShell">
      <aside className="adminSidebar">
        <div className="adminLogoBlock">
          <div className="adminLogoCircle">
            {(adminData.fullName || adminData.username || "A")
              .charAt(0)
              .toUpperCase()}
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
          <b>{adminData.fullName || adminData.username || "Админ"}</b>
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