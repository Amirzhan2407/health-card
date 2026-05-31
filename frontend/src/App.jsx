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
import AdminLayout from "./pages/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminStaff from "./pages/AdminStaff";
import AdminOrganizations from "./pages/AdminOrganizations";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import AdminRoles from "./pages/AdminRoles";
import OrganizationApplication from "./pages/OrganizationApplication";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/admin" element={<AdminLogin />} />

      <Route path="/admin-panel" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="staff" element={<AdminStaff />} />
        <Route path="orgs" element={<AdminOrganizations />} />
        <Route path="logs" element={<AdminAuditLogs />} />
        <Route path="roles" element={<AdminRoles />} />
      </Route>

      <Route path="/login" element={<Login />} />

      <Route element={<MainLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/passport" element={<Passport />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents-cloud" element={<DocumentsCloudPage />} />
        <Route path="/search" element={<Search />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/ai-assistant" element={<AiAssistantPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/home" replace />} />


      <Route
  path="/organization-application"
  element={<OrganizationApplication />}
/>
    </Routes>
  );
}