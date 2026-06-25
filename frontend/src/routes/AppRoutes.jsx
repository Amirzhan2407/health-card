import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

// Layouts
import DashboardLayout from "../layouts/DashboardLayout";

// Auth Pages
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import OrganizationApplication from "../pages/auth/OrganizationApplication";

// Patient Pages
import PatientDashboard from "../pages/patient/Dashboard";
import Booking from "../pages/patient/Booking";
import Metrics from "../pages/patient/Metrics";
import AIAdvisor from "../pages/patient/AIAdvisor";
import Visits from "../pages/patient/Visits";
import Certificates from "../pages/patient/Certificates";
import MedicalCard from "../pages/patient/MedicalCard";
import PatientNotifications from "../pages/patient/Notifications";

// Doctor Pages
import DoctorDashboard from "../pages/doctor/DoctorDashboard";
import VisitEditor from "../pages/doctor/VisitEditor";
import PatientCard from "../pages/doctor/PatientCard";
import DoctorNotifications from "../pages/doctor/Notifications";

// Organization Admin Pages
import OrgAdminDashboard from "../pages/organization-admin/Dashboard";
import Schedules from "../pages/organization-admin/Schedules";
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
  RiFileHistoryLine,
  RiFilePaperLine,
  RiNotificationLine,
  RiCalendarEventLine,
  RiUserSearchLine,
  RiTeamLine,
  RiCalendar2Line,
  RiBuildingLine,
  RiFileListLine,
  RiQuestionAnswerLine,
  RiHealthBookLine,
} from "react-icons/ri";

export const ACTIVE_VISIT_STORAGE_KEY =
  "clinic_os_active_visit_id";

/*
 * Если врач обновил страницу или снова открыл
 * главную страницу кабинета во время приёма,
 * автоматически возвращаем его к активному приёму.
 *
 * Ключ удаляется только после окончательного
 * завершения приёма.
 */
function DoctorHomeEntry() {
  let activeVisitId = "";

  try {
    activeVisitId =
      window.localStorage.getItem(
        ACTIVE_VISIT_STORAGE_KEY
      ) || "";
  } catch (error) {
    console.error(
      "Не удалось прочитать активный приём:",
      error
    );
  }

  if (activeVisitId) {
    return (
      <Navigate
        to={`/doctor/visit?apptId=${encodeURIComponent(
          activeVisitId
        )}`}
        replace
      />
    );
  }

  return <DoctorDashboard />;
}

