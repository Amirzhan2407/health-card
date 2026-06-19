import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const API_URL = "https://health-card.onrender.com";

const ROLE_LABELS = {
  doctor: "Врач",
  nurse: "Медсестра / Медбрат",
  registrar: "Регистратор",
  department_head: "Заведующий отделением",
  deputy_chief_doctor: "Заместитель главного врача",
};

// Initial Mock Patients Data
const MOCK_PATIENTS = [
  {
    id: "pat-1",
    iin: "880515300124",
    full_name: "Ахметов Серик Болатович",
    phone: "+7 (701) 555-12-34",
    email: "serik.akhmetov@mail.ru",
    birth_date: "1988-05-15",
    gender: "Мужской",
    blood_type: "A(II) Rh+",
    allergies: "Пенициллин, Анальгин",
    chronic_conditions: "Артериальная гипертензия II степени",
    records: [
      {
        id: "rec-1-1",
        date: "2026-06-10",
        doctor_name: "Иванов И.И.",
        complaints: "Головная боль в затылочной области, слабость.",
        inspection: "АД 140/90, ЧСС 78 уд/мин. Тоны сердца приглушены.",
        diagnosis: "Артериальная гипертензия, ухудшение.",
        recommendations: "Соблюдать диету с ограничением соли, избегать стрессов.",
        prescriptions: "Лизиноприл 10 мг по 1 таб утром натощак.",
        comment: "Контроль АД дважды в день."
      }
    ]
  },
  {
    id: "pat-2",
    iin: "951201400876",
    full_name: "Оспанова Алия Муратовна",
    phone: "+7 (707) 123-45-67",
    email: "aliya.ospanova@gmail.com",
    birth_date: "1995-12-01",
    gender: "Женский",
    blood_type: "O(I) Rh-",
    allergies: "Нет",
    chronic_conditions: "Хронический гастрит в стадии ремиссии",
    records: [
      {
        id: "rec-2-1",
        date: "2026-05-20",
        doctor_name: "Иванов И.И.",
        complaints: "Боли в эпигастральной области после еды.",
        inspection: "Живот мягкий, болезненный при пальпации в эпигастрии.",
        diagnosis: "Обострение хронического гастрита.",
        recommendations: "Дробное питание (диета №1).",
        prescriptions: "Омепразол 20 мг 2 раза в день за 30 мин до еды.",
        comment: "Явка при ухудшении."
      }
    ]
  },
  {
    id: "pat-3",
    iin: "910214300456",
    full_name: "Каримов Руслан Даниярович",
    phone: "+7 (777) 987-65-43",
    email: "ruslan.k@inbox.ru",
    birth_date: "1991-02-14",
    gender: "Мужской",
    blood_type: "B(III) Rh+",
    allergies: "Пыльца полыни",
    chronic_conditions: "Бронхиальная астма, контролируемая",
    records: []
  }
];

// Initial Mock Appointments Data
const MOCK_APPOINTMENTS = [
  {
    id: "app-1",
    patient_id: "pat-1",
    patient_name: "Ахметов Серик Болатович",
    patient_iin: "880515300124",
    patient_phone: "+7 (701) 555-12-34",
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    reason: "Плановый осмотр, контроль давления",
    status: "arrived", // pending, arrived, completed, cancelled
    employee_name: "Иванов И.И.",
    cabinet: "302",
    comment: "В прошлый раз жаловался на головную боль"
  },
  {
    id: "app-2",
    patient_id: "pat-2",
    patient_name: "Оспанова Алия Муратовна",
    patient_iin: "951201400876",
    patient_phone: "+7 (707) 123-45-67",
    date: new Date().toISOString().split("T")[0],
    time: "11:30",
    reason: "Жалобы на боли в желудке",
    status: "pending",
    employee_name: "Иванов И.И.",
    cabinet: "302",
    comment: "Нужна консультация по диете"
  },
  {
    id: "app-3",
    patient_id: "pat-3",
    patient_name: "Каримов Руслан Даниярович",
    patient_iin: "910214300456",
    patient_phone: "+7 (777) 987-65-43",
    date: new Date().toISOString().split("T")[0],
    time: "14:00",
    reason: "Рецепт на ингалятор",
    status: "completed",
    employee_name: "Иванов И.И.",
    cabinet: "302",
    comment: ""
  }
];

