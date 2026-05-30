import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "../styles/adminLayout.css";

const navItems = [
  {
    to: "/admin-panel",
    label: "Главная",
  },
  {
    to: "/admin-panel/staff",
    label: "Админы",
  },
  {
    to: "/admin-panel/orgs",
    label: "Организации",
  },
  {
    to: "/admin-panel/logs",
    label: "Журнал",
  },
  {
    to: "/admin-panel/roles",
    label: "Роли и права",
  },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  const adminData = JSON.parse(localStorage.getItem("adminData") || "null");

  if (!adminData) {
    navigate("/admin");
    return null;
  }

  const logout = () => {
    localStorage.removeItem("adminData");
    navigate("/admin");
  };

  return (
    <div className="adminShell">
      <aside className="adminSidebar">
        <div className="adminLogoBlock">
          <div className="adminLogoCircle">A</div>

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
          <b>{adminData.fullName || "Главный админ"}</b>
          <small>{adminData.role || "super_admin"}</small>
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