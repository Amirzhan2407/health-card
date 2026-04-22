import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/layout.css";

export default function Sidebar({ open, onClose, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const go = (path) => {
    navigate(path);
    onClose?.();
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebarTitle">Навигация</div>

      <button
        className={`navItem ${isActive("/home") ? "active" : ""}`}
        type="button"
        onClick={() => go("/home")}
      >
        Главное меню
      </button>

      <button
        className={`navItem ${isActive("/documents") ? "active" : ""}`}
        type="button"
        onClick={() => go("/documents")}
      >
        Справки
      </button>

      <button
        className={`navItem ${isActive("/documents-cloud") ? "active" : ""}`}
        type="button"
        onClick={() => go("/documents-cloud")}
      >
        Облако
      </button>

      <button
        className={`navItem ${isActive("/passport") ? "active" : ""}`}
        type="button"
        onClick={() => go("/passport")}
      >
        Мед карта
      </button>
      
      
       <button
          className={`navItem ${isActive("/health") ? "active" : ""}`}
          type="button"
          onClick={() => go("/health")}
        >
          Мониторинг здоровья
        </button>

      <div className="sidebarSpacer" />

      <button
        className="navItem danger"
        type="button"
        onClick={() => {
          onLogout?.();
          onClose?.();
        }}
      >
        Выйти
      </button>
    </aside>
  );
}