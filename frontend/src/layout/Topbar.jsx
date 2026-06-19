import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/layout.css";

export default function Topbar({ theme, setTheme, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { title: "Главная", path: "/home" },
    { title: "Запись к врачу", path: "/book-appointment" },
    { title: "Справки", path: "/documents" },
    { title: "История болезни", path: "/documents-cloud" },
    { title: "ИИ помощник", path: "/ai-assistant" },
    { title: "Мониторинг", path: "/health" },
  ];

  const isActive = (path) => location.pathname === path;

  const go = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <>
      <header className="topbar">
        <div className="topbarLogo" onClick={() => navigate("/passport")}>
          <img src="/логтип медицины.jpg" alt="МедКарта" />
          <b>МедКарта</b>
        </div>

        <nav className="topbarNav">
          {links.map((link) => (
            <button
              key={link.path}
              type="button"
              className={`topNavItem ${isActive(link.path) ? "active" : ""}`}
              onClick={() => go(link.path)}
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

        <button
          type="button"
          className="mobileMenuBtn"
          onClick={() => setMobileOpen(true)}
        >
          ☰
        </button>
      </header>

      <div
        className={`mobileBackdrop ${mobileOpen ? "show" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`mobileSidebar ${mobileOpen ? "open" : ""}`}>
        <div className="mobileSidebarTop">
          <div className="topbarLogo" onClick={() => go("/passport")}>
            <img src="/логтип медицины.jpg" alt="МедКарта" />
            <b>МедКарта</b>
          </div>

          <button type="button" onClick={() => setMobileOpen(false)}>
            ✕
          </button>
        </div>

        {links.map((link) => (
          <button
            key={link.path}
            type="button"
            className={`mobileNavItem ${isActive(link.path) ? "active" : ""}`}
            onClick={() => go(link.path)}
          >
            {link.title}
          </button>
        ))}

        <button
          type="button"
          className="mobileNavItem"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? "☀ Светлая" : "🌙 Тёмная"}
        </button>

        <button type="button" className="mobileNavItem danger" onClick={onLogout}>
          Выйти
        </button>
      </aside>
    </>
  );
}