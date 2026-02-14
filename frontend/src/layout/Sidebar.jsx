import React from "react";

const navItems = [
  { key: "home", label: "Главная", icon: "🏠" },
  { key: "passport", label: "Паспорт здоровья", icon: "🛡️" },
  { key: "docs", label: "Документы", icon: "📄" },
  { key: "metrics", label: "Дневник показателей", icon: "📈" },
  { key: "symptoms", label: "Журнал симптомов", icon: "🩺" },
  { key: "rx", label: "Цифровой рецептарий", icon: "💊" },
  { key: "compat", label: "Совместимость лекарств", icon: "🧪" },
  { key: "hospital", label: "Операции и стационар", icon: "🏥" },
  { key: "refs", label: "Справки и сроки", icon: "📌" },
  { key: "family", label: "Семейный доступ", icon: "👪" },
  { key: "doctor", label: "Доверенный врач", icon: "👨‍⚕️" },
];

export default function Sidebar({ collapsed, mobileOpen, onMobileClose }) {
  // sidebarClass:
  // - collapsed: “узкий” режим на ПК
  // - mobileOpen: активирует drawer на мобилке
  const sidebarClass = [
    "sidebar",
    collapsed ? "sidebar--collapsed" : "",
    mobileOpen ? "sidebar--mobileOpen" : "",
  ].join(" ");

  return (
    <>
      {/* Backdrop нужен только на мобилке при открытом drawer */}
      {mobileOpen && <div className="backdrop" onClick={onMobileClose} />}

      <aside className={sidebarClass} aria-label="Навигация">
        <div className="sidebarHeader">
          {/* Заголовок слева сверху */}
          <div className="sidebarTitle">
            <div className="sidebarTitleSmall">Навигация</div>
            {!collapsed && <div className="sidebarTitleBig">Разделы карты здоровья</div>}
          </div>

          {/* Кнопка закрыть (нужна на мобилке) */}
          <button className="iconBtn sidebarCloseBtn" onClick={onMobileClose} aria-label="Закрыть меню">
            ✕
          </button>
        </div>

        <nav className="navList">
          {navItems.map((item) => (
            <button
              key={item.key}
              className="navItem"
              // Тут позже можно подключить роутинг (React Router) и менять страницу
              onClick={() => {
                // На мобилке после выбора пункта — закрываем drawer
                onMobileClose?.();
              }}
            >
              <span className="navIcon" aria-hidden="true">{item.icon}</span>

              {/* Текст скрываем при collapsed */}
              {!collapsed && <span className="navLabel">{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
