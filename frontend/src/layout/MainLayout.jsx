import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "../styles/layout.css";

export default function MainLayout({ title, children, onLogout }) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = () => {
      if (mq.matches) setIsMobileDrawerOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleBurgerClick = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setIsCollapsed((v) => !v);
    } else {
      setIsMobileDrawerOpen(true);
    }
  };

  return (
    <div className="appShell">
      <Sidebar
        collapsed={isCollapsed}
        mobileOpen={isMobileDrawerOpen}
        onMobileClose={() => setIsMobileDrawerOpen(false)}
      />

      <div className="appMain">
        <Topbar
          title={title}
          onBurgerClick={handleBurgerClick}
          onLogout={onLogout} // ← добавили
        />

        <main className="contentArea">{children}</main>
      </div>
    </div>
  );
}
