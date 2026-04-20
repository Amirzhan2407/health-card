import React, { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "../styles/layout.css";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const title = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/home")) return "Главное меню";
    if (p.startsWith("/passport")) return "Мед карта";
    if (p.startsWith("/documents-cloud")) return "Облако документов";
    if (p.startsWith("/documents")) return "Справки";
    if (p.startsWith("/search")) return "Поиск";
    return "МедКарта";
  }, [location.pathname]);

  const onLogout = () => {
    // если у тебя есть authStorage — тут можно вызвать его вместо localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("auth");
    navigate("/login", { replace: true });
  };

  return (
    <div className="layoutRoot">
      <Topbar
        title={title}
        onBurgerClick={() => setSidebarOpen((v) => !v)}
        onLogout={onLogout}
      />

      <div className="layoutBody">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={onLogout}
        />

        {/* затемнение для мобилки */}
        <div
          className={`backdrop ${sidebarOpen ? "show" : ""}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />

        <main className="layoutContent">
          <Outlet />
        </main>
      </div>
    </div>
  );
}