import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/layout.css";

export default function Topbar({ theme, setTheme, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { title: "Главная", path: "/home" },
    { title: "Справки", path: "/documents" },
    { title: "История болезни", path: "/documents-cloud" },
    { title: "Мед карта", path: "/passport" },
    { title: "ИИ помощник", path: "/ai-assistant" },
    { title: "Мониторинг", path: "/health" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="topbar">
      <div className="topbarLogo" onClick={() => navigate("/home")}>
        <img src="/логтип медицины.jpg" alt="МедКарта" />
        <b>МедКарта</b>
      </div>

      <nav className="topbarNav">
        {links.map((link) => (
          <button
            key={link.path}
            type="button"
            className={`topNavItem ${isActive(link.path) ? "active" : ""}`}
            onClick={() => navigate(link.path)}
          >
            {link.title}
          </button>
        ))}
      </nav>

      <div className="topbarActions">
        <button
          type="button"
          className="themeBtn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? "☀ Светлая" : "🌙 Тёмная"}
        </button>

        <button type="button" className="logoutBtn" onClick={onLogout}>
          Выйти
        </button>
      </div>
    </header>
  );
}