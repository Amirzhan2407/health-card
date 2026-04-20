import React from "react";
import "../styles/layout.css";

export default function Topbar({ title, onBurgerClick, onLogout }) {
  return (
    <header className="topbar">
      <button className="iconBtn" onClick={onBurgerClick} aria-label="Меню">
        ☰
      </button>

      <div className="topbarTitle">{title}</div>

      <button className="iconBtn" onClick={onLogout} aria-label="Выйти">
        ✕
      </button>
    </header>
  );
}