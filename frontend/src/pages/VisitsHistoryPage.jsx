import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import "../styles/history.css";

const API_URL = "https://health-card.onrender.com";

const localTranslations = {
  ru: {
    title: "История посещений",
    subtitle: "Ваши записи на прием, направления и электронные талоны",
    btnBook: "➕ Записаться к врачу",
    tabUpcoming: "Предстоящие записи",
    tabPast: "Прошедшие приемы",
    tabCertificates: "Медицинские справки",
    emptyUpcoming: "У вас нет активных записей к врачу.",
    emptyPast: "История посещений пуста.",
    emptyCerts: "У вас нет выданных медицинских справок.",
    docName: "Врач",
    docPos: "Специализация",
    cabinet: "Кабинет №",
    reason: "Причина обращения",
    comment: "Комментарий клиники",
    btnTicket: "🎫 Показать талон",
    btnRate: "⭐ Оценить прием",
    rated: "Оценка выставлена",
    certTitle: "Справка",
    certDate: "Выдано",
    certDoctor: "Выдал врач",
    btnDownload: "📥 Скачать PDF",
    modalRateTitle: "Оценить качество приема",
    modalRateSubtitle: "Пожалуйста, оцените работу специалиста от 1 до 10",
    ratingValue: "Ваша оценка",
    commentLabel: "Отзыв о приеме",
    commentPlaceholder: "Опишите ваши впечатления от приема (необязательно)",
    btnSubmitRate: "Отправить оценку",
    submitting: "Отправка...",
    successRate: "Спасибо за ваш отзыв!",
    close: "Закрыть",
    ticketTitle: "ЭЛЕКТРОННЫЙ ТАЛОН",
    ticketSystem: "Медицинская система Clinic OS",
    ticketQrHelp: "Предъявите данный QR-код на терминале регистрации или врачу при входе",
    verificationCode: "Код подтверждения приёма",
  },
  kz: {
    title: "Қабылдау тарихы",
    subtitle: "Сіздің қабылдауға жазылуларыңыз, жолдамаларыңыз және электрондық талондарыңыз",
    btnBook: "➕ Дәрігерге жазылу",
    tabUpcoming: "Ағымдағы жазбалар",
    tabPast: "Өткен қабылдаулар",
    tabCertificates: "Медициналық анықтамалар",
    emptyUpcoming: "Сізде белсенді жазбалар жоқ.",
    emptyPast: "Қабылдау тарихы бос.",
    emptyCerts: "Сізде берілген медициналық анықтамалар жоқ.",
    docName: "Дәрігер",
    docPos: "Мамандығы",
    cabinet: "Кабинет №",
    reason: "Қабылдау себебі",
    comment: "Клиника түсініктемесі",
    btnTicket: "🎫 Талонды көрсету",
    btnRate: "⭐ Қабылдауды бағалау",
    rated: "Бағаланған",
    certTitle: "Анықтама",
    certDate: "Берілді",
    certDoctor: "Берген дәрігер",
    btnDownload: "📥 PDF жүктеу",
    modalRateTitle: "Қабылдау сапасын бағалау",
    modalRateSubtitle: "Маманның жұмысын 1-ден 10-ға дейін бағалаңыз",
    ratingValue: "Сіздің бағаңыз",
    commentLabel: "Қабылдау туралы пікір",
    commentPlaceholder: "Қабылдау туралы әсеріңізді сипаттаңыз (міндетті емес)",
    btnSubmitRate: "Бағаны жіберу",
    submitting: "Жіберілуде...",
    successRate: "Пікіріңіз үшін рақмет!",
    close: "Жабу",
    ticketTitle: "ЭЛЕКТРОНДЫҚ ТАЛОН",
    ticketSystem: "Clinic OS медициналық жүйесі",
    ticketQrHelp: "Кіре берісте тіркеу терминалына немесе дәрігерге осы QR-кодты көрсетіңіз",
    verificationCode: "Қабылдауды растау коды",
  },
  en: {
    title: "Visits History",
    subtitle: "Your appointments, referrals, and electronic tickets",
    btnBook: "➕ Book Appointment",
    tabUpcoming: "Upcoming Bookings",
    tabPast: "Past Appointments",
    tabCertificates: "Medical Certificates",
    emptyUpcoming: "You have no active doctor appointments.",
    emptyPast: "Visits history is empty.",
    emptyCerts: "No medical certificates issued to you.",
    docName: "Doctor",
    docPos: "Specialty",
    cabinet: "Cabinet No.",
    reason: "Reason for Visit",
    comment: "Clinic Comment",
    btnTicket: "Show Ticket",
    btnRate: "⭐ Rate Visit",
    rated: "Rated",
    certTitle: "Certificate",
    certDate: "Issued at",
    certDoctor: "Issued by",
    btnDownload: "📥 Download PDF",
    modalRateTitle: "Rate the Appointment",
    modalRateSubtitle: "Please rate the specialist's work from 1 to 10",
    ratingValue: "Your Rating",
    commentLabel: "Leave a Review",
    commentPlaceholder: "Describe your experience (optional)",
    btnSubmitRate: "Submit Rating",
    submitting: "Submitting...",
    successRate: "Thank you for your feedback!",
    close: "Close",
    ticketTitle: "ELECTRONIC TICKET",
    ticketSystem: "Clinic OS Medical System",
    ticketQrHelp: "Present this QR code at the registration desk or to the doctor upon entry",
    verificationCode: "Visit Verification Code",
  }
};

