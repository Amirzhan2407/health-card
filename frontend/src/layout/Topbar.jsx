import React from "react";

export default function Topbar({ title, onBurgerClick, onLogout }) {
  return (
    <header className="topbar">
      <button className="iconBtn" onClick={onBurgerClick} aria-label="Меню">
        ☰
      </button>

      <div className="topbarTitle">{title}</div>

      <button
        className="iconBtn"
        onClick={() => {
          // Роль: выйти из системы и вернуться на логин
          onLogout?.();
        }}
        aria-label="Выйти"
      >
        ✕
      </button>
    </header>
  );
}
