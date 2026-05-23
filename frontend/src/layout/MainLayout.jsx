import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Topbar from "./Topbar";
import "../styles/layout.css";

export default function MainLayout() {
  const [theme, setTheme] = useState("light");
  const navigate = useNavigate();

  const onLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("auth");
    localStorage.removeItem("userData");
    navigate("/login", { replace: true });
  };

  return (
    <div className={`layoutRoot ${theme === "dark" ? "dark" : "light"}`}>
      <Topbar theme={theme} setTheme={setTheme} onLogout={onLogout} />

      <main className="layoutContent">
        <Outlet />
      </main>
    </div>
  );
}