export default function VisitsHistoryPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = localTranslations[language] || localTranslations.ru;

  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const iin = userData.iin || "";

  const [appointments, setAppointments] = useState([]);
  const [certificates, setCertificates] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming"); // "upcoming" | "past" | "certificates"
  
  const [selectedApp, setSelectedApp] = useState(null); // for QR coupon modal
  
  // Rating states
  const [ratingApp, setRatingApp] = useState(null);
  const [selectedRating, setSelectedRating] = useState(10);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState("");

  const fetchAppointments = async () => {
    if (!iin) return;
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/appointments/patient/${iin}`);
      const data = await res.json();
      if (res.ok) {
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error("Fetch appointments error:", err);
    }
  };

  const fetchCertificates = async () => {
    if (!iin) return;
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/patients/${iin}/certificates`);
      const data = await res.json();
      if (res.ok) {
        setCertificates(data.certificates || []);
      }
    } catch (err) {
      console.error("Fetch certificates error:", err);
    }
  };

  useEffect(() => {
    if (!iin) {
      setError("Пользователь не авторизован или ИИН отсутствует.");
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError("");
      await Promise.all([fetchAppointments(), fetchCertificates()]);
      setLoading(false);
    };

    loadData();
  }, [iin]);

  const isAppointmentUpcoming = (app) => {
    if (["completed", "cancelled", "rejected"].includes(app.status)) {
      return false;
    }
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

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      const locale = language === "en" ? "en-US" : (language === "kz" ? "kk-KZ" : "ru-RU");
      return d.toLocaleDateString(locale, {
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
        return language === "en" ? "Pending Confirmation" : (language === "kz" ? "Растауды күтуде" : "Ожидает подтверждения");
      case "approved":
        return language === "en" ? "Confirmed" : (language === "kz" ? "Расталды" : "Подтверждено");
      case "completed":
        return language === "en" ? "Completed" : (language === "kz" ? "Аяқталды" : "Прием завершен");
      case "cancelled":
        return language === "en" ? "Cancelled" : (language === "kz" ? "Бас тартылды" : "Отменено");
      case "rejected":
        return language === "en" ? "Rejected" : (language === "kz" ? "Қабылданбады" : "Отклонено");
      default:
        return language === "en" ? "In Progress" : (language === "kz" ? "Өңделуде" : "В обработке");
    }
  };

  const getStatusClass = (status) => {
    if (status === "pending") return "pending";
    if (status === "approved") return "approved";
    if (status === "completed") return "completed";
    if (status === "cancelled" || status === "rejected") return "cancelled";
    return "";
  };

  // Submit Doctor Rating
  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (!ratingApp) return;

    setRatingLoading(true);
    setRatingSuccess("");

    try {
      const res = await fetch(`${API_URL}/api/organization-structure/appointments/${ratingApp.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating_value: selectedRating,
          comment: ratingComment
        })
      });
      const data = await res.json();

      if (res.ok) {
        setRatingSuccess(t.successRate);
        setTimeout(async () => {
          await fetchAppointments();
          setRatingApp(null);
          setRatingComment("");
          setSelectedRating(10);
          setRatingSuccess("");
        }, 1500);
      } else {
        alert(data.message || "Ошибка отправки оценки.");
      }
    } catch (err) {
      alert("Сетевая ошибка при отправке оценки.");
    } finally {
      setRatingLoading(false);
    }
  };

  return (
    <div className="historyPage">
      <div className="historyHeader">
        <div>
          <h1 className="historyTitle">{t.title}</h1>
          <p className="historySub">{t.subtitle}</p>
        </div>
        <button
          className="historyAddBtn"
          onClick={() => navigate("/book-appointment")}
        >
          {t.btnBook}
        </button>
      </div>

      {error && <div className="errorBanner">{error}</div>}

      {/* TABS */}
      <div className="visitsTabs" style={{ display: "flex", gap: "10px", marginBottom: "30px", borderBottom: "1px solid rgba(148, 163, 184, 0.15)", paddingBottom: "10px" }}>
        <button
          className={`visitTabBtn ${activeTab === "upcoming" ? "active" : ""}`}
          onClick={() => setActiveTab("upcoming")}
          style={{
            background: activeTab === "upcoming" ? "linear-gradient(135deg, #10f3df, #00b85a)" : "transparent",
            color: activeTab === "upcoming" ? "#020617" : "inherit",
            border: "none",
            padding: "10px 20px",
            borderRadius: "12px",
            fontWeight: "700",
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
        >
          {t.tabUpcoming} ({upcomingApps.length})
        </button>
        <button
          className={`visitTabBtn ${activeTab === "past" ? "active" : ""}`}
          onClick={() => setActiveTab("past")}
          style={{
            background: activeTab === "past" ? "linear-gradient(135deg, #10f3df, #00b85a)" : "transparent",
            color: activeTab === "past" ? "#020617" : "inherit",
            border: "none",
            padding: "10px 20px",
            borderRadius: "12px",
            fontWeight: "700",
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
        >
          {t.tabPast} ({pastApps.length})
        </button>
        <button
          className={`visitTabBtn ${activeTab === "certificates" ? "active" : ""}`}
          onClick={() => setActiveTab("certificates")}
          style={{
            background: activeTab === "certificates" ? "linear-gradient(135deg, #10f3df, #00b85a)" : "transparent",
            color: activeTab === "certificates" ? "#020617" : "inherit",
            border: "none",
            padding: "10px 20px",
            borderRadius: "12px",
            fontWeight: "700",
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
        >
          {t.tabCertificates} ({certificates.length})
        </button>
      </div>

      {loading ? (
        <div className="historyEmpty" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px" }}>
          <div className="spinner" />
          <p style={{ marginTop: "12px" }}>Загрузка...</p>
        </div>
      ) : activeTab === "certificates" ? (
        /* CERTIFICATES TAB */
        certificates.length === 0 ? (
          <div className="historyEmpty" style={{ padding: "40px 20px", textAlign: "center" }}>
            <p>{t.emptyCerts}</p>
          </div>
        ) : (
          <div className="visitGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
            {certificates.map((cert) => (
              <div key={cert.id} className="visitCard" style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div style={{ background: "rgba(16, 243, 223, 0.15)", color: "#10f3df", padding: "4px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "800" }}>
                      📄 {cert.certificate_type || t.certTitle}
                    </div>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>{formatDate(cert.created_at)}</span>
                  </div>
                  <h4 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "10px" }}>{cert.title}</h4>
                  <div style={{ fontSize: "14px", color: "#94a3b8", display: "flex", flexDirection: "column", gap: "4px", marginBottom: "16px" }}>
                    <span>🏛 {cert.organization?.organization_name || "Медицинская организация"}</span>
                    <span>👨‍⚕️ {t.certDoctor}: <b>{cert.doctor?.full_name || "Врач-специалист"}</b></span>
                    {cert.valid_until && (
                      <span style={{ color: "#ef4444" }}>📅 Действует до: {formatDate(cert.valid_until)}</span>
                    )}
                  </div>
                </div>
                <a
                  href={cert.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="booking-action-btn"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", background: "linear-gradient(135deg, #10f3df, #00b85a)", color: "#020617", borderRadius: "14px", padding: "10px 16px", fontWeight: "700" }}
                >
                  {t.btnDownload}
                </a>
              </div>
            ))}
          </div>
        )
      ) : displayedApps.length === 0 ? (
        /* APPOINTMENTS TAB EMPTY */
        <div className="historyEmpty" style={{ padding: "40px 20px", textAlign: "center" }}>
          <p>
            {activeTab === "upcoming" ? t.emptyUpcoming : t.emptyPast}
          </p>
        </div>
      ) : (
        /* APPOINTMENTS TAB LIST */
        <div className="visitGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "24px" }}>
          {displayedApps.map((app) => (
            <div key={app.id} className="visitCard" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div className="visitCardHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "16px" }}>
                  <div className="visitOrgName" style={{ fontWeight: "800", fontSize: "16px" }}>{app.organization_name}</div>
                  <span className={`visitStatusBadge ${getStatusClass(app.status)}`} style={{ padding: "4px 8px", borderRadius: "8px", fontSize: "12px", fontWeight: "800" }}>
                    {getStatusLabel(app.status)}
                  </span>
                </div>

                <div className="visitBody" style={{ marginBottom: "20px" }}>
                  <div className="visitDoctorInfo" style={{ marginBottom: "12px" }}>
                    <div className="visitDocName" style={{ fontWeight: "800", fontSize: "17px" }}>{app.doctor_name}</div>
                    <div className="visitDocPos" style={{ fontSize: "13px", color: "#64748b" }}>{app.doctor_position}</div>
                  </div>

                  <div className="visitDetails" style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", color: "#94a3b8" }}>
                    <div className="visitDetailItem" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span className="visitDetailIcon">📅</span>
                      <span>{formatDate(app.date)}</span>
                    </div>
                    <div className="visitDetailItem" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span className="visitDetailIcon">🕒</span>
                      <span>{app.time}</span>
                    </div>
                    <div className="visitDetailItem" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span className="visitDetailIcon">🚪</span>
                      <span>{t.cabinet}{app.cabinet}</span>
                    </div>
                  </div>

                  {app.start_code && (app.status === "pending" || app.status === "approved") && (
                    <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(254, 240, 138, 0.15)', borderLeft: '4px solid #eab308', borderRadius: '8px', color: '#fef08a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <span className="visitDetailIcon" style={{ fontSize: '16px' }}>🔑</span>
                      <span>{t.verificationCode}: <b style={{ fontSize: '16px' }}>{app.start_code}</b></span>
                    </div>
                  )}

                  {app.reason && (
                    <div className="visitReason" style={{ marginTop: "12px", fontSize: "14px" }}>
                      <strong>{t.reason}:</strong> {app.reason}
                    </div>
                  )}

                  {app.comment && (
                    <div className="visitReason" style={{ marginTop: "8px", fontSize: "14px" }}>
                      <strong>{t.comment}:</strong> {app.comment}
                    </div>
                  )}
                </div>
              </div>

              <div className="visitFooter" style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                {(app.status === "pending" || app.status === "approved") && (
                  <button
                    type="button"
                    className="booking-action-btn outline-btn"
                    style={{ flex: 1, padding: "10px 14px", borderRadius: "12px", fontSize: "14px", fontWeight: "700" }}
                    onClick={() => setSelectedApp(app)}
                  >
                    {t.btnTicket}
                  </button>
                )}

                {app.status === "completed" && (
                  app.rated ? (
                    <div style={{ width: "100%", padding: "10px 14px", background: "rgba(0,184,90,0.15)", color: "#00b85a", borderRadius: "12px", textAlign: "center", fontSize: "14px", fontWeight: "800" }}>
                      ✅ {t.rated}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="booking-action-btn"
                      style={{ flex: 1, padding: "10px 14px", borderRadius: "12px", fontSize: "14px", fontWeight: "700", background: "linear-gradient(135deg, #10f3df, #00b85a)", color: "#020617" }}
                      onClick={() => {
                        setRatingApp(app);
                        setSelectedRating(10);
                        setRatingComment("");
                      }}
                    >
                      {t.btnRate}
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RATING MODAL */}
      {ratingApp && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(2, 6, 23, 0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "30px", width: "100%", maxWidth: "500px", padding: "30px", color: "#f8fafc", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
            <h3 style={{ fontSize: "22px", fontWeight: "900", marginBottom: "8px", textAlign: "center" }}>{t.modalRateTitle}</h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", textAlign: "center", marginBottom: "24px" }}>{t.modalRateSubtitle}</p>

            {ratingSuccess ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
                <h4 style={{ color: "#00b85a", fontSize: "18px", fontWeight: "800" }}>{ratingSuccess}</h4>
              </div>
            ) : (
              <form onSubmit={handleRatingSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* 1-10 Buttons selection grid */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "700", color: "#cbd5e1" }}>{t.ratingValue}: <b style={{ color: "#10f3df", fontSize: "16px" }}>{selectedRating} / 10</b></label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSelectedRating(num)}
                        style={{
                          height: "44px",
                          borderRadius: "10px",
                          border: "none",
                          fontWeight: "800",
                          cursor: "pointer",
                          background: selectedRating === num ? "linear-gradient(135deg, #10f3df, #00b85a)" : "rgba(148, 163, 184, 0.1)",
                          color: selectedRating === num ? "#020617" : "#cbd5e1",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment Textarea */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label htmlFor="modalComment" style={{ fontSize: "14px", fontWeight: "700", color: "#cbd5e1" }}>{t.commentLabel}</label>
                  <textarea
                    id="modalComment"
                    placeholder={t.commentPlaceholder}
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    style={{
                      height: "100px",
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "14px",
                      padding: "12px",
                      color: "#f8fafc",
                      fontSize: "14px",
                      resize: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setRatingApp(null)}
                    style={{ flex: 1, height: "46px", borderRadius: "14px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#cbd5e1", fontWeight: "700", cursor: "pointer" }}
                  >
                    {t.close}
                  </button>
                  <button
                    type="submit"
                    disabled={ratingLoading}
                    style={{ flex: 1, height: "46px", borderRadius: "14px", background: "linear-gradient(135deg, #10f3df, #00b85a)", color: "#020617", border: "none", fontWeight: "800", cursor: "pointer" }}
                  >
                    {ratingLoading ? t.submitting : t.btnSubmitRate}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ELECTRONIC TICKET MODAL */}
      {selectedApp && (
        <div
          className="ticketModalOverlay"
          onClick={() => setSelectedApp(null)}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(2, 6, 23, 0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
        >
          <div
            className="ticketModal"
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "30px", width: "100%", maxWidth: "500px", padding: "30px", color: "#f8fafc", position: "relative" }}
          >
            <button
              type="button"
              className="ticketCloseBtn"
              onClick={() => setSelectedApp(null)}
              aria-label="Закрыть"
              style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}
            >
              ✕
            </button>

            <div className="ticketHeader" style={{ textAlign: "center", marginBottom: "20px" }}>
              <h3 className="ticketHeaderTitle" style={{ fontSize: "20px", fontWeight: "900", color: "#10f3df" }}>{t.ticketTitle}</h3>
              <div className="ticketHeaderSub" style={{ fontSize: "12px", color: "#64748b" }}>{t.ticketSystem}</div>
            </div>

            <div className="ticketContent">
              <div className="ticketDetailsList" style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px", marginBottom: "24px" }}>
                <div className="ticketDetailRow" style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                  <span className="ticketLabel" style={{ color: "#64748b" }}>{language === "en" ? "Patient" : "Пациент"}:</span>
                  <span className="ticketVal" style={{ fontWeight: "700" }}>{selectedApp.patient_name}</span>
                </div>
                <div className="ticketDetailRow" style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                  <span className="ticketLabel" style={{ color: "#64748b" }}>{language === "en" ? "IIN" : "ИИН"}:</span>
                  <span className="ticketVal" style={{ fontWeight: "700" }}>{selectedApp.patient_iin}</span>
                </div>
                <div className="ticketDetailRow" style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                  <span className="ticketLabel" style={{ color: "#64748b" }}>{language === "en" ? "Clinic" : "Учреждение"}:</span>
                  <span className="ticketVal" style={{ fontWeight: "700" }}>{selectedApp.organization_name}</span>
                </div>
                <div className="ticketDetailRow" style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                  <span className="ticketLabel" style={{ color: "#64748b" }}>{language === "en" ? "Specialist" : "Специалист"}:</span>
                  <span className="ticketVal" style={{ fontWeight: "700" }}>{selectedApp.doctor_name}</span>
                </div>
                <div className="ticketDetailRow" style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                  <span className="ticketLabel" style={{ color: "#64748b" }}>{language === "en" ? "Date & Time" : "Дата и время"}:</span>
                  <span className="ticketVal" style={{ color: "#00b85a", fontWeight: "900" }}>
                    {formatDate(selectedApp.date)} в {selectedApp.time}
                  </span>
                </div>
                <div className="ticketDetailRow" style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                  <span className="ticketLabel" style={{ color: "#64748b" }}>{language === "en" ? "Cabinet" : "Кабинет"}:</span>
                  <span className="ticketVal" style={{ fontSize: "16px", color: "#00b85a", fontWeight: "900" }}>
                    №{selectedApp.cabinet}
                  </span>
                </div>
                {selectedApp.start_code && (
                  <div className="ticketDetailRow" style={{ background: 'rgba(254, 240, 138, 0.15)', padding: '10px 14px', borderRadius: '10px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="ticketLabel" style={{ color: '#fef08a', fontWeight: 'bold' }}>{t.verificationCode}:</span>
                    <span className="ticketVal" style={{ color: '#fef08a', fontSize: '18px', fontWeight: 'bold' }}>{selectedApp.start_code}</span>
                  </div>
                )}
              </div>

              <div className="ticketQrContainer" style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                <img
                  className="ticketQrImg"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ClinicOS_Appointment_${selectedApp.id}`}
                  alt="QR-код талона"
                  style={{ borderRadius: "18px", border: "8px solid white" }}
                />
              </div>

              <div className="ticketQrHelp" style={{ fontSize: "12px", color: "#64748b", textAlign: "center", lineHeight: "1.4" }}>
                {t.ticketQrHelp}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .visitsTabs button:hover {
          background: rgba(16, 243, 223, 0.08) !important;
          color: #10f3df !important;
        }
        .visitsTabs button.active:hover {
          background: linear-gradient(135deg, #10f3df, #00b85a) !important;
          color: #020617 !important;
        }
      `}} />
    </div>
  );
}