export default function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />

        <p style={styles.loadingText}>
          Загрузка Clinic OS...
        </p>
      </div>
    );
  }

  function getRootRedirect() {
    if (!user) {
      return (
        <Navigate
          to="/login"
          replace
        />
      );
    }

    if (user.role === "patient") {
      return (
        <Navigate
          to="/patient"
          replace
        />
      );
    }

    if (user.role === "doctor") {
      return (
        <Navigate
          to="/doctor"
          replace
        />
      );
    }

    if (
      user.role ===
      "organization_admin"
    ) {
      return (
        <Navigate
          to="/org-admin"
          replace
        />
      );
    }

    if (user.role === "support") {
      return (
        <Navigate
          to="/support"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const patientLinks = [
    {
      label: "Главная",
      path: "/patient",
      icon: <RiHome4Line />,
    },
    {
      label: "Медицинская карта",
      path: "/patient/medical-card",
      icon: <RiHealthBookLine />,
    },
    {
      label: "Запись к врачу",
      path: "/patient/booking",
      icon: <RiCalendarCheckLine />,
    },
    {
      label: "Записи",
      path: "/patient/visits",
      icon: <RiFileHistoryLine />,
    },
    {
      label: "Показатели здоровья",
      path: "/patient/metrics",
      icon: <RiHeartPulseLine />,
    },
    {
      label: "Справки",
      path: "/patient/certificates",
      icon: <RiFilePaperLine />,
    },
    {
      label: "AI Консультант",
      path: "/patient/ai",
      icon: <RiRobotLine />,
    },
    {
      label: "Уведомления",
      path: "/patient/notifications",
      icon: <RiNotificationLine />,
    },
  ];

  const doctorLinks = [
    {
      label: "Календарь приемов",
      path: "/doctor",
      icon: <RiCalendarEventLine />,
    },
    {
      label: "Медицинские карты",
      path: "/doctor/patient-card",
      icon: <RiUserSearchLine />,
    },
    {
      label: "Уведомления",
      path: "/doctor/notifications",
      icon: <RiNotificationLine />,
    },
  ];

  const orgAdminLinks = [
    {
      label: "Врачи клиники",
      path: "/org-admin",
      icon: <RiTeamLine />,
    },
    {
      label: "Расписание смен",
      path: "/org-admin/schedules",
      icon: <RiCalendar2Line />,
    },
    {
      label: "Отделения клиники",
      path: "/org-admin/departments",
      icon: <RiBuildingLine />,
    },
    {
      label: "Техническая поддержка",
      path: "/org-admin/support",
      icon: <RiQuestionAnswerLine />,
    },
    {
      label: "Уведомления",
      path: "/org-admin/notifications",
      icon: <RiNotificationLine />,
    },
  ];

  const supportLinks = [
    {
      label: "Заявки клиник",
      path: "/support",
      icon: <RiFileListLine />,
    },
    {
      label: "Техподдержка",
      path: "/support/conversations",
      icon: <RiQuestionAnswerLine />,
    },
    {
      label: "Уведомления",
      path: "/support/notifications",
      icon: <RiNotificationLine />,
    },
  ];

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          !user ? (
            <Login />
          ) : (
            getRootRedirect()
          )
        }
      />

      <Route
        path="/register"
        element={
          !user ? (
            <Register />
          ) : (
            getRootRedirect()
          )
        }
      />

      <Route
        path="/organization-application"
        element={
          !user ? (
            <OrganizationApplication />
          ) : (
            getRootRedirect()
          )
        }
      />

      {/* Patient Cabinet */}
      <Route
        path="/patient"
        element={
          user &&
          user.role === "patient" ? (
            <DashboardLayout
              links={patientLinks}
            />
          ) : (
            <Navigate
              to="/login"
              replace
            />
          )
        }
      >
        <Route
          index
          element={<PatientDashboard />}
        />

        <Route
          path="medical-card"
          element={<MedicalCard />}
        />

        <Route
          path="booking"
          element={<Booking />}
        />

        <Route
          path="visits"
          element={<Visits />}
        />

        <Route
          path="metrics"
          element={<Metrics />}
        />

        <Route
          path="certificates"
          element={<Certificates />}
        />

        <Route
          path="ai"
          element={<AIAdvisor />}
        />

        <Route
          path="notifications"
          element={
            <PatientNotifications />
          }
        />
      </Route>

      {/* Doctor Cabinet */}
      <Route
        path="/doctor"
        element={
          user &&
          user.role === "doctor" ? (
            <DashboardLayout
              links={doctorLinks}
            />
          ) : (
            <Navigate
              to="/login"
              replace
            />
          )
        }
      >
        <Route
          index
          element={<DoctorHomeEntry />}
        />

        {/*
         * Поддерживаем оба адреса:
         *
         * /doctor/visit?apptId=...
         * /doctor/visit/:appointmentId
         */}
        <Route
          path="visit"
          element={<VisitEditor />}
        />

        <Route
          path="visit/:appointmentId"
          element={<VisitEditor />}
        />

        <Route
          path="patient-card"
          element={<PatientCard />}
        />

        <Route
          path="patient-card/:patientId"
          element={<PatientCard />}
        />

        <Route
          path="notifications"
          element={
            <DoctorNotifications />
          }
        />
      </Route>

      {/* Organization Admin Cabinet */}
      <Route
        path="/org-admin"
        element={
          user &&
          user.role ===
            "organization_admin" ? (
            <DashboardLayout
              links={orgAdminLinks}
            />
          ) : (
            <Navigate
              to="/login"
              replace
            />
          )
        }
      >
        <Route
          index
          element={<OrgAdminDashboard />}
        />

        <Route
          path="schedules"
          element={<Schedules />}
        />

        <Route
          path="departments"
          element={<Departments />}
        />

        <Route
          path="support"
          element={<Conversations />}
        />

        <Route
          path="notifications"
          element={
            <OrgAdminNotifications />
          }
        />
      </Route>

      {/* Support Cabinet */}
      <Route
        path="/support"
        element={
          user &&
          user.role === "support" ? (
            <DashboardLayout
              links={supportLinks}
            />
          ) : (
            <Navigate
              to="/login"
              replace
            />
          )
        }
      >
        <Route
          index
          element={<SupportDashboard />}
        />

        <Route
          path="conversations"
          element={<Conversations />}
        />

        <Route
          path="notifications"
          element={
            <SupportNotifications />
          }
        />
      </Route>

      <Route
        path="/"
        element={getRootRedirect()}
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
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
    background:
      "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    color: "#ffffff",
    fontFamily:
      "'Outfit', sans-serif",
  },

  spinner: {
    width: "50px",
    height: "50px",
    border:
      "3px solid rgba(255, 255, 255, 0.1)",
    borderTop:
      "3px solid #6366f1",
    borderRadius: "50%",
    animation:
      "spin 1s linear infinite",
    marginBottom: "16px",
  },

  loadingText: {
    fontSize: "16px",
    color: "#94a3b8",
  },
};
