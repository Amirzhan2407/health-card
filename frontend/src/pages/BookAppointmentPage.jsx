import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import "../styles/bookAppointment.css";

const API_URL = "https://health-card.onrender.com";

const getRoleByPosition = (position) => {
  const value = String(position || "").toLowerCase();
  if (value.includes("отдел кадров")) return "hr";
  if (value.includes("заместитель")) return "deputy_chief_doctor";
  if (value.includes("завед")) return "department_head";
  if (value.includes("регистратор")) return "registrar";
  if (value.includes("медсестр")) return "nurse";
  if (value.includes("врач")) return "doctor";
  return "employee";
};

const localTranslations = {
  ru: {
    title: "Запись на прием",
    subtitle: "Запись к специалистам и медицинские услуги",
    blockWarning: "Внимание! У вас есть незавершенные оценки для прошедших приемов. Пожалуйста, оцените работу врача перед новой записью.",
    goToHistory: "Перейти к истории посещений для оценки",
    step1Title: "Шаг 1: Выберите медицинскую организацию",
    step2Title: "Шаг 2: Выберите клиническое отделение",
    step3Title: "Шаг 3: Выберите лечащего врача",
    step4Title: "Шаг 4: Выберите удобную дату и время приёма",
    step5Title: "Шаг 5: Подтверждение личных данных",
    searchPlaceholder: "Поиск по названию клиники или городу...",
    loadingClinics: "Загрузка списка клиник...",
    loadingDepts: "Загрузка отделений...",
    loadingDocs: "Загрузка специалистов...",
    emptyClinics: "Клиники не найдены.",
    emptyDepts: "В данной клинике не добавлены отделения.",
    emptyDocs: "В этом отделении пока нет доступных врачей.",
    changeBtn: "Изменить",
    cabinet: "Кабинет №",
    newDoctor: "Новый врач",
    reviews: "отзывов",
    rating: "Рейтинг",
    sortByRating: "Сортировать по рейтингу",
    sortByName: "Сортировать по имени",
    availableTime: "Доступное время на",
    occupied: "Занято",
    available: "Свободно",
    fullName: "ФИО пациента",
    iin: "ИИН пациента",
    phone: "Контактный телефон",
    email: "Электронная почта",
    emailHint: "Сюда будет выслан электронный талон с QR-кодом для приёма",
    reason: "Причина обращения",
    comment: "Комментарий для врача",
    btnBook: "Подтвердить и записаться",
    bookingProcess: "Оформление записи...",
    successTitle: "Запись успешно оформлена!",
    successSubtitle: "Электронный талон отправлен на почту",
    talonTitle: "ЭЛЕКТРОННЫЙ ТАЛОН",
    talonSystem: "Clinic OS Booking System",
    patient: "Пациент",
    specialist: "Специалист",
    dateTime: "Дата и время приема",
    verificationCode: "Код подтверждения приёма",
    qrCaption: "Покажите этот код при входе в клинику",
    talonFooter: "Пожалуйста, приходите за 10 минут до назначенного времени приёма.",
    btnHome: "На главную",
    btnBookAgain: "Записаться еще раз",
    loginRequired: "Пожалуйста, войдите в аккаунт для записи на прием.",
  },
  kz: {
    title: "Қабылдауға жазылу",
    subtitle: "Мамандарға жазылу және медициналық қызметтер",
    blockWarning: "Назар аударыңыз! Сізде өткен қабылдаулар үшін бағаланбаған пікірлер бар. Жаңа жазба алдында дәрігердің жұмысын бағалаңыз.",
    goToHistory: "Бағалау үшін қабылдау тарихына өту",
    step1Title: "1-қадам: Медициналық ұйымды таңдаңыз",
    step2Title: "2-қадам: Клиникалық бөлімді таңдаңыз",
    step3Title: "3-қадам: Емдеуші дәрігерді таңдаңыз",
    step4Title: "4-қадам: Ыңғайлы күн мен уақытты таңдаңыз",
    step5Title: "5-қадам: Жеке деректерді растау",
    searchPlaceholder: "Клиника атауы немесе қала бойынша іздеу...",
    loadingClinics: "Клиникалар тізімі жүктелуде...",
    loadingDepts: "Бөлімдер жүктелуде...",
    loadingDocs: "Мамандар жүктелуде...",
    emptyClinics: "Клиникалар табылмады.",
    emptyDepts: "Бұл клиникада бөлімдер қосылмаған.",
    emptyDocs: "Бұл бөлімде әзірге қолжетімді дәрігерлер жоқ.",
    changeBtn: "Өзгерту",
    cabinet: "Кабинет №",
    newDoctor: "Жаңа дәрігер",
    reviews: "пікір",
    rating: "Рейтинг",
    sortByRating: "Рейтинг бойынша сұрыптау",
    sortByName: "Аты бойынша сұрыптау",
    availableTime: "Қолжетімді уақыт:",
    occupied: "Бос емес",
    available: "Бос",
    fullName: "Пациенттің АЖТ",
    iin: "Пациенттің ЖСН",
    phone: "Байланыс телефоны",
    email: "Электрондық пошта",
    emailHint: "Қабылдау үшін QR-коды бар электрондық талон осы поштаға жіберіледі",
    reason: "Қабылдау себебі",
    comment: "Дәрігерге түсініктеме",
    btnBook: "Растау және жазылу",
    bookingProcess: "Жазылуды ресімдеу...",
    successTitle: "Жазылу сәтті аяқталды!",
    successSubtitle: "Электрондық талон поштаға жіберілді",
    talonTitle: "ЭЛЕКТРОНДЫҚ ТАЛОН",
    talonSystem: "Clinic OS Booking System",
    patient: "Пациент",
    specialist: "Маман",
    dateTime: "Қабылдау күні мен уақыты",
    verificationCode: "Қабылдауды растау коды",
    qrCaption: "Клиникаға кірген кезде осы кодты көрсетіңіз",
    talonFooter: "Белгіленген қабылдау уақытынан 10 минут бұрын келуіңізді сұраймыз.",
    btnHome: "Басты бетке",
    btnBookAgain: "Тағы да жазылу",
    loginRequired: "Қабылдауға жазылу үшін жүйеге кіріңіз.",
  },
  en: {
    title: "Book an Appointment",
    subtitle: "Book specialists and medical services",
    blockWarning: "Attention! You have unrated completed appointments. Please rate the doctor's work before booking a new appointment.",
    goToHistory: "Go to Visits History to complete ratings",
    step1Title: "Step 1: Choose Medical Organization",
    step2Title: "Step 2: Choose Clinical Department",
    step3Title: "Step 3: Choose Doctor / Specialist",
    step4Title: "Step 4: Choose Convenient Date & Time",
    step5Title: "Step 5: Confirm Personal Details",
    searchPlaceholder: "Search by clinic name or city...",
    loadingClinics: "Loading clinics list...",
    loadingDepts: "Loading departments...",
    loadingDocs: "Loading specialists...",
    emptyClinics: "No clinics found.",
    emptyDepts: "No departments added in this clinic.",
    emptyDocs: "No available doctors in this department yet.",
    changeBtn: "Change",
    cabinet: "Cabinet No.",
    newDoctor: "New Doctor",
    reviews: "reviews",
    rating: "Rating",
    sortByRating: "Sort by Rating",
    sortByName: "Sort by Name",
    availableTime: "Available time on",
    occupied: "Occupied",
    available: "Available",
    fullName: "Patient Full Name",
    iin: "Patient IIN",
    phone: "Contact Phone",
    email: "Email Address",
    emailHint: "An electronic ticket with a QR code will be sent here",
    reason: "Reason for Visit",
    comment: "Comment for Doctor",
    btnBook: "Confirm and Book",
    bookingProcess: "Booking appointment...",
    successTitle: "Appointment Booked Successfully!",
    successSubtitle: "Electronic ticket sent to email",
    talonTitle: "ELECTRONIC TICKET",
    talonSystem: "Clinic OS Booking System",
    patient: "Patient",
    specialist: "Specialist",
    dateTime: "Appointment Date & Time",
    verificationCode: "Visit Verification Code",
    qrCaption: "Show this code at the clinic entrance",
    talonFooter: "Please arrive 10 minutes before your scheduled appointment time.",
    btnHome: "Go Home",
    btnBookAgain: "Book Again",
    loginRequired: "Please log in to book an appointment.",
  }
};

