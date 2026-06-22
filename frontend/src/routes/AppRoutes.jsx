import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Layouts
import DashboardLayout from "../layouts/DashboardLayout";

// Auth Pages
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

// Patient Pages
import PatientDashboard from "../pages/patient/Dashboard";
import Booking from "../pages/patient/Booking";
import Metrics from "../pages/patient/Metrics";
import AIAdvisor from "../pages/patient/AIAdvisor";
import Medicines from "../pages/patient/Medicines";
import Visits from "../pages/patient/Visits";
import Certificates from "../pages/patient/Certificates";
import PatientNotifications from "../pages/patient/Notifications";

// Doctor Pages
import DoctorDashboard from "../pages/doctor/Dashboard";
import VisitEditor from "../pages/doctor/VisitEditor";
import PatientCard from "../pages/doctor/PatientCard";
import DoctorNotifications from "../pages/doctor/Notifications";

// Org Admin Pages
import OrgAdminDashboard from "../pages/organization-admin/Dashboard";
import Schedules from "../pages/organization-admin/Schedules";
import Transfers from "../pages/organization-admin/Transfers";
import Departments from "../pages/organization-admin/Departments";
import OrgAdminNotifications from "../pages/organization-admin/Notifications";

// Support Pages
import SupportDashboard from "../pages/support/Dashboard";
import Conversations from "../pages/support/Conversations";
import SupportNotifications from "../pages/support/Notifications";

// Icons
import {
  RiHome4Line,
  RiCalendarCheckLine,
  RiHeartPulseLine,
  RiRobotLine,
  RiCapsuleLine,
  RiFileHistoryLine,
  RiFilePaperLine,
  RiNotificationLine,
  RiCalendarEventLine,
  RiFileEditLine,
  RiUserSearchLine,
  RiTeamLine,
  RiCalendar2Line,
  RiSwapLine,
  RiBuildingLine,
  RiFileListLine,
  RiQuestionAnswerLine,
} from "react-icons/ri";

export default function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Загрузка Clinic OS...</p>
      </div>
    );
  }

  // Root redirect helper based on roles
  const getRootRedirect = () => {
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === "patient") return <Navigate to="/patient" replace />;
    if (user.role === "doctor") return <Navigate to="/doctor" replace />;
    if (user.role === "organization_admin") return <Navigate to="/org-admin" replace />;
    if (user.role === "support") return <Navigate to="/support" replace />;
    return <Navigate to="/login" replace />;
  };

  // Sidebar Links config per role
  const patientLinks = [
    { label: "Главная", path: "/patient", icon: <RiHome4Line /> },
    { label: "Запись к врачу", path: "/patient/booking", icon: <RiCalendarCheckLine /> },
    { label: "Показатели здоровья", path: "/patient/metrics", icon: <RiHeartPulseLine /> },
    { label: "История приемов", path: "/patient/visits", icon: <RiFileHistoryLine /> },
    { label: "Справки", path: "/patient/certificates", icon: <RiFilePaperLine /> },
    { label: "AI Консультант", path: "/patient/ai", icon: <RiRobotLine /> },
    { label: "Поиск лекарств", path: "/patient/medicines", icon: <RiCapsuleLine /> },
    { label: "Уведомления", path: "/patient/notifications", icon: <RiNotificationLine /> },
  ];

  const doctorLinks = [
    { label: "Календарь приемов", path: "/doctor", icon: <RiCalendarEventLine /> },
    { label: "Медицинские карты", path: "/doctor/patient-card", icon: <RiUserSearchLine /> },
    { label: "Уведомления", path: "/doctor/notifications", icon: <RiNotificationLine /> },
  ];

  const orgAdminLinks = [
    { label: "Врачи клиники", path: "/org-admin", icon: <RiTeamLine /> },
    { label: "Расписание смен", path: "/org-admin/schedules", icon: <RiCalendar2Line /> },
    { label: "Перенос приемов", path: "/org-admin/transfers", icon: <RiSwapLine /> },
    { label: "Отделения клиники", path: "/org-admin/departments", icon: <RiBuildingLine /> },
    { label: "Уведомления", path: "/org-admin/notifications", icon: <RiNotificationLine /> },
  ];

  const supportLinks = [
    { label: "Заявки клиник", path: "/support", icon: <RiFileListLine /> },
    { label: "Техподдержка", path: "/support/conversations", icon: <RiQuestionAnswerLine /> },
    { label: "Уведомления", path: "/support/notifications", icon: <RiNotificationLine /> },
  ];

  return (
    <Routes>
      {/* Public Auth routes */}
      <Route path="/login" element={!user ? <Login /> : getRootRedirect()} />
      <Route path="/register" element={!user ? <Register /> : getRootRedirect()} />

      {/* Patient Cabinet */}
      <Route
        path="/patient"
        element={user && user.role === "patient" ? <DashboardLayout links={patientLinks} /> : <Navigate to="/login" replace />}
      >
        <Route index element={<PatientDashboard />} />
        <Route path="booking" element={<Booking />} />
        <Route path="metrics" element={<Metrics />} />
        <Route path="ai" element={<AIAdvisor />} />
        <Route path="medicines" element={<Medicines />} />
        <Route path="visits" element={<Visits />} />
        <Route path="certificates" element={<Certificates />} />
        <Route path="notifications" element={<PatientNotifications />} />
      </Route>

      {/* Doctor Cabinet */}
      <Route
        path="/doctor"
        element={user && user.role === "doctor" ? <DashboardLayout links={doctorLinks} /> : <Navigate to="/login" replace />}
      >
        <Route index element={<DoctorDashboard />} />
        <Route path="visit" element={<VisitEditor />} />
        <Route path="patient-card" element={<PatientCard />} />
        <Route path="notifications" element={<DoctorNotifications />} />
      </Route>

      {/* Org Admin Cabinet */}
      <Route
        path="/org-admin"
        element={user && user.role === "organization_admin" ? <DashboardLayout links={orgAdminLinks} /> : <Navigate to="/login" replace />}
      >
        <Route index element={<OrgAdminDashboard />} />
        <Route path="schedules" element={<Schedules />} />
        <Route path="transfers" element={<Transfers />} />
        <Route path="departments" element={<Departments />} />
        <Route path="notifications" element={<OrgAdminNotifications />} />
      </Route>

      {/* Support Cabinet */}
      <Route
        path="/support"
        element={user && user.role === "support" ? <DashboardLayout links={supportLinks} /> : <Navigate to="/login" replace />}
      >
        <Route index element={<SupportDashboard />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="notifications" element={<SupportNotifications />} />
      </Route>

      {/* Fallback root route redirect */}
      <Route path="/" element={getRootRedirect()} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const styles = {
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    color: "#fff",
    fontFamily: "'Outfit', sans-serif",
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "3px solid rgba(255, 255, 255, 0.1)",
    borderTop: "3px solid #6366f1",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "16px",
  },
  loadingText: {
    fontSize: "16px",
    color: "#94a3b8",
  },
};
