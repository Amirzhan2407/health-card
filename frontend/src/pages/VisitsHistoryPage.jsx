import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/history.css";

const API_URL = "https://health-card.onrender.com";

export default function VisitsHistoryPage() {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const iin = userData.iin || "";

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming"); // "upcoming" | "past"
  const [selectedApp, setSelectedApp] = useState(null); // for QR modal

  useEffect(() => {
    if (!iin) {
      setError("Пользователь не авторизован или ИИН отсутствует.");
      return;
    }

    async function fetchAppointments() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_URL}/api/organization-structure/appointments/patient/${iin}`);
        const data = await res.json();
        if (res.ok) {
          setAppointments(data.appointments || []);
        } else {
          setError(data.message || "Ошибка загрузки истории посещений.");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Сетевая ошибка при загрузке истории посещений.");
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();
  }, [iin]);

  const isAppointmentUpcoming = (app) => {
    // If status indicates completion or cancellation, it's past
    if (["completed", "cancelled", "rejected"].includes(app.status)) {
      return false;
    }

    // Compare appointment date/time with current local time
    try {
      const now = new Date();
      const appDateTime = new Date(`${app.date}T${app.time}`);
      return appDateTime >= now;
    } catch (e) {
      return true;
    }
  };

  // Group appointments
  const upcomingApps = appointments.filter(isAppointmentUpcoming);
  const pastApps = appointments.filter(app => !isAppointmentUpcoming(app));

  const displayedApps = activeTab === "upcoming" ? upcomingApps : pastApps;

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "Ожидает подтверждения";
      case "approved":
        return "Подтверждено";
      case "completed":
        return "Прием завершен";
      case "cancelled":
        return "Отменено";
      case "rejected":
        return "Отклонено";
      default:
        return "В обработке";
    }
  };

  const getStatusClass = (status) => {
    if (status === "pending") return "pending";
    if (status === "approved") return "approved";
    if (status === "completed") return "completed";
    if (status === "cancelled" || status === "rejected") return "cancelled";
    return "";
  };

  return (
    <div className="historyPage">
      <div className="historyHeader">
        <div>
          <h1 className="historyTitle">История посещений</h1>
          <p className="historySub">
            Ваши записи на прием, направления и электронные талоны
          </p>
        </div>
        <button
          className="historyAddBtn"
          onClick={() => navigate("/book-appointment")}
        >
          ➕ Записаться к врачу
        </button>
      </div>

      {error && <div className="errorBanner">{error}</div>}

      {/* TABS */}
      <div className="visitsTabs">
        <button
          className={`visitTabBtn ${activeTab === "upcoming" ? "active" : ""}`}
          onClick={() => setActiveTab("upcoming")}
        >
          Предстоящие ({upcomingApps.length})
        </button>
        <button
          className={`visitTabBtn ${activeTab === "past" ? "active" : ""}`}
          onClick={() => setActiveTab("past")}
        >
          Прошедшие и отмененные ({pastApps.length})
        </button>
      </div>

      {loading ? (
        <div className="historyEmpty">
          <div className="spinner" />
          <p style={{ marginTop: "12px" }}>Загрузка ваших посещений...</p>
        </div>
      ) : displayedApps.length === 0 ? (
        <div className="historyEmpty">
          <p>
            {activeTab === "upcoming"
              ? "У вас нет активных записей к врачу."
              : "История посещений пуста."}
          </p>
        </div>
      ) : (
        <div className="visitGrid">
          {displayedApps.map((app) => (
            <div key={app.id} className="visitCard">
              <div>
                <div className="visitCardHeader">
                  <div className="visitOrgName">{app.organization_name}</div>
                  <span className={`visitStatusBadge ${getStatusClass(app.status)}`}>
                    {getStatusLabel(app.status)}
                  </span>
                </div>

                <div className="visitBody">
                  <div className="visitDoctorInfo">
                    <div className="visitDocName">{app.doctor_name}</div>
                    <div className="visitDocPos">{app.doctor_position}</div>
                  </div>

                  <div className="visitDetails">
                    <div className="visitDetailItem">
                      <span className="visitDetailIcon">📅</span>
                      <span>{formatDate(app.date)}</span>
                    </div>
                    <div className="visitDetailItem">
                      <span className="visitDetailIcon">🕒</span>
                      <span>{app.time}</span>
                    </div>
                    <div className="visitDetailItem">
                      <span className="visitDetailIcon">🚪</span>
                      <span>Кабинет №{app.cabinet}</span>
                    </div>
                  </div>

                  {app.verification_code && (app.status === "pending" || app.status === "approved") && (
                    <div style={{ marginTop: '12px', padding: '8px 12px', background: '#fef08a', borderRadius: '8px', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <span className="visitDetailIcon" style={{ fontSize: '16px' }}>🔑</span>
                      <span>Код приёма: <b style={{ fontSize: '16px' }}>{app.verification_code}</b></span>
                    </div>
                  )}

                  {app.reason && (
                    <div className="visitReason">
                      <strong>Причина:</strong> {app.reason}
                    </div>
                  )}

                  {app.comment && (
                    <div className="visitReason" style={{ marginTop: "8px" }}>
                      <strong>Комментарий клиники:</strong> {app.comment}
                    </div>
                  )}
                </div>
              </div>

              <div className="visitFooter">
                <button
                  type="button"
                  className="visitTicketBtn"
                  onClick={() => setSelectedApp(app)}
                >
                  🎫 Показать талон
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR CODE MODAL VOUCHER */}
      {selectedApp && (
        <div
          className="ticketModalOverlay"
          onClick={() => setSelectedApp(null)}
        >
          <div
            className="ticketModal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="ticketCloseBtn"
              onClick={() => setSelectedApp(null)}
              aria-label="Закрыть"
            >
              ✕
            </button>

            <div className="ticketHeader">
              <h3 className="ticketHeaderTitle">ЭЛЕКТРОННЫЙ ТАЛОН</h3>
              <div className="ticketHeaderSub">Медицинская система Clinic OS</div>
            </div>

            <div className="ticketContent">
              <div className="ticketDetailsList">
                <div className="ticketDetailRow">
                  <span className="ticketLabel">Пациент:</span>
                  <span className="ticketVal">{selectedApp.patient_name}</span>
                </div>
                <div className="ticketDetailRow">
                  <span className="ticketLabel">ИИН:</span>
                  <span className="ticketVal">{selectedApp.patient_iin}</span>
                </div>
                <div className="ticketDetailRow">
                  <span className="ticketLabel">Учреждение:</span>
                  <span className="ticketVal">{selectedApp.organization_name}</span>
                </div>
                <div className="ticketDetailRow">
                  <span className="ticketLabel">Специалист:</span>
                  <span className="ticketVal">{selectedApp.doctor_name}</span>
                </div>
                <div className="ticketDetailRow">
                  <span className="ticketLabel">Дата и время:</span>
                  <span className="ticketVal" style={{ color: "#00a550", fontWeight: "900" }}>
                    {formatDate(selectedApp.date)} в {selectedApp.time}
                  </span>
                </div>
                <div className="ticketDetailRow">
                  <span className="ticketLabel">Кабинет:</span>
                  <span className="ticketVal" style={{ fontSize: "16px", color: "#00a550" }}>
                    №{selectedApp.cabinet}
                  </span>
                </div>
                {selectedApp.verification_code && (
                  <div className="ticketDetailRow" style={{ background: '#fef08a', padding: '8px 12px', borderRadius: '8px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="ticketLabel" style={{ color: '#854d0e', fontWeight: 'bold' }}>Код подтверждения:</span>
                    <span className="ticketVal" style={{ color: '#854d0e', fontSize: '18px', fontWeight: 'bold' }}>{selectedApp.verification_code}</span>
                  </div>
                )}
              </div>

              <div className="ticketQrContainer">
                <img
                  className="ticketQrImg"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ClinicOS_Appointment_${selectedApp.id}`}
                  alt="QR-код талона"
                />
              </div>

              <div className="ticketQrHelp">
                Предъявите данный QR-код на терминале регистрации или врачу при входе
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