const MOCK_NOTIFICATIONS = [
  {
    id: "not-1",
    title: "Новая запись на прием",
    message: "Пациент Ахметов С.Б. записался к вам на сегодня на 09:00.",
    date: "2026-06-19 08:15",
    type: "new_appointment"
  },
  {
    id: "not-2",
    title: "Запись отменена",
    message: "Пациент Смирнова О.П. отменила запись на завтра на 10:30.",
    date: "2026-06-18 17:40",
    type: "cancelled"
  },
  {
    id: "not-3",
    title: "Изменение расписания",
    message: "Администратор изменил время работы вашего кабинета на четверг.",
    date: "2026-06-18 12:00",
    type: "schedule"
  },
  {
    id: "not-4",
    title: "Системное уведомление",
    message: "Сегодня ночью в 03:00 пройдут плановые технические работы в Clinic OS.",
    date: "2026-06-18 10:00",
    type: "system"
  }
];

export default function GovClinicEmployee() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "dashboard";

  // Auth local storage data
  const user = JSON.parse(localStorage.getItem("organizationUser") || "null");
  const organization = JSON.parse(localStorage.getItem("organizationData") || "null");

  // Dynamic States
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // New Medical Record Form
  const [medicalRecordForm, setMedicalRecordForm] = useState({
    complaints: "",
    inspection: "",
    diagnosis: "",
    recommendations: "",
    prescriptions: "",
    comment: ""
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Dates list helper (today + next 6 days)
  const getNextDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push({
        dateStr: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric" }),
        fullLabel: d.toLocaleDateString("ru-RU", { month: "long", day: "numeric" })
      });
    }
    return days;
  };
  const datesList = getNextDays();

  // Load Employee Profile, Patients, Appointments, and Notifications
  useEffect(() => {
    if (!user) return;
    
    // Fetch profile info
    async function loadAllData() {
      setLoadingProfile(true);
      try {
        // Load employees to find current matching employee profile
        const empRes = await fetch(
          `${API_URL}/api/organization-structure/employees?organization_id=${user.organization_id}`
        );
        if (empRes.ok) {
          const empData = await empRes.json();
          const match = (empData.employees || []).find(e => e.login === user.login);
          if (match) {
            setEmployeeProfile(match);
          } else {
            setEmployeeProfile({
              full_name: user.full_name,
              position: ROLE_LABELS[user.role] || "Сотрудник",
              department: "Отделение не назначено",
              cabinet: "Кабинет не назначен",
              status: "active"
            });
          }
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoadingProfile(false);
      }

      // Initialize mock arrays, then attempt future real API load
      setPatients(MOCK_PATIENTS);
      setAppointments(MOCK_APPOINTMENTS);
      setNotifications(MOCK_NOTIFICATIONS);

      // Attempt to load appointments from real API in future
      try {
        const appRes = await fetch(
          `${API_URL}/api/organization-structure/appointments?employee_id=${user.id}&date=${selectedDate}`
        );
        if (appRes.ok) {
          const appData = await appRes.json();
          if (appData.appointments && appData.appointments.length > 0) {
            setAppointments(appData.appointments);
          }
        }
      } catch (err) {
        console.warn("Real appointments API not ready yet, using mock data:", err);
      }
    }

    loadAllData();
  }, [user, selectedDate]);

  // Handle Tab changes
  function changeTab(tabId) {
    setSearchParams({ tab: tabId });
    setMessage("");
    setError("");
  }

  // Handle status update of appointment
  async function updateAppointmentStatus(appId, newStatus) {
    setMessage("");
    setError("");

    // Setup local state update immediately for smooth UI
    setAppointments(prev =>
      prev.map(app => (app.id === appId ? { ...app, status: newStatus } : app))
    );
    if (selectedAppointment && selectedAppointment.id === appId) {
      setSelectedAppointment(prev => ({ ...prev, status: newStatus }));
    }

    // Call API (will log error and fallback if backend endpoint is not ready)
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/appointments/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await res.json();
      if (!res.ok) {
        console.warn("Backend status patch failed, proceeding with fallback updates.", result.message);
      } else {
        setMessage("Статус записи успешно обновлен.");
      }
    } catch (err) {
      console.warn("Appointments status API fallback used:", err);
    }
  }

  // Handle Adding Medical Record
  function handleAddMedicalRecord(e) {
    e.preventDefault();
    if (!selectedPatient) return;

    const newRecord = {
      id: "rec-" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      doctor_name: user?.full_name || "Врач",
      complaints: medicalRecordForm.complaints.trim(),
      inspection: medicalRecordForm.inspection.trim(),
      diagnosis: medicalRecordForm.diagnosis.trim(),
      recommendations: medicalRecordForm.recommendations.trim(),
      prescriptions: medicalRecordForm.prescriptions.trim(),
      comment: medicalRecordForm.comment.trim()
    };

    if (!newRecord.complaints || !newRecord.diagnosis) {
      setError("Пожалуйста, заполните жалобы и диагноз.");
      return;
    }

    // Update patient records locally
    const updatedPatients = patients.map(p => {
      if (p.id === selectedPatient.id) {
        return {
          ...p,
          records: [newRecord, ...(p.records || [])]
        };
      }
      return p;
    });

    setPatients(updatedPatients);
    setSelectedPatient(prev => ({
      ...prev,
      records: [newRecord, ...(prev.records || [])]
    }));

    // Reset form
    setMedicalRecordForm({
      complaints: "",
      inspection: "",
      diagnosis: "",
      recommendations: "",
      prescriptions: "",
      comment: ""
    });

    setMessage("Запись успешно добавлена в медицинскую карту.");
    setError("");
  }

  // Action helpers
  function openPatientCard(patientId) {
    const pat = patients.find(p => p.id === patientId);
    if (pat) {
      setSelectedPatient(pat);
      setSelectedAppointment(null);
      changeTab("patients");
    }
  }

  function startAppointment(appointment) {
    const pat = patients.find(p => p.id === appointment.patient_id);
    if (pat) {
      setSelectedPatient(pat);
      setSelectedAppointment(null);
      // Switch status to arrived if it was pending
      if (appointment.status === "pending") {
        updateAppointmentStatus(appointment.id, "arrived");
      }
      changeTab("medical_records");
    }
  }

  // Filtered patients for search
  const filteredPatients = patients.filter(p => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return p.full_name.toLowerCase().includes(query) || p.iin.includes(query);
  });

  // Time slots template
  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", 
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", 
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"
  ];

  if (!user) {
    return <div style={{ padding: 20 }}>Ошибка: Пользователь не авторизован.</div>;
  }

  const role = user.role;
  const showMedicalCardTab = ["doctor", "department_head", "deputy_chief_doctor"].includes(role);
  const canAddMedicalRecords = role === "doctor" || role === "department_head";
  const isDepartmentHead = role === "department_head";
  const isDeputyChief = role === "deputy_chief_doctor";

  return (
    <div className="gov-employee-cabinet">
      {/* Header Info Panel */}
      <div className="gov-employee-profile-banner">
        <div className="profile-banner-left">
          <div className="profile-banner-avatar">
            {employeeProfile?.full_name?.split(" ").slice(0,2).map(n=>n[0]).join("") || "С"}
          </div>
          <div className="profile-banner-details">
            <h2>{employeeProfile?.full_name || user.full_name}</h2>
            <div className="profile-badge-row">
              <span className="profile-role-badge">{ROLE_LABELS[role] || "Сотрудник"}</span>
              <span className={`profile-status-badge ${employeeProfile?.status === "active" ? "active" : ""}`}>
                {employeeProfile?.status === "active" ? "Активен" : "Отключен"}
              </span>
            </div>
          </div>
        </div>

        <div className="profile-banner-meta">
          <div className="meta-item">
            <span className="meta-label">Организация:</span>
            <span className="meta-value">{organization?.organization_name || "Clinic OS"}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Отделение:</span>
            <span className="meta-value">{employeeProfile?.department || "Не указано"}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Кабинет:</span>
            <span className="meta-value">№{employeeProfile?.cabinet || "—"}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && <div className="gov-success">{message}</div>}
      {error && <div className="gov-error">{error}</div>}

      {/* Tabs Content */}
      <div className="gov-employee-tab-content">
        
        {/* TABS 1: ГЛАВНАЯ (DASHBOARD) */}
        {currentTab === "dashboard" && (
          <div className="gov-employee-dashboard">
            <h3 className="gov-section-title">Панель управления сотрудника</h3>
            
            <div className="employee-dashboard-grid">
              
              <div className="employee-stat-card cursor-pointer" onClick={() => changeTab("appointments")}>
                <span className="stat-card-title">Записи на сегодня</span>
                <span className="stat-card-number">{appointments.filter(a => a.status !== "cancelled").length}</span>
                <span className="stat-card-desc">Всего активных записей</span>
              </div>

              <div className="employee-stat-card highlight-card">
                <span className="stat-card-title">Следующий пациент</span>
                {appointments.find(a => a.status === "pending" || a.status === "arrived") ? (
                  <>
                    <span className="stat-card-name">
                      {appointments.find(a => a.status === "pending" || a.status === "arrived").patient_name}
                    </span>
                    <span className="stat-card-time">
                      Время: {appointments.find(a => a.status === "pending" || a.status === "arrived").time}
                    </span>
                    <button 
                      type="button" 
                      className="dashboard-action-btn"
                      onClick={() => startAppointment(appointments.find(a => a.status === "pending" || a.status === "arrived"))}
                    >
                      Начать прием
                    </button>
                  </>
                ) : (
                  <span className="stat-card-desc">Записей нет</span>
                )}
              </div>

              <div className="employee-stat-card">
                <span className="stat-card-title">Кабинет</span>
                <span className="stat-card-number">№{employeeProfile?.cabinet || "—"}</span>
                <span className="stat-card-desc">Ваше текущее рабочее место</span>
              </div>

              <div className="employee-stat-card">
                <span className="stat-card-title">Отделение</span>
                <span className="stat-card-value">{employeeProfile?.department || "—"}</span>
                <span className="stat-card-desc">Прикрепленное отделение</span>
              </div>

              {showMedicalCardTab && (
                <div className="employee-stat-card cursor-pointer" onClick={() => changeTab("patients")}>
                  <span className="stat-card-title">Пациенты</span>
                  <span className="stat-card-number">{patients.length}</span>
                  <span className="stat-card-desc">Карточки в системе</span>
                </div>
              )}

              <div className="employee-stat-card cursor-pointer" onClick={() => changeTab("notifications")}>
                <span className="stat-card-title">Уведомления</span>
                <span className="stat-card-number">{notifications.length}</span>
                <span className="stat-card-desc">События и сообщения</span>
              </div>

            </div>

            {/* Quick Actions Panel */}
            <div className="quick-actions-panel gov-card">
              <h3>Быстрый поиск пациента</h3>
              <div className="search-bar-inline">
                <input 
                  type="text" 
                  placeholder="Введите ФИО или ИИН пациента..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button 
                  type="button"
                  className="quick-search-btn"
                  onClick={() => changeTab("patients")}
                >
                  Искать
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TABS 2: ЗАПИСИ (APPOINTMENTS) */}
        {currentTab === "appointments" && (
          <div className="gov-employee-appointments">
            <div className="appointments-header">
              <h3 className="gov-section-title">Расписание приемов</h3>
              
              {/* Date Calendar strip */}
              <div className="calendar-strip">
                {datesList.map((day) => (
                  <button
                    key={day.dateStr}
                    type="button"
                    className={`calendar-day-btn ${selectedDate === day.dateStr ? "selected" : ""}`}
                    onClick={() => setSelectedDate(day.dateStr)}
                  >
                    <span className="weekday">{day.label.split(" ")[0]}</span>
                    <span className="daynum">{day.label.split(" ")[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Timetable Grid */}
            <div className="timetable-container gov-card">
              <div className="timetable-header-date">
                Расписание на <b>{datesList.find(d => d.dateStr === selectedDate)?.fullLabel || selectedDate}</b>
              </div>

              <div className="timetable-list">
                {timeSlots.map((time) => {
                  // Find appointment matching selectedDate and slot time
                  const app = appointments.find(a => a.date === selectedDate && a.time === time);
                  
                  return (
                    <div key={time} className={`timetable-row ${app ? "has-appointment " + app.status : "empty"}`}>
                      <div className="time-slot-label">{time}</div>
                      
                      <div className="slot-content">
                        {app ? (
                          <div className="appointment-card-inner" onClick={() => setSelectedAppointment(app)}>
                            <div className="appointment-info">
                              <span className="patient-name-field">{app.patient_name}</span>
                              <span className="patient-reason-field">{app.reason}</span>
                            </div>
                            <div className="appointment-meta-right">
                              <span className={`status-badge-mini ${app.status}`}>
                                {app.status === "pending" && "Ожидается"}
                                {app.status === "arrived" && "Пришел"}
                                {app.status === "completed" && "Завершен"}
                                {app.status === "cancelled" && "Отменен"}
                              </span>
                              <span className="cabinet-number-field">Каб. {app.cabinet}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="empty-slot-label">Свободно</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Appointment Detail Modal / Sidebar Panel */}
            {selectedAppointment && (
              <div className="employee-modal" onClick={() => setSelectedAppointment(null)}>
                <div className="employee-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header-row">
                    <h3>Детали записи на прием</h3>
                    <button type="button" className="close-modal-btn" onClick={() => setSelectedAppointment(null)}>×</button>
                  </div>

                  <div className="modal-body-content">
                    <table className="info-table-details">
                      <tbody>
                        <tr>
                          <td>Пациент:</td>
                          <td><b>{selectedAppointment.patient_name}</b></td>
                        </tr>
                        <tr>
                          <td>ИИН:</td>
                          <td>{selectedAppointment.patient_iin}</td>
                        </tr>
                        <tr>
                          <td>Телефон:</td>
                          <td>{selectedAppointment.patient_phone}</td>
                        </tr>
                        <tr>
                          <td>Дата приема:</td>
                          <td>{selectedAppointment.date}</td>
                        </tr>
                        <tr>
                          <td>Время приема:</td>
                          <td><b>{selectedAppointment.time}</b></td>
                        </tr>
                        <tr>
                          <td>Причина обращения:</td>
                          <td>{selectedAppointment.reason}</td>
                        </tr>
                        <tr>
                          <td>Статус записи:</td>
                          <td>
                            <span className={`status-badge-mini ${selectedAppointment.status}`}>
                              {selectedAppointment.status === "pending" && "Ожидается"}
                              {selectedAppointment.status === "arrived" && "Пациент пришел"}
                              {selectedAppointment.status === "completed" && "Прием завершен"}
                              {selectedAppointment.status === "cancelled" && "Отменено"}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td>Кабинет:</td>
                          <td>№{selectedAppointment.cabinet}</td>
                        </tr>
                        {selectedAppointment.comment && (
                          <tr>
                            <td>Комментарий:</td>
                            <td><i>{selectedAppointment.comment}</i></td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <div className="modal-actions-buttons">
                      {/* Common Actions */}
                      <button 
                        type="button" 
                        className="modal-btn outline-btn"
                        onClick={() => openPatientCard(selectedAppointment.patient_id)}
                      >
                        Открыть карточку пациента
                      </button>

                      {/* Doctor/Nurse Actions */}
                      {role === "doctor" && (selectedAppointment.status === "pending" || selectedAppointment.status === "arrived") && (
                        <button 
                          type="button" 
                          className="modal-btn action-primary-btn"
                          onClick={() => startAppointment(selectedAppointment)}
                        >
                          Начать прием
                        </button>
                      )}

                      {/* Status switch buttons */}
                      {selectedAppointment.status === "pending" && (
                        <button 
                          type="button" 
                          className="modal-btn status-arrived-btn"
                          onClick={() => updateAppointmentStatus(selectedAppointment.id, "arrived")}
                        >
                          Пациент пришел
                        </button>
                      )}

                      {selectedAppointment.status === "arrived" && (
                        <button 
                          type="button" 
                          className="modal-btn status-completed-btn"
                          onClick={() => updateAppointmentStatus(selectedAppointment.id, "completed")}
                        >
                          Завершить прием
                        </button>
                      )}

                      {/* Cancel Record */}
                      {selectedAppointment.status !== "completed" && selectedAppointment.status !== "cancelled" && (
                        <button 
                          type="button" 
                          className="modal-btn status-cancel-btn"
                          onClick={() => updateAppointmentStatus(selectedAppointment.id, "cancelled")}
                        >
                          Отменить запись
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TABS 3: ПАЦИЕНТЫ (PATIENTS) */}
        {currentTab === "patients" && (
          <div className="gov-employee-patients">
            <h3 className="gov-section-title">Список записанных пациентов</h3>
            
            <div className="patients-search-row">
              <input 
                type="text" 
                placeholder="Поиск по ФИО или ИИН..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="patient-search-input"
              />
            </div>

            <div className="patients-grid-list">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((pat) => (
                  <div key={pat.id} className="patient-info-card gov-card">
                    <div className="patient-card-title">
                      <h4>{pat.full_name}</h4>
                      <span className="patient-iin-badge">ИИН: {pat.iin}</span>
                    </div>

                    <div className="patient-card-meta">
                      <p><b>Телефон:</b> {pat.phone}</p>
                      <p><b>Дата рождения:</b> {pat.birth_date}</p>
                      <p><b>Хронические заболевания:</b> {pat.chronic_conditions}</p>
                    </div>

                    <div className="patient-card-actions">
                      <button 
                        type="button" 
                        className="patient-action-link"
                        onClick={() => {
                          setSelectedPatient(pat);
                          changeTab("medical_records");
                        }}
                      >
                        Медицинская карта
                      </button>
                      <button 
                        type="button" 
                        className="patient-action-link"
                        onClick={() => {
                          setSelectedPatient(pat);
                          setSelectedAppointment(null);
                          // Open patient profile modal
                        }}
                      >
                        Посмотреть анкету
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-records-label">Пациенты не найдены.</div>
              )}
            </div>
          </div>
        )}

        {/* TABS 4: МЕДИЦИНСКАЯ КАРТА (MEDICAL RECORDS) */}
        {currentTab === "medical_records" && (
          <div className="gov-employee-medical-records">
            {!selectedPatient ? (
              <div className="no-patient-selected-panel gov-card text-center">
                <h3>Медицинская карта пациента</h3>
                <p>Пожалуйста, выберите пациента из списка во вкладке "Пациенты" или начните прием из календаря записей.</p>
                <button type="button" className="btn-link-action" onClick={() => changeTab("patients")}>
                  Перейти к списку пациентов
                </button>
              </div>
            ) : (
              <div className="medical-card-layout">
                {/* Back Link */}
                <div className="back-link-row">
                  <button type="button" className="back-link-btn" onClick={() => setSelectedPatient(null)}>
                    ← Вернуться к выбору пациента
                  </button>
                </div>

                {/* Patient Summary Header */}
                <div className="patient-summary-header gov-card">
                  <div className="patient-summary-profile">
                    <h3>{selectedPatient.full_name}</h3>
                    <p className="summary-iin">ИИН: {selectedPatient.iin} | Дата рождения: {selectedPatient.birth_date}</p>
                  </div>
                  <div className="patient-summary-indicators">
                    <span className="indicator-tag">Группа крови: <b>{selectedPatient.blood_type}</b></span>
                    <span className="indicator-tag warning-tag">Аллергии: <b>{selectedPatient.allergies}</b></span>
                    <span className="indicator-tag chronic-tag">Хронические: <b>{selectedPatient.chronic_conditions}</b></span>
                  </div>
                </div>

                {/* Main Medical Split Layout */}
                <div className="medical-split-grid">
                  
                  {/* Left Column: History list */}
                  <div className="medical-history-column gov-card">
                    <h4>История посещений ({selectedPatient.records?.length || 0})</h4>
                    
                    <div className="history-entries-list">
                      {selectedPatient.records && selectedPatient.records.length > 0 ? (
                        selectedPatient.records.map((rec) => (
                          <div key={rec.id} className="history-record-entry">
                            <div className="entry-head">
                              <span className="entry-date">{rec.date}</span>
                              <span className="entry-doctor">Врач: {rec.doctor_name}</span>
                            </div>
                            <div className="entry-body">
                              <p><b>Жалобы:</b> {rec.complaints}</p>
                              <p><b>Осмотр:</b> {rec.inspection}</p>
                              <p><b>Диагноз:</b> <span className="text-diagnosis">{rec.diagnosis}</span></p>
                              <p><b>Рекомендации:</b> {rec.recommendations}</p>
                              {rec.prescriptions && <p><b>Назначения:</b> <code>{rec.prescriptions}</code></p>}
                              {rec.comment && <p className="entry-comment"><i>Комментарий: {rec.comment}</i></p>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-records-label">Нет записей в истории посещений.</div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Adding new entry */}
                  {canAddMedicalRecords ? (
                    <div className="medical-entry-form-column gov-card">
                      <h4>Добавить новую запись приема</h4>
                      
                      <form className="medical-record-add-form" onSubmit={handleAddMedicalRecord}>
                        <div className="form-group-item">
                          <label>Жалобы пациента *</label>
                          <textarea 
                            rows="2" 
                            placeholder="Опишите жалобы пациента..."
                            value={medicalRecordForm.complaints}
                            onChange={(e) => setMedicalRecordForm(prev => ({ ...prev, complaints: e.target.value }))}
                            required
                          />
                        </div>

                        <div className="form-group-item">
                          <label>Осмотр (объективные данные)</label>
                          <textarea 
                            rows="2" 
                            placeholder="Данные осмотра (давление, температура, зев и т.д.)..."
                            value={medicalRecordForm.inspection}
                            onChange={(e) => setMedicalRecordForm(prev => ({ ...prev, inspection: e.target.value }))}
                          />
                        </div>

                        <div className="form-group-item">
                          <label>Диагноз (или предварительный диагноз) *</label>
                          <input 
                            type="text" 
                            placeholder="Код МКБ-10 или название диагноза..."
                            value={medicalRecordForm.diagnosis}
                            onChange={(e) => setMedicalRecordForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                            required
                          />
                        </div>

                        <div className="form-group-item">
                          <label>Рекомендации</label>
                          <textarea 
                            rows="2" 
                            placeholder="Диета, режим, гигиена..."
                            value={medicalRecordForm.recommendations}
                            onChange={(e) => setMedicalRecordForm(prev => ({ ...prev, recommendations: e.target.value }))}
                          />
                        </div>

                        <div className="form-group-item">
                          <label>Назначения (лекарства, процедуры, дозировка)</label>
                          <textarea 
                            rows="2" 
                            placeholder="Название препарата, доза, кратность и длительность приема..."
                            value={medicalRecordForm.prescriptions}
                            onChange={(e) => setMedicalRecordForm(prev => ({ ...prev, prescriptions: e.target.value }))}
                          />
                        </div>

                        <div className="form-group-item">
                          <label>Комментарий врача (для внутренних заметок)</label>
                          <input 
                            type="text" 
                            placeholder="Дополнительные примечания..."
                            value={medicalRecordForm.comment}
                            onChange={(e) => setMedicalRecordForm(prev => ({ ...prev, comment: e.target.value }))}
                          />
                        </div>

                        <div className="form-actions-row">
                          <button type="submit" className="save-record-submit-btn">
                            Сохранить и внести в карту
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="medical-entry-form-column gov-card disabled-column">
                      <h4>Новая запись приема</h4>
                      <p className="no-access-message">Вам недоступно добавление записей в медицинскую карту (необходима роль врача).</p>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        )}

        {/* TABS 5: ДОКУМЕНТЫ (DOCUMENTS) */}
        {currentTab === "documents" && (
          <div className="gov-employee-documents">
            <h3 className="gov-section-title">Прикрепленные документы пациента</h3>
            
            <div className="gov-card">
              <table className="documents-list-table">
                <thead>
                  <tr>
                    <th>Тип документа</th>
                    <th>Файл</th>
                    <th>Дата добавления</th>
                    <th>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><b>Результаты общего анализа крови</b></td>
                    <td>BloodTest_Report.pdf</td>
                    <td>14.06.2026</td>
                    <td>
                      <a href="#" className="download-doc-link" onClick={(e) => { e.preventDefault(); alert("Скачивание файла..."); }}>
                        Скачать
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td><b>Справка формы 075/у</b></td>
                    <td>MedicalCertificate_075.pdf</td>
                    <td>10.06.2026</td>
                    <td>
                      <a href="#" className="download-doc-link" onClick={(e) => { e.preventDefault(); alert("Скачивание файла..."); }}>
                        Скачать
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td><b>Выписка из стационара</b></td>
                    <td>HospitalReleaseSummary.pdf</td>
                    <td>25.05.2026</td>
                    <td>
                      <a href="#" className="download-doc-link" onClick={(e) => { e.preventDefault(); alert("Скачивание файла..."); }}>
                        Скачать
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TABS 6: УВЕДОМЛЕНИЯ (NOTIFICATIONS) */}
        {currentTab === "notifications" && (
          <div className="gov-employee-notifications">
            <h3 className="gov-section-title">Уведомления и оповещения</h3>
            
            <div className="notifications-list-block">
              {notifications.map((not) => (
                <div key={not.id} className={`notification-item-row ${not.type}`}>
                  <div className="notification-icon">
                    {not.type === "new_appointment" && "📅"}
                    {not.type === "cancelled" && "❌"}
                    {not.type === "schedule" && "⏰"}
                    {not.type === "system" && "⚙️"}
                  </div>
                  <div className="notification-desc-details">
                    <h4>{not.title}</h4>
                    <p>{not.message}</p>
                    <span className="not-time-stamp">{not.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TABS 7: СОТРДНИКИ ОТДЕЛЕНИЯ (DEPARTMENT STAFF - for department_head) */}
        {isDepartmentHead && currentTab === "department_staff" && (
          <div className="gov-department-staff">
            <h3 className="gov-section-title">Сотрудники вашего отделения</h3>
            
            <div className="department-staff-dashboard gov-card">
              <p>Вы вошли как Заведующий отделением. Здесь показаны ваши коллеги, прикрепленные к этому же отделению.</p>
              
              <table className="staff-info-table">
                <thead>
                  <tr>
                    <th>ФИО</th>
                    <th>Должность</th>
                    <th>Кабинет</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><b>Касенов Мурат Серикович</b></td>
                    <td>Врач-терапевт</td>
                    <td>Каб. 305</td>
                    <td><span className="staff-active-tag">В сети</span></td>
                  </tr>
                  <tr>
                    <td><b>Садвакасова Динара Аскаровна</b></td>
                    <td>Старшая медсестра</td>
                    <td>Каб. 301</td>
                    <td><span className="staff-active-tag">В сети</span></td>
                  </tr>
                  <tr>
                    <td><b>Омаров Бауржан Канатович</b></td>
                    <td>Медбрат</td>
                    <td>Каб. 301</td>
                    <td><span className="staff-offline-tag">Не в сети</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TABS 8: КОНТРОЛЬ (CONTROL - for deputy_chief_doctor) */}
        {isDeputyChief && currentTab === "control" && (
          <div className="gov-deputy-control">
            <h3 className="gov-section-title">Контроль деятельности организации</h3>
            
            <div className="control-stats-dashboard">
              
              <div className="stats-row-grid">
                <div className="control-indicator-card gov-card">
                  <h4>Всего приемов сегодня</h4>
                  <span className="big-stat-number">48</span>
                  <p>Включая все отделения организации</p>
                </div>

                <div className="control-indicator-card gov-card">
                  <h4>Среднее время ожидания</h4>
                  <span className="big-stat-number text-yellow">12 мин</span>
                  <p>Соответствует нормативам Минздрава</p>
                </div>

                <div className="control-indicator-card gov-card">
                  <h4>Заполняемость медкарт</h4>
                  <span className="big-stat-number text-green">94%</span>
                  <p>Высокая своевременность ввода записей</p>
                </div>
              </div>

              {/* Department loads */}
              <div className="department-occupancy-chart gov-card">
                <h4>Нагрузка по отделениям</h4>
                <div className="chart-bar-row">
                  <span className="chart-label">Терапевтическое отделение</span>
                  <div className="chart-bar-container">
                    <div className="chart-bar-fill" style={{ width: "85%", background: "#00b85a" }}>85%</div>
                  </div>
                </div>
                <div className="chart-bar-row">
                  <span className="chart-label">Педиатрическое отделение</span>
                  <div className="chart-bar-container">
                    <div className="chart-bar-fill" style={{ width: "65%", background: "#00a344" }}>65%</div>
                  </div>
                </div>
                <div className="chart-bar-row">
                  <span className="chart-label">Хирургическое отделение</span>
                  <div className="chart-bar-container">
                    <div className="chart-bar-fill" style={{ width: "40%", background: "#008f3b" }}>40%</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