export default function BookAppointmentPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = localTranslations[language] || localTranslations.ru;

  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const patientIin = userData.iin || "";

  // Form Fields
  const [form, setForm] = useState({
    fullName: userData.fullName || "",
    iin: userData.iin || "",
    phone: userData.phone || "",
    email: userData.email || "",
    reason: "Плановый прием к врачу",
    comment: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);

  // Blocking logic for unrated visits
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockChecked, setBlockChecked] = useState(false);

  // Selection states
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);

  const [doctors, setDoctors] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState([]);

  // Sorting
  const [sortBy, setSortBy] = useState("rating"); // "rating" | "name"

  // Search queries
  const [searchOrg, setSearchOrg] = useState("");

  // Dates list: Next 14 days
  const getNext14Days = () => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      // Skip Sundays
      if (d.getDay() === 0) continue;
      
      const locale = language === "en" ? "en-US" : (language === "kz" ? "kk-KZ" : "ru-RU");
      list.push({
        dateStr: d.toISOString().split("T")[0],
        weekday: d.toLocaleDateString(locale, { weekday: "short" }),
        daynum: d.getDate(),
        month: d.toLocaleDateString(locale, { month: "short" }),
        fullLabel: d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
      });
    }
    return list;
  };
  const datesList = getNext14Days();

  // 1. Check patient completed appointments for unrated ones
  useEffect(() => {
    if (!patientIin) {
      setBlockChecked(true);
      return;
    }
    async function checkRatings() {
      try {
        const res = await fetch(`${API_URL}/api/organization-structure/appointments/patient/${patientIin}`);
        const data = await res.json();
        if (res.ok && data.appointments) {
          // Check if there is any completed appointment that is not rated
          const hasUnrated = data.appointments.some(
            (app) => app.status === "completed" && app.rated === false
          );
          if (hasUnrated) {
            setIsBlocked(true);
          }
        }
      } catch (err) {
        console.warn("Could not check patient ratings history:", err);
      } finally {
        setBlockChecked(true);
      }
    }
    checkRatings();
  }, [patientIin]);

  // Fetch Organizations (Step 1)
  useEffect(() => {
    if (isBlocked) return;
    async function fetchOrgs() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_URL}/api/organization-structure/public/organizations`);
        const data = await res.json();
        if (res.ok) {
          setOrganizations(data.organizations || []);
        } else {
          setError(data.message || "Ошибка загрузки списка клиник.");
        }
      } catch (err) {
        setError("Сетевая ошибка при загрузке клиник.");
      } finally {
        setLoading(false);
      }
    }
    fetchOrgs();
  }, [isBlocked]);

  // Fetch Departments when Organization is chosen
  const handleSelectOrg = async (org) => {
    setSelectedOrg(org);
    setSelectedDept(null);
    setSelectedDoc(null);
    setSelectedDate("");
    setSelectedTime("");
    setSlots([]);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/departments?organization_id=${org.id}`);
      const data = await res.json();
      if (res.ok) {
        setDepartments(data.departments || []);
      } else {
        setError(data.message || "Ошибка загрузки отделений клиники.");
      }
    } catch (err) {
      setError("Сетевая ошибка при загрузке отделений.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Doctors when Department is chosen
  const handleSelectDept = async (dept) => {
    setSelectedDept(dept);
    setSelectedDoc(null);
    setSelectedDate("");
    setSelectedTime("");
    setSlots([]);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/employees?organization_id=${selectedOrg.id}`);
      const data = await res.json();
      if (res.ok) {
        // Filter: role is doctor AND matches department
        const filteredDocs = (data.employees || []).filter(
          (emp) => emp.department_id === dept.id && getRoleByPosition(emp.position) === "doctor"
        );
        setDoctors(filteredDocs);
      } else {
        setError(data.message || "Ошибка загрузки списка специалистов.");
      }
    } catch (err) {
      setError("Сетевая ошибка при загрузке специалистов.");
    } finally {
      setLoading(false);
    }
  };

  // Select Doctor
  const handleSelectDoc = (doc) => {
    setSelectedDoc(doc);
    setSelectedDate(datesList[0]?.dateStr || "");
    setSelectedTime("");
    setSlots([]);
  };

  // Load Slots when Date or Doctor changes
  useEffect(() => {
    if (!selectedDoc || !selectedDate) return;
    async function loadSlots() {
      try {
        const res = await fetch(
          `${API_URL}/api/organization-structure/employees/${selectedDoc.id}/slots?date=${selectedDate}`
        );
        const data = await res.json();
        if (res.ok) {
          setSlots(data.slots || []);
        }
      } catch (err) {
        console.warn("Could not load slot availability:", err);
      }
    }
    loadSlots();
  }, [selectedDoc, selectedDate]);

  // Submit Booking Form
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.fullName || !form.iin) {
      setError("ФИО, ИИН и Email обязательны для заполнения.");
      return;
    }
    if (form.iin.length !== 12) {
      setError("ИИН должен состоять ровно из 12 цифр.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        organization_id: selectedOrg.id,
        employee_id: selectedDoc.id,
        patient_name: form.fullName,
        patient_iin: form.iin,
        patient_phone: form.phone,
        patient_email: form.email,
        date: selectedDate,
        time: selectedTime,
        reason: form.reason,
        cabinet: selectedDoc.cabinet || "",
        comment: form.comment
      };

      const res = await fetch(`${API_URL}/api/organization-structure/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessData(data.appointment);
      } else {
        setError(data.message || "Не удалось оформить запись.");
      }
    } catch (err) {
      setError("Сетевая ошибка при отправке заявки на запись.");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrgs = organizations.filter(o =>
    o.organization_name.toLowerCase().includes(searchOrg.toLowerCase()) ||
    (o.city && o.city.toLowerCase().includes(searchOrg.toLowerCase()))
  );

  // Sorting doctors
  const sortedDoctors = [...doctors].sort((a, b) => {
    if (sortBy === "rating") {
      // Sort by average rating descending
      const ratingA = Number(a.average_rating || 8.0);
      const ratingB = Number(b.average_rating || 8.0);
      return ratingB - ratingA;
    } else {
      // Sort by name alphabetically
      const nameA = String(a.full_name || "");
      const nameB = String(b.full_name || "");
      return nameA.localeCompare(nameB);
    }
  });

  // Render blocked UI
  if (blockChecked && isBlocked) {
    return (
      <div className="book-appointment-container">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center", background: "rgba(255,255,255,0.08)", borderRadius: "24px", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", maxWidth: "600px", margin: "40px auto" }}>
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>⚠️</div>
          <h2 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "16px", color: "#f43f5e" }}>
            {language === "en" ? "Review Required" : (language === "kz" ? "Бағалау қажет" : "Требуется оценка")}
          </h2>
          <p style={{ fontSize: "16px", lineHeight: "1.6", marginBottom: "30px", color: "var(--text-secondary, #64748b)" }}>
            {t.blockWarning}
          </p>
          <button
            type="button"
            className="booking-action-btn"
            style={{ padding: "14px 28px", borderRadius: "16px", fontSize: "16px", background: "linear-gradient(135deg, #10f3df, #00b85a)" }}
            onClick={() => navigate("/visits-history")}
          >
            {t.goToHistory}
          </button>
        </div>
      </div>
    );
  }

  // Render login required
  if (!patientIin) {
    return (
      <div className="book-appointment-container">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center", background: "rgba(255,255,255,0.08)", borderRadius: "24px", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", maxWidth: "600px", margin: "40px auto" }}>
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>🔒</div>
          <h2 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "16px" }}>
            {language === "en" ? "Authorization Required" : (language === "kz" ? "Авторизация қажет" : "Требуется авторизация")}
          </h2>
          <p style={{ fontSize: "16px", lineHeight: "1.6", marginBottom: "30px", color: "var(--text-secondary, #64748b)" }}>
            {t.loginRequired}
          </p>
          <button
            type="button"
            className="booking-action-btn"
            style={{ padding: "14px 28px", borderRadius: "16px", fontSize: "16px", background: "linear-gradient(135deg, #10f3df, #00b85a)" }}
            onClick={() => navigate("/login")}
          >
            {language === "en" ? "Log In" : (language === "kz" ? "Кіру" : "Войти")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="book-appointment-container">
      <div style={{ marginBottom: "30px", textAlign: "center" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "900", marginBottom: "8px" }}>{t.title}</h1>
        <p style={{ color: "#64748b", fontSize: "16px" }}>{t.subtitle}</p>
      </div>

      {error && <div className="booking-error-alert">{error}</div>}

      {!successData ? (
        <div className="booking-flow-inline" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* SECTION 1: CLINIC (ALWAYS OPEN OR SUMMARY) */}
          <div className={`booking-section ${!selectedOrg ? "active-section" : ""}`}>
            <h3>{t.step1Title}</h3>
            {!selectedOrg ? (
              <>
                <div className="search-box-row" style={{ marginBottom: "16px" }}>
                  <input 
                    type="text" 
                    placeholder={t.searchPlaceholder}
                    value={searchOrg}
                    onChange={(e) => setSearchOrg(e.target.value)}
                    className="clinic-search-input"
                    style={{ width: "100%", padding: "14px 20px", borderRadius: "16px", border: "1px solid rgba(0,0,0,0.1)", background: "rgba(255,255,255,0.8)" }}
                  />
                </div>

                {loading && <div className="booking-loading-spinner">{t.loadingClinics}</div>}

                <div className="cards-grid">
                  {filteredOrgs.length > 0 ? (
                    filteredOrgs.map((org) => (
                      <div key={org.id} className="clinic-card" onClick={() => handleSelectOrg(org)}>
                        <div className="clinic-card-icon">🏥</div>
                        <div className="clinic-card-info">
                          <h4>{org.organization_name}</h4>
                          <span className="clinic-city-badge">📍 {org.city || "Казахстан"}</span>
                        </div>
                        <div className="clinic-card-action">›</div>
                      </div>
                    ))
                  ) : (
                    !loading && <div className="empty-results">{t.emptyClinics}</div>
                  )}
                </div>
              </>
            ) : (
              <div className="selected-summary-card">
                <div className="summary-card-icon">🏥</div>
                <div className="summary-card-info">
                  <h4>{selectedOrg.organization_name}</h4>
                  <span>📍 {selectedOrg.city || "Казахстан"}</span>
                </div>
                <button 
                  type="button" 
                  className="summary-change-btn" 
                  onClick={() => {
                    setSelectedOrg(null);
                    setSelectedDept(null);
                    setSelectedDoc(null);
                    setSelectedTime("");
                    setSlots([]);
                  }}
                >
                  {t.changeBtn}
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: DEPARTMENT */}
          {selectedOrg && (
            <div className={`booking-section ${!selectedDept ? "active-section" : ""}`}>
              <h3>{t.step2Title}</h3>
              {!selectedDept ? (
                <>
                  {loading && <div className="booking-loading-spinner">{t.loadingDepts}</div>}
                  <div className="cards-grid">
                    {departments.length > 0 ? (
                      departments.map((dept) => (
                        <div key={dept.id} className="dept-card" onClick={() => handleSelectDept(dept)}>
                          <div className="dept-card-icon">🩺</div>
                          <div className="dept-card-info">
                            <h4>{dept.name}</h4>
                            <span className="dept-meta-info">{language === "en" ? "Floor" : "Этаж"}: {dept.floor} • {language === "en" ? "Cabinet" : "Кабинет"}: {dept.rooms}</span>
                          </div>
                          <div className="dept-card-action">›</div>
                        </div>
                      ))
                    ) : (
                      !loading && <div className="empty-results">{t.emptyDepts}</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="selected-summary-card">
                  <div className="summary-card-icon">🩺</div>
                  <div className="summary-card-info">
                    <h4>{selectedDept.name}</h4>
                    <span>{language === "en" ? "Floor" : "Этаж"}: {selectedDept.floor} • {language === "en" ? "Cabinet" : "Кабинет"}: {selectedDept.rooms}</span>
                  </div>
                  <button 
                    type="button" 
                    className="summary-change-btn" 
                    onClick={() => {
                      setSelectedDept(null);
                      setSelectedDoc(null);
                      setSelectedTime("");
                      setSlots([]);
                    }}
                  >
                    {t.changeBtn}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: DOCTOR */}
          {selectedDept && (
            <div className={`booking-section ${!selectedDoc ? "active-section" : ""}`}>
              <h3>{t.step3Title}</h3>
              {!selectedDoc ? (
                <>
                  {/* Sorting Controls */}
                  <div style={{ display: "flex", gap: "10px", margin: "16px 0", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setSortBy("rating")}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "12px",
                        border: "none",
                        fontWeight: "700",
                        cursor: "pointer",
                        background: sortBy === "rating" ? "linear-gradient(135deg, #10f3df, #00b85a)" : "rgba(148, 163, 184, 0.15)",
                        color: sortBy === "rating" ? "#020617" : "inherit",
                        transition: "all 0.3s ease"
                      }}
                    >
                      ⭐ {t.sortByRating}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy("name")}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "12px",
                        border: "none",
                        fontWeight: "700",
                        cursor: "pointer",
                        background: sortBy === "name" ? "linear-gradient(135deg, #10f3df, #00b85a)" : "rgba(148, 163, 184, 0.15)",
                        color: sortBy === "name" ? "#020617" : "inherit",
                        transition: "all 0.3s ease"
                      }}
                    >
                      🔤 {t.sortByName}
                    </button>
                  </div>

                  {loading && <div className="booking-loading-spinner">{t.loadingDocs}</div>}
                  
                  <div className="cards-grid">
                    {sortedDoctors.length > 0 ? (
                      sortedDoctors.map((doc) => {
                        const count = Number(doc.rating_count || 0);
                        const rating = Number(doc.average_rating || 8.0).toFixed(1);
                        return (
                          <div key={doc.id} className="doctor-card" onClick={() => handleSelectDoc(doc)}>
                            <div className="doctor-avatar">
                              {doc.full_name?.split(" ").slice(0,2).map(n=>n[0]).join("") || "Д"}
                            </div>
                            <div className="doctor-card-info">
                              <h4>{doc.full_name}</h4>
                              <p className="doc-pos">{doc.position || "Врач-специалист"}</p>
                              <span className="doc-cab" style={{ display: "block", marginBottom: "6px" }}>{t.cabinet}{doc.cabinet || "—"}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ background: count === 0 ? "rgba(16, 243, 223, 0.2)" : "rgba(250, 204, 21, 0.2)", color: count === 0 ? "#0d9488" : "#a16207", padding: "2px 8px", borderRadius: "8px", fontSize: "11px", fontWeight: "800" }}>
                                  ⭐ {rating}
                                </span>
                                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>
                                  {count === 0 ? t.newDoctor : `${count} ${t.reviews}`}
                                </span>
                              </div>
                            </div>
                            <div className="doctor-card-action">›</div>
                          </div>
                        );
                      })
                    ) : (
                      !loading && <div className="empty-results">{t.emptyDocs}</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="selected-summary-card">
                  <div className="doctor-avatar mini" style={{ marginRight: 16 }}>
                    {selectedDoc.full_name?.split(" ").slice(0,2).map(n=>n[0]).join("") || "Д"}
                  </div>
                  <div className="summary-card-info">
                    <h4>{selectedDoc.full_name}</h4>
                    <span>{selectedDoc.position || "Врач-специалист"} • {t.cabinet}{selectedDoc.cabinet || "—"}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "800", color: "#eab308" }}>
                        ⭐ {Number(selectedDoc.average_rating || 8.0).toFixed(1)}
                      </span>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        ({Number(selectedDoc.rating_count || 0) === 0 ? t.newDoctor : `${selectedDoc.rating_count} ${t.reviews}`})
                      </span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="summary-change-btn" 
                    onClick={() => {
                      setSelectedDoc(null);
                      setSelectedTime("");
                      setSlots([]);
                    }}
                  >
                    {t.changeBtn}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: DATE & TIME */}
          {selectedDoc && (
            <div className={`booking-section ${!selectedTime ? "active-section" : ""}`}>
              <h3>{t.step4Title}</h3>
              {!selectedTime ? (
                <>
                  {/* Date Carousel Strip */}
                  <div className="horizontal-date-carousel">
                    {datesList.map((day) => (
                      <button
                        key={day.dateStr}
                        type="button"
                        className={`carousel-date-node ${selectedDate === day.dateStr ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedDate(day.dateStr);
                          setSelectedTime("");
                          setSlots([]);
                        }}
                      >
                        <span className="weekday">{day.weekday}</span>
                        <span className="daynum">{day.daynum}</span>
                        <span className="month">{day.month}</span>
                      </button>
                    ))}
                  </div>

                  <div className="timetable-section-title">
                    {t.availableTime} <b>{datesList.find(d => d.dateStr === selectedDate)?.fullLabel || selectedDate}</b>
                  </div>

                  {/* Time Slot Grid */}
                  <div className="time-slots-grid">
                    {slots.length > 0 ? (
                      slots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          className={`time-slot-node ${!slot.available ? "booked" : ""}`}
                          onClick={() => {
                            setSelectedTime(slot.time);
                          }}
                        >
                          <span className="time-val">{slot.time}</span>
                          <span className="status-val">{!slot.available ? t.occupied : t.available}</span>
                        </button>
                      ))
                    ) : (
                      <div className="empty-results" style={{ width: "100%", gridColumn: "1 / -1", padding: "20px 0" }}>
                        {language === "en" ? "No available slots on this day." : (language === "kz" ? "Бұл күнге бос уақыт жоқ." : "Нет доступных слотов на этот день.")}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="selected-summary-card">
                  <div className="summary-card-icon">📅</div>
                  <div className="summary-card-info">
                    <h4>{datesList.find(d => d.dateStr === selectedDate)?.fullLabel}</h4>
                    <span>{language === "en" ? "Time" : "Время приёма"}: <b>{selectedTime}</b></span>
                  </div>
                  <button 
                    type="button" 
                    className="summary-change-btn" 
                    onClick={() => {
                      setSelectedTime("");
                    }}
                  >
                    {t.changeBtn}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: PATIENT DETAILS & CHECKOUT */}
          {selectedTime && (
            <div className="booking-section active-section">
              <h3>{t.step5Title}</h3>
              
              <form onSubmit={handleBookingSubmit} className="booking-checkout-form" style={{ marginTop: 0, padding: 0, background: 'none', border: 'none', boxShadow: 'none' }}>
                <div className="input-group">
                  <label htmlFor="fullName">{t.fullName} <span className="req">*</span></label>
                  <input 
                    id="fullName"
                    type="text" 
                    placeholder="Иванов Иван Иванович"
                    value={form.fullName}
                    onChange={(e) => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>

                <div className="input-group-row">
                  <div className="input-group">
                    <label htmlFor="iin">{t.iin} <span className="req">*</span></label>
                    <input 
                      id="iin"
                      type="text" 
                      maxLength={12}
                      placeholder="12-значный ИИН"
                      value={form.iin}
                      onChange={(e) => setForm(prev => ({ ...prev, iin: e.target.value.replace(/\D/g, "") }))}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="phone">{t.phone}</label>
                    <input 
                      id="phone"
                      type="tel" 
                      placeholder="+7 (777) 123-45-67"
                      value={form.phone}
                      onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="email">{t.email} <span className="req">*</span></label>
                  <input 
                    id="email"
                    type="email" 
                    placeholder="your-email@mail.ru"
                    value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                  <span className="input-hint">{t.emailHint}</span>
                </div>

                <div className="input-group">
                  <label htmlFor="reason">{t.reason}</label>
                  <input 
                    id="reason"
                    type="text" 
                    placeholder="Плановый осмотр, жалобы и т.д."
                    value={form.reason}
                    onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="comment">{t.comment}</label>
                  <textarea 
                    id="comment"
                    placeholder="Дополнительные сведения, которые вы хотите передать врачу заранее"
                    value={form.comment}
                    onChange={(e) => setForm(prev => ({ ...prev, comment: e.target.value }))}
                  />
                </div>

                <button type="submit" disabled={loading} className="booking-action-btn submit-btn" style={{ background: "linear-gradient(135deg, #10f3df, #00b85a)" }}>
                  {loading ? t.bookingProcess : t.btnBook}
                </button>
              </form>
            </div>
          )}
        </div>
      ) : (
        /* SUCCESS COUPON TALON */
        <div className="step-view success-view">
          <div className="success-checkmark-wrapper">
            <div className="checkmark-circle">✓</div>
            <h2>{t.successTitle}</h2>
            <p>{t.successSubtitle} <b>{successData.patient_email}</b></p>
          </div>

          <div className="medical-talon-sheet">
            <div className="talon-header">
              <h3>{t.talonTitle}</h3>
              <span>{t.talonSystem}</span>
            </div>

            <div className="talon-body">
              <div className="talon-fields">
                <div className="talon-field">
                  <span className="label">{t.patient}</span>
                  <span className="value">{successData.patient_name}</span>
                </div>
                <div className="talon-field">
                  <span className="label">{t.iin}</span>
                  <span className="value">{successData.patient_iin}</span>
                </div>
                <div className="talon-field">
                  <span className="label">{language === "en" ? "Medical Organization" : "Медицинская организация"}</span>
                  <span className="value">{selectedOrg?.organization_name}</span>
                </div>
                <div className="talon-field">
                  <span className="label">{t.specialist}</span>
                  <span className="value">{selectedDoc?.full_name} ({selectedDoc?.position})</span>
                </div>
                <div className="talon-field highlight-field">
                  <span className="label">{t.dateTime}</span>
                  <span className="value">
                    {datesList.find(d => d.dateStr === successData.date)?.fullLabel || successData.date} в <b>{successData.time}</b>
                  </span>
                </div>
                <div className="talon-field">
                  <span className="label">{language === "en" ? "Cabinet" : "Кабинет"}</span>
                  <span className="value">№{successData.cabinet || selectedDoc?.cabinet || "—"}</span>
                </div>
                {successData.start_code && (
                  <div className="talon-field highlight-field" style={{ background: '#fef08a', borderLeft: '4px solid #eab308' }}>
                    <span className="label" style={{ color: '#854d0e' }}>{t.verificationCode}</span>
                    <span className="value" style={{ color: '#854d0e', fontSize: '18px', fontWeight: 'bold' }}>{successData.start_code}</span>
                  </div>
                )}
              </div>

              <div className="talon-qrcode">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ClinicOS_Appointment_${successData.id}`} 
                  alt="QR Talon" 
                  className="talon-qr-img"
                />
                <span className="qr-caption">{t.qrCaption}</span>
              </div>
            </div>

            <div className="talon-footer">
              {t.talonFooter}
            </div>
          </div>

          <div className="success-actions-row">
            <button type="button" className="booking-action-btn outline-btn" onClick={() => navigate("/")}>
              {t.btnHome}
            </button>
            <button type="button" className="booking-action-btn" onClick={() => {
              setSuccessData(null);
              setSelectedOrg(null);
              setSelectedDept(null);
              setSelectedDoc(null);
              setSelectedDate("");
              setSelectedTime("");
              setForm({
                fullName: userData.fullName || "",
                iin: userData.iin || "",
                phone: userData.phone || "",
                email: userData.email || "",
                reason: "Плановый прием к врачу",
                comment: "",
              });
            }}>
              {t.btnBookAgain}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
