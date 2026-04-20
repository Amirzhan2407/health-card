import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./layout/MainLayout";

import HomePage from "./pages/HomePage";
import Passport from "./pages/Passport";
import DocumentsPage from "./pages/DocumentsPage";
import DocumentsCloudPage from "./pages/DocumentsCloudPage";
import Search from "./pages/Search";
import Login from "./pages/Login";

export default function App() {
  return (
    <Routes>
      {/* Стартовая страница — логин */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Логин без layout */}
      <Route path="/login" element={<Login />} />

      {/* Все внутренние страницы внутри layout */}
      <Route element={<MainLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/passport" element={<Passport />} />

        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents-cloud" element={<DocumentsCloudPage />} />
        <Route path="/search" element={<Search />} />
      </Route>

      {/* Фолбэк */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}