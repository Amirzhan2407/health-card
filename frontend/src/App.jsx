import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./layout/MainLayout";

import HomePage from "./pages/HomePage";
import Passport from "./pages/Passport";
import DocumentsPage from "./pages/DocumentsPage";
import DocumentsCloudPage from "./pages/DocumentsCloudPage";
import Search from "./pages/Search";
import Login from "./pages/Login";
import HealthPage from "./pages/HealthPage";
import AiAssistantPage from "./pages/AiAssistantPage";
import AdminLogin from "./pages/AdminLogin";

export default function App() {
  return (
    <Routes>
      {/* Стартовая страница */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Вход техподдержки сайта */}
      <Route path="/admin" element={<AdminLogin />} />

      {/* Обычный вход пациента / врача */}
      <Route path="/login" element={<Login />} />

      {/* Все основные страницы внутри layout */}
      <Route element={<MainLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/passport" element={<Passport />} />

        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents-cloud" element={<DocumentsCloudPage />} />

        <Route path="/search" element={<Search />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/ai-assistant" element={<AiAssistantPage />} />
      </Route>

      {/* Если страница не найдена */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}