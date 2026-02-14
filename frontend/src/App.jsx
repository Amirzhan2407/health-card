import React, { useEffect, useState } from "react";
import MainLayout from "./layout/MainLayout";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";

import { getAuth, setAuth, clearAuth } from "./services/authStorage";

export default function App() {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    setIsAuthed(getAuth()); // читаем сохранённый статус входа
  }, []);

  const handleLoginSuccess = () => {
    setAuth(true);        // запоминаем вход
    setIsAuthed(true);    // переключаем UI на главное меню
  };

  const handleLogout = () => {
    clearAuth();          // забываем вход
    setIsAuthed(false);   // возвращаем на страницу логина
  };

  // 🔒 Если не вошёл — показываем Login
  if (!isAuthed) {
    return <Login onSuccess={handleLoginSuccess} />;
  }

  // ✅ Если вошёл — показываем главное меню + HomePage
  return (
    <MainLayout title="Личная карта здоровья" onLogout={handleLogout}>
      <HomePage />
    </MainLayout>
  );
}
