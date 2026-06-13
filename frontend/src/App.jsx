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

import OrganizationLogin from "./pages/OrganizationLogin";

import GovClinicLayout from "./organization/govClinic/GovClinicLayout";
import GovClinicDashboard from "./organization/govClinic/GovClinicDashboard";
import GovClinicChiefDoctor from "./organization/govClinic/GovClinicChiefDoctor";
import GovClinicDeputyChief from "./organization/govClinic/GovClinicDeputyChief";
import GovClinicHR from "./organization/govClinic/GovClinicHR";
import GovClinicAccounting from "./organization/govClinic/GovClinicAccounting";
import GovClinicDepartmentHead from "./organization/govClinic/GovClinicDepartmentHead";
import GovClinicSystemAdmin from "./organization/govClinic/GovClinicSystemAdmin";
import GovClinicDoctor from "./organization/govClinic/GovClinicDoctor";

function App() {
  return (
    <LanguageProvider>
      <Routes>
        {/* Отдельные страницы без клиентской навигации */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/organization-application"
          element={<OrganizationApplication />}
        />
        <Route path="/organization-login" element={<OrganizationLogin />} />

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

        {/* Кабинет государственной поликлиники */}
        <Route path="/organization/gov-clinic" element={<GovClinicLayout />}>
          <Route index element={<GovClinicDashboard />} />
          <Route path="chief-doctor" element={<GovClinicChiefDoctor />} />
          <Route path="deputy-chief" element={<GovClinicDeputyChief />} />
          <Route path="hr" element={<GovClinicHR />} />
          <Route path="accounting" element={<GovClinicAccounting />} />
          <Route path="department-head" element={<GovClinicDepartmentHead />} />
          <Route path="system-admin" element={<GovClinicSystemAdmin />} />
          <Route path="doctor" element={<GovClinicDoctor />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LanguageProvider>
  );
}

export default App;