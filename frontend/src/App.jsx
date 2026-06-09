import { Routes, Route, Navigate } from "react-router-dom";

import { LanguageProvider } from "./i18n/LanguageContext";

import MainLayout from "./layout/MainLayout";

import HomePage from "./pages/HomePage";
import Search from "./pages/Search";
import HealthPage from "./pages/HealthPage";
import DocumentsPage from "./pages/DocumentsPage";
import DocumentsCloudPage from "./pages/DocumentsCloudPage";
import AiAssistantPage from "./pages/AiAssistantPage";
import Login from "./pages/Login";
import Passport from "./pages/Passport";
import OrganizationApplication from "./pages/OrganizationApplication";

import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./pages/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminStaff from "./pages/AdminStaff";
import AdminApplications from "./pages/AdminApplications";
import AdminOrganizations from "./pages/AdminOrganizations";
import AdminChannels from "./pages/AdminChannels";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import AdminRoles from "./pages/AdminRoles";

function App() {
  return (
    <LanguageProvider>
      <Routes>
        {/* Страница входа без верхней навигации */}
        <Route path="/login" element={<Login />} />

        {/* Основная клиентская часть с навигацией */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="search" element={<Search />} />
          <Route path="health" element={<HealthPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="documents-cloud" element={<DocumentsCloudPage />} />
          <Route path="my-documents" element={<DocumentsPage />} />
          <Route path="ai-assistant" element={<AiAssistantPage />} />
          <Route path="passport" element={<Passport />} />
          <Route
            path="organization-application"
            element={<OrganizationApplication />}
          />
        </Route>

        {/* Админ вход */}
        <Route path="/admin" element={<AdminLogin />} />

        {/* Админ панель */}
        <Route path="/admin-panel" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="staff" element={<AdminStaff />} />
          <Route path="applications" element={<AdminApplications />} />
          <Route path="orgs" element={<AdminOrganizations />} />
          <Route path="channels" element={<AdminChannels />} />
          <Route path="logs" element={<AdminAuditLogs />} />
          <Route path="roles" element={<AdminRoles />} />
        </Route>

        <Route
          path="/admin-panel/organizations"
          element={<Navigate to="/admin-panel/orgs" replace />}
        />

        <Route
          path="/admin-panel/orgs-old"
          element={<Navigate to="/admin-panel/orgs" replace />}
        />

        <Route
          path="/admin-panel/applications-old"
          element={<Navigate to="/admin-panel/applications" replace />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LanguageProvider>
  );
}

export default App;