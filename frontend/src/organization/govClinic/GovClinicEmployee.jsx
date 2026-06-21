import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";

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

const getBirthDateFromIin = (iin) => {
  if (!iin || iin.length !== 12) return "—";
  const yy = iin.slice(0, 2);
  const mm = iin.slice(2, 4);
  const dd = iin.slice(4, 6);
  const centuryDigit = iin[6];
  let yearPrefix = "19";
  if (centuryDigit === "5" || centuryDigit === "6") yearPrefix = "20";
  else if (centuryDigit === "1" || centuryDigit === "2") yearPrefix = "18";
  return `${yearPrefix}${yy}-${mm}-${dd}`;
};

const getGenderFromIin = (iin) => {
  if (!iin || iin.length !== 12) return "Не определён";
  const genderDigit = iin[6];
  if (["1", "3", "5"].includes(genderDigit)) return "Мужской";
  if (["2", "4", "6"].includes(genderDigit)) return "Женский";
  return "Не определён";
};

export default function GovClinicEmployee() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "dashboard";
  const { t } = useLanguage();

  // Auth local storage data
  const user = JSON.parse(localStorage.getItem("organizationUser") || "null");
  const organization = JSON.parse(localStorage.getItem("organizationData") || "null");

  // Dynamic States
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(new Date().getFullYear(), 11, 31).toISOString().split("T")[0]
  );
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationAppId, setVerificationAppId] = useState(null);
  const [verificationCodeInput, setVerificationCodeInput] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // New Dynamic States
  const [reviews, setReviews] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [finishingAppId, setFinishingAppId] = useState(null);
  const [calendarView, setCalendarView] = useState("week"); // day | week
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date().toISOString().split("T")[0]);

  // History Filter States
  const [historySearch, setHistorySearch] = useState("");
  const [historyMonth, setHistoryMonth] = useState("");
  const [historyYear, setHistoryYear] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [historyDate, setHistoryDate] = useState("");
  const [historySort, setHistorySort] = useState("date_desc"); // date_desc, date_asc, name_asc

  // Voluntary Change Password Form
  const [changePwdForm, setChangePwdForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });


  // Start/Finish & Consultation States
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [showStartCodeModal, setShowStartCodeModal] = useState(false);
  const [startCodeInput, setStartCodeInput] = useState("");
  const [startCodeAppId, setStartCodeAppId] = useState(null);
  const [startCodeError, setStartCodeError] = useState("");
  
  const [activeConsultation, setActiveConsultation] = useState({
    complaints: "",
    symptoms: "",
    diagnosis: "",
    treatment: "",
    recommendations: "",
    comment: "",
    files: []
  });

  const [certForm, setCertForm] = useState({
    title: "",
    type: "sick_leave",
    valid_until: ""
  });
  const [issuingCert, setIssuingCert] = useState(false);

  const [showFinishOtpModal, setShowFinishOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [finishError, setFinishError] = useState("");
  
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
      let empId = user.id;

      try {
        // Load employees to find current matching employee profile
        const empRes = await fetch(
          `${API_URL}/api/organization-structure/employees?organization_id=${user.organization_id}`
        );
        if (empRes.ok) {
          const empData = await empRes.json();
          const match = (empData.employees || []).find(e => 
            (e.login && user.login && e.login.toLowerCase() === user.login.toLowerCase()) ||
            (e.email && user.email && e.email.toLowerCase() === user.email.toLowerCase()) ||
            (e.full_name && user.full_name && e.full_name.toLowerCase().trim() === user.full_name.toLowerCase().trim())
          );
          if (match) {
            setEmployeeProfile(match);
            empId = match.id;
          } else {
            setEmployeeProfile({
              id: user.id,
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

      // Initialize mock / local arrays
      setPatients(MOCK_PATIENTS);
      setNotifications(MOCK_NOTIFICATIONS);

      // Load appointments from real API
      try {
        const appRes = await fetch(
          `${API_URL}/api/organization-structure/appointments?employee_id=${empId}&startDate=${startDate}&endDate=${endDate}`
        );
        if (appRes.ok) {
          const appData = await appRes.json();
          const loadedApps = appData.appointments || [];
          setAppointments(loadedApps);

          // Populate patient profiles from loaded appointments dynamically
          if (loadedApps.length > 0) {
            setPatients(prev => {
              const unique = [...prev];
              loadedApps.forEach(app => {
                if (app.patient_name && app.patient_iin && !unique.some(p => p.iin === app.patient_iin)) {
                  unique.push({
                    id: app.patient_id || app.patient_iin,
                    iin: app.patient_iin,
                    full_name: app.patient_name,
                    phone: app.patient_phone || "—",
                    email: app.patient_email || "—",
                    birth_date: getBirthDateFromIin(app.patient_iin),
                    gender: getGenderFromIin(app.patient_iin),
                    blood_type: "Не указана",
                    allergies: "Нет",
                    chronic_conditions: "Нет",
                    records: []
                  });
                }
              });
              return unique;
            });

            // Restore active in-progress appointment
            const inProgress = loadedApps.find(a => a.status === "in_progress" || a.status === "waiting_finish_confirmation");
            if (inProgress) {
              setActiveAppointment(inProgress);
              try {
                const draftRes = await fetch(`${API_URL}/api/organization-structure/appointments/${inProgress.id}/draft`);
                const draftData = await draftRes.json();
                if (draftRes.ok && draftData && draftData.draft) {
                  setActiveConsultation(draftData.draft);
                } else {
                  setActiveConsultation({
                    complaints: "",
                    symptoms: "",
                    diagnosis: inProgress.reason || "",
                    treatment: "",
                    recommendations: "",
                    comment: "",
                    files: []
                  });
                }
              } catch (de) {
                console.warn("Could not load draft:", de);
              }

              const pat = {
                id: inProgress.patient_id || inProgress.patient_iin,
                iin: inProgress.patient_iin,
                full_name: inProgress.patient_name || "Пациент",
                phone: inProgress.patient_phone || "—",
                email: inProgress.patient_email || "—",
                birth_date: getBirthDateFromIin(inProgress.patient_iin),
                gender: getGenderFromIin(inProgress.patient_iin),
                blood_type: "Не указана",
                allergies: "Нет",
                chronic_conditions: "Нет",
                records: []
              };
              setSelectedPatient(pat);
            }
          }
        } else {
          setAppointments([]);
        }
      } catch (err) {
        console.warn("Appointments API fetch error:", err);
        setAppointments([]);
      }

      // Fetch Reviews
      try {
        const revRes = await fetch(`${API_URL}/api/organization-structure/employees/${empId}/reviews`);
        if (revRes.ok) {
          const revData = await revRes.json();
          setReviews(revData.reviews || []);
        }
      } catch (err) {
        console.warn("Failed to load reviews:", err);
      }

      // Fetch Schedule
      try {
        const schedRes = await fetch(`${API_URL}/api/organization-structure/employees/${empId}/schedule`);
        if (schedRes.ok) {
          const schedData = await schedRes.json();
          setSchedule(schedData.schedule || null);
        }
      } catch (err) {
        console.warn("Failed to load schedule:", err);
      }
    }

    loadAllData();
  }, [user, startDate, endDate]);

  // Debounced autosave of active consultation draft
  useEffect(() => {
    if (!activeAppointment || !activeAppointment.id) return;

    const timer = setTimeout(async () => {
      try {
        await fetch(`${API_URL}/api/organization-structure/appointments/${activeAppointment.id}/draft`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft: activeConsultation })
        });
      } catch (err) {
        console.warn("Autosave draft failed:", err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [activeConsultation, activeAppointment]);

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

  const todayStr = new Date().toISOString().split("T")[0];

  const getCategorizedAppointments = () => {
    const todayList = [];
    const futureList = [];
    const pastList = [];

    appointments.forEach((app) => {
      if (app.status === "completed" || app.status === "cancelled" || app.status === "rejected" || app.date < todayStr) {
        pastList.push(app);
      } else if (app.date === todayStr) {
        todayList.push(app);
      } else {
        futureList.push(app);
      }
    });

    const sortByTime = (a, b) => {
      const da = `${a.date}T${a.time}`;
      const db = `${b.date}T${b.time}`;
      return da.localeCompare(db);
    };
    const sortByTimeDesc = (a, b) => {
      const da = `${a.date}T${a.time}`;
      const db = `${b.date}T${b.time}`;
      return db.localeCompare(da);
    };

    todayList.sort(sortByTime);
    futureList.sort(sortByTime);
    pastList.sort(sortByTimeDesc);

    return { todayList, futureList, pastList };
  };

  async function submitVerificationCode(e) {
    e.preventDefault();
    if (!verificationCodeInput || verificationCodeInput.length !== 4) {
      setVerificationError("Код должен состоять из 4 цифр.");
      return;
    }

    setVerifying(true);
    setVerificationError("");

    try {
      const res = await fetch(`${API_URL}/api/organization-structure/appointments/${verificationAppId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", verificationCode: verificationCodeInput })
      });
      const result = await res.json();
      if (!res.ok) {
        setVerificationError(result.message || "Неверный код подтверждения.");
      } else {
        setMessage("Прием успешно завершен.");
        setAppointments(prev =>
          prev.map(app => (app.id === verificationAppId ? { ...app, status: "completed" } : app))
        );
        if (selectedAppointment && selectedAppointment.id === verificationAppId) {
          setSelectedAppointment(prev => ({ ...prev, status: "completed" }));
        }
        setShowVerificationModal(false);
      }
    } catch (err) {
      setVerificationError("Сетевая ошибка при проверке кода.");
    } finally {
      setVerifying(false);
    }
  }

  const renderAppointmentCard = (app) => {
    const isToday = app.date === todayStr;
    const isPast = app.status === "completed" || app.status === "cancelled" || app.status === "rejected" || app.date < todayStr;
    const isFuture = !isToday && !isPast;

    let borderLeftColor = '#94a3b8';
    if (app.status === "completed") borderLeftColor = '#10b981';
    else if (app.status === "cancelled" || app.status === "rejected") borderLeftColor = '#ef4444';
    else if (isToday) borderLeftColor = '#10b981';
    else if (isFuture) borderLeftColor = '#f59e0b';

    return (
      <div
        key={app.id}
        onClick={() => setSelectedAppointment(app)}
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderLeft: `5px solid ${borderLeftColor}`,
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '10px',
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          transition: 'transform 0.15s, box-shadow 0.15s'
        }}
        className="appointment-card-hover"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>{app.time}</span>
          <span className={`status-badge-mini ${app.status}`} style={{ fontSize: '11px', padding: '2px 6px' }}>
            {app.status === "pending" && "Ожидается"}
            {app.status === "arrived" && "Пришел"}
            {app.status === "completed" && "Завершен"}
            {app.status === "cancelled" && "Отменен"}
            {app.status === "rejected" && "Отклонен"}
          </span>
        </div>
        <div style={{ fontWeight: '600', fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>
          {app.patient_name}
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
          ИИН: {app.patient_iin} {app.cabinet ? `• Каб. ${app.cabinet}` : ''}
        </div>
        <div style={{ fontSize: '12px', color: '#475569', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {app.reason}
        </div>
      </div>
    );
  };

  // Action helpers
  function openPatientCard(patientId) {
    const pat = patients.find(p => p.id === patientId || p.iin === patientId);
    if (pat) {
      setSelectedPatient(pat);
      setSelectedAppointment(null);
      changeTab("patients");
    }
  }

  function startAppointment(appointment) {
    setStartCodeAppId(appointment.id);
    setStartCodeInput("");
    setStartCodeError("");
    setShowStartCodeModal(true);
  }

  async function submitStartCode(e) {
    e.preventDefault();
    if (!startCodeInput) return;
    setVerifying(true);
    setStartCodeError("");
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/appointments/${startCodeAppId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: startCodeInput })
      });
      const data = await res.json();
      if (res.ok && data && data.success) {
        setShowStartCodeModal(false);
        const activeApp = data.appointment || appointments.find(a => a.id === startCodeAppId);
        setActiveAppointment(activeApp);
        
        // Find or create patient
        let pat = patients.find(p => p.id === activeApp.patient_id || p.iin === activeApp.patient_iin);
        if (!pat) {
          pat = {
            id: activeApp.patient_id || activeApp.patient_iin,
            iin: activeApp.patient_iin,
            full_name: activeApp.patient_name || "Пациент",
            phone: activeApp.patient_phone || "—",
            email: activeApp.patient_email || "—",
            birth_date: getBirthDateFromIin(activeApp.patient_iin),
            gender: getGenderFromIin(activeApp.patient_iin),
            blood_type: "Не указана",
            allergies: "Нет",
            chronic_conditions: "Нет",
            records: []
          };
          setPatients(prev => [...prev, pat]);
        }
        setSelectedPatient(pat);
        
        // Reset active consultation values
        setActiveConsultation({
          complaints: "",
          symptoms: "",
          diagnosis: activeApp.reason || "",
          treatment: "",
          recommendations: "",
          comment: "",
          files: []
        });
        setSelectedAppointment(null);
        changeTab("medical_records");
        alert("Прием успешно начат!");
      } else {
        setStartCodeError(data?.message || "Неверный код талона / QR-кода.");
      }
    } catch (err) {
      setStartCodeError("Сетевая ошибка при начале приема.");
    } finally {
      setVerifying(false);
    }
  }

  async function requestFinishAppointment() {
    if (!activeAppointment) return;
    setLoading(true);
    setFinishError("");
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/appointments/${activeAppointment.id}/request-finish`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        setFinishingAppId(activeAppointment.id);
        setOtpInput("");
        setShowFinishOtpModal(true);
      } else {
        alert(data.message || "Ошибка при генерации кода завершения.");
      }
    } catch (err) {
      alert("Сетевая ошибка.");
    } finally {
      setLoading(false);
    }
  }

  async function submitFinishOtp(e) {
    e.preventDefault();
    if (!otpInput || otpInput.length !== 4) {
      setFinishError("Код должен содержать 4 цифры.");
      return;
    }
    setVerifying(true);
    setFinishError("");
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/appointments/${activeAppointment.id}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp: otpInput,
          complaints: activeConsultation.complaints,
          symptoms: activeConsultation.symptoms,
          diagnosis: activeConsultation.diagnosis,
          treatment: activeConsultation.treatment,
          recommendations: activeConsultation.recommendations,
          comment: activeConsultation.comment,
          files: activeConsultation.files
        })
      });
      const result = await res.json();
      if (res.ok) {
        alert("Прием успешно завершен!");
        setShowFinishOtpModal(false);
        setActiveAppointment(null);
        // Refresh appointments list
        setAppointments(prev => prev.map(a => a.id === activeAppointment.id ? { ...a, status: "completed" } : a));
        setSelectedPatient(null);
        changeTab("dashboard");
      } else {
        setFinishError(result.message || "Неверный код завершения.");
      }
    } catch (err) {
      setFinishError("Ошибка сети при подтверждении кода.");
    } finally {
      setVerifying(false);
    }
  }

  async function generateAndUploadCertificate(e) {
    e.preventDefault();
    if (!activeAppointment || !selectedPatient) return;
    if (!certForm.title || !certForm.valid_until) {
      alert("Заполните название справки и срок действия.");
      return;
    }
    setIssuingCert(true);
    try {
      // 1. Generate PDF locally using jsPDF
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      doc.setFont("helvetica", "normal");
      doc.setFontSize(20);
      doc.text("MEDICAL CERTIFICATE / МЕДИЦИНСКАЯ СПРАВКА", 20, 30);
      
      doc.setFontSize(12);
      doc.text(`Organization / Организация: ${organization?.organization_name || "Clinic OS Partner"}`, 20, 50);
      doc.text(`Patient Name / ФИО: ${selectedPatient.full_name}`, 20, 60);
      doc.text(`Patient IIN / ИИН: ${selectedPatient.iin}`, 20, 70);
      doc.text(`Doctor / Врач: ${user?.full_name || "Doctor"}`, 20, 80);
      doc.text(`Certificate Title / Название справки: ${certForm.title}`, 20, 90);
      doc.text(`Type / Тип: ${certForm.type === "sick_leave" ? "Больничный лист" : "Медицинская справка"}`, 20, 100);
      doc.text(`Valid Until / Действителен до: ${certForm.valid_until}`, 20, 110);
      doc.text(`Issued Date / Дата выдачи: ${new Date().toLocaleDateString("ru-RU")}`, 20, 120);

      doc.text("Signature & Stamp / Подпись и печать: ______________________", 20, 150);

      const pdfBlob = doc.output("blob");
      const fileName = `Certificate_${selectedPatient.iin}_${Date.now()}.pdf`;

      // 2. Upload PDF to storage via support-upload
      const formData = new FormData();
      formData.append("file", pdfBlob, fileName);

      const uploadRes = await fetch(`${API_URL}/api/organization-structure/support-upload`, {
        method: "POST",
        headers: { "x-organization-id": activeAppointment.organization_id },
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.file_url) {
        throw new Error(uploadData.message || "Ошибка загрузки файла справки");
      }

      // 3. Issue certificate in database
      const certRes = await fetch(`${API_URL}/api/organization-structure/appointments/${activeAppointment.id}/certificate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: certForm.title,
          certificate_type: certForm.type,
          file_url: uploadData.file_url,
          valid_until: certForm.valid_until
        })
      });
      const certData = await certRes.json();
      if (certRes.ok) {
        alert("Медицинская справка успешно выписана и загружена в медкарту пациента.");
        setCertForm({ title: "", type: "sick_leave", valid_until: "" });
      } else {
        alert(certData.message || "Ошибка выписки справки.");
      }
    } catch (err) {
      alert("Ошибка при генерации/загрузке справки: " + err.message);
    } finally {
      setIssuingCert(false);
    }
  }

  const isNoShowButtonEnabled = (appDate, appTime) => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (appDate < todayStr) return true;
    if (appDate > todayStr) return false;
    const [h, m] = appTime.split(":").map(Number);
    const appTimeMs = new Date().setHours(h, m + 10, 0, 0);
    return Date.now() >= appTimeMs;
  };

  const getWeekDays = (baseDateStr) => {
    const days = [];
    const base = new Date(baseDateStr + "T00:00:00");
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        dateStr,
        dayName: d.toLocaleDateString(language === "kz" ? "kk-KZ" : (language === "en" ? "en-US" : "ru-RU"), { weekday: "short" }),
        dateNum: d.getDate(),
        monthName: d.toLocaleDateString(language === "kz" ? "kk-KZ" : (language === "en" ? "en-US" : "ru-RU"), { month: "short" })
      });
    }
    return days;
  };

  function renderActiveVisit() {
    if (!activeAppointment || !selectedPatient) return null;
    return (
      <div className="gov-employee-cabinet active-visit-mode" style={{ padding: "24px", background: "#f0fdf4", minHeight: "100vh" }}>
        {/* Banner Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: "20px 24px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(15,23,42,0.05)", marginBottom: "24px", border: "1px solid rgba(0, 184, 90, 0.2)" }}>
          <div>
            <h2 style={{ margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: "10px", fontSize: "22px", fontWeight: "900" }}>
              <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "50%", background: "#10b981", animation: "pulse 1.5s infinite" }}></span>
              {t("conductingVisit") || "🩺 Проводится приём пациента"}
            </h2>
            <p style={{ margin: "6px 0 0", color: "#475569", fontWeight: "600", fontSize: "15px" }}>
              {selectedPatient.full_name} • {t("iin") || "ИИН"}: {selectedPatient.iin} • {t("phone") || "Телефон"}: {selectedPatient.phone}
            </p>
          </div>
          <button 
            type="button" 
            onClick={() => {
              if (confirm("Вы действительно хотите свернуть окно приема? Черновик сохранен на сервере, вы сможете продолжить прием в любое время из календаря.")) {
                setActiveAppointment(null);
                setSelectedPatient(null);
                changeTab("appointments");
              }
            }}
            style={{ background: "#f1f5f9", color: "#0f172a", border: "1px solid #cbd5e1", padding: "10px 18px", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}
          >
            {t("minimizeVisit") || "◀ Вернуться к списку записей"}
          </button>
        </div>

        {/* Form Split Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "24px" }}>
          
          {/* Left Column: Patient Anketa & History */}
          <div className="gov-card" style={{ background: "#ffffff", display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <h3 style={{ borderBottom: "2px solid #f1f5f9", paddingBottom: "12px", margin: "0 0 16px 0", color: "#0f172a" }}>👤 {t("patientAnketa") || "Анкета пациента"}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "14px", color: "#334155" }}>
                <p><b>{t("birthDate") || "Дата рождения"}:</b> {selectedPatient.birth_date}</p>
                <p><b>{t("gender") || "Пол"}:</b> {selectedPatient.gender === "Мужской" ? t("male") : t("female")}</p>
                <p><b>{t("bloodType") || "Группа крови"}:</b> {selectedPatient.blood_type || "Не указана"}</p>
                <p style={{ color: "#dc2626" }}><b>{t("allergies") || "Аллергии"}:</b> {selectedPatient.allergies || "Нет"}</p>
                <p><b>{t("chronicConditions") || "Хронические болезни"}:</b> {selectedPatient.chronic_conditions || "Нет"}</p>
              </div>
            </div>

            <div>
              <h3 style={{ borderBottom: "2px solid #f1f5f9", paddingBottom: "12px", margin: "0 0 16px 0", color: "#0f172a" }}>📜 {t("historyTab") || "История посещений"} ({selectedPatient.records?.length || 0})</h3>
              <div style={{ maxHeight: "450px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "6px" }}>
                {selectedPatient.records && selectedPatient.records.length > 0 ? (
                  selectedPatient.records.map((rec) => (
                    <div key={rec.id} style={{ background: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>
                        <b>{rec.date}</b>
                        <span>{rec.doctor_name}</span>
                      </div>
                      <p style={{ margin: "4px 0", fontSize: "13px", color: "#334155" }}><b>{t("complaints") || "Жалобы"}:</b> {rec.complaints}</p>
                      <p style={{ margin: "4px 0", fontSize: "13px", color: "#334155" }}><b>{t("diagnosisLabel") || "Диагноз"}:</b> <span style={{ color: "#00b85a", fontWeight: "bold" }}>{rec.diagnosis}</span></p>
                      <p style={{ margin: "4px 0", fontSize: "13px", color: "#334155" }}><b>{t("treatmentLabel") || "Лечение"}:</b> {rec.prescriptions || rec.treatment}</p>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "#64748b", fontStyle: "italic", textAlign: "center", margin: "32px 0" }}>{t("noVisitHistory") || "История посещений пуста"}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Active Consultation Form */}
          <div className="gov-card" style={{ background: "#ffffff", border: "2px solid #00b85a", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#00b85a" }}>✏️ {t("visitForm") || "Заполнение протокола приема"}</h3>
              <span style={{ fontSize: "12px", background: "#d1fae5", color: "#065f46", padding: "4px 10px", borderRadius: "8px", fontWeight: "bold" }}>
                💾 {t("draftAutosaved") || "Черновик автосохраняется"}
              </span>
            </div>

            <div className="org-admin-form" style={{ gap: "14px" }}>
              <label>
                {t("complaints") || "Жалобы пациента"} *
                <textarea 
                  rows="2" 
                  value={activeConsultation.complaints} 
                  onChange={(e) => setActiveConsultation(prev => ({ ...prev, complaints: e.target.value }))}
                  placeholder="Например, острая боль, кашель..."
                  required
                />
              </label>

              <label>
                {t("symptomsLabel") || "Симптомы / Объективные данные"}
                <textarea 
                  rows="2" 
                  value={activeConsultation.symptoms} 
                  onChange={(e) => setActiveConsultation(prev => ({ ...prev, symptoms: e.target.value }))}
                  placeholder="Температура, давление, зев..."
                />
              </label>

              <label>
                {t("diagnosisLabel") || "Диагноз"} *
                <input 
                  type="text" 
                  value={activeConsultation.diagnosis} 
                  onChange={(e) => setActiveConsultation(prev => ({ ...prev, diagnosis: e.target.value }))}
                  placeholder="Например: ОРВИ J06.9"
                  required
                />
              </label>

              <label>
                {t("treatmentLabel") || "Лечение / Назначения"}
                <textarea 
                  rows="2" 
                  value={activeConsultation.treatment} 
                  onChange={(e) => setActiveConsultation(prev => ({ ...prev, treatment: e.target.value }))}
                  placeholder="Схема лечения, рецепты..."
                />
              </label>

              <label>
                {t("recommendationsLabel") || "Рекомендации"}
                <textarea 
                  rows="2" 
                  value={activeConsultation.recommendations} 
                  onChange={(e) => setActiveConsultation(prev => ({ ...prev, recommendations: e.target.value }))}
                  placeholder="Диета, режим, гигиена..."
                />
              </label>

              <label>
                {t("commentLabel") || "Комментарий"}
                <input 
                  type="text" 
                  value={activeConsultation.comment} 
                  onChange={(e) => setActiveConsultation(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Примечания..."
                />
              </label>

              {/* Issue Official Certificate */}
              <div style={{ border: "1px dashed #cbd5e1", borderRadius: "12px", padding: "14px", background: "#f8fafc" }}>
                <h5 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#334155" }}>📋 {t("issueCert") || "Выписать справку"}</h5>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="Название справки (например, Справка 095/у)"
                    value={certForm.title}
                    onChange={(e) => setCertForm(prev => ({ ...prev, title: e.target.value }))}
                    style={{ padding: "8px", fontSize: "13px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff" }}
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      value={certForm.type}
                      onChange={(e) => setCertForm(prev => ({ ...prev, type: e.target.value }))}
                      style={{ padding: "8px", fontSize: "13px", flex: 1, borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff" }}
                    >
                      <option value="sick_leave">Больничный лист</option>
                      <option value="general_health">Общая справка о здоровье</option>
                    </select>
                    <input
                      type="date"
                      value={certForm.valid_until}
                      onChange={(e) => setCertForm(prev => ({ ...prev, valid_until: e.target.value }))}
                      style={{ padding: "8px", fontSize: "13px", width: "130px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={generateAndUploadCertificate}
                    disabled={issuingCert}
                    style={{ background: "#3b82f6", color: "#fff", border: "0", padding: "10px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
                  >
                    {issuingCert ? "Выписка справки..." : "Выписать и загрузить справку"}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={requestFinishAppointment}
                className="save-record-submit-btn"
                style={{ background: "#00b85a", color: "#fff", border: "0", padding: "14px", borderRadius: "14px", fontWeight: "bold", cursor: "pointer", fontSize: "15px", marginTop: "10px", width: "100%" }}
              >
                🏁 {t("finishVisitBtn") || "Завершить приём (Запросить OTP)"}
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Filtered patients for search
  const filteredPatients = patients.filter(p => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return p.full_name.toLowerCase().includes(query) || p.iin.includes(query);
  });

  if (!user) {
    return <div style={{ padding: 20 }}>Ошибка: Пользователь не авторизован.</div>;
  }

  if (activeAppointment) {
    return renderActiveVisit();
  }

  const role = user.role;

  // Active schedule values helper
  const activeSchedule = schedule || {
    work_start: "09:00",
    work_end: "18:00",
    lunch_start: "13:00",
    lunch_end: "14:00",
    slot_duration: 30,
    work_days: [1, 2, 3, 4, 5]
  };

  const getDayHoursRange = () => {
    return `${activeSchedule.work_start} – ${activeSchedule.work_end}`;
  };

  const getLunchBreakRange = () => {
    return `${activeSchedule.lunch_start} – ${activeSchedule.lunch_end}`;
  };

  // Find nearest pending appointment
  const getNearestAppointment = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todays = appointments
      .filter(a => a.date === todayStr && (a.status === "pending" || a.status === "arrived"))
      .sort((a, b) => a.time.localeCompare(b.time));
    return todays.length > 0 ? todays[0] : null;
  };

  const nearestApp = getNearestAppointment();

  // Ratings calculation helper
  const ratingDistribution = Array(10).fill(0);
  reviews.forEach(r => {
    const val = Math.round(r.rating || r.rating_value || 8);
    if (val >= 1 && val <= 10) {
      ratingDistribution[val - 1]++;
    }
  });

  const totalReviewsCount = reviews.length;

  // Sort and Filter History visits
  const filteredHistory = appointments.filter(app => {
    const isPast = app.status === "completed" || app.status === "cancelled";
    if (!isPast) return false;

    if (historySearch) {
      const q = historySearch.toLowerCase().trim();
      if (!app.patient_name?.toLowerCase().includes(q) && !app.patient_iin?.includes(q)) {
        return false;
      }
    }
    if (historyDate && app.date !== historyDate) return false;

    if (app.date) {
      const [year, month] = app.date.split("-");
      if (historyYear && year !== historyYear) return false;
      if (historyMonth && month !== historyMonth.padStart(2, "0")) return false;
    }

    if (historyStatus && app.status !== historyStatus) return false;

    return true;
  });

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    if (historySort === "date_desc") {
      return `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`);
    } else if (historySort === "date_asc") {
      return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
    } else if (historySort === "name_asc") {
      return (a.patient_name || "").localeCompare(b.patient_name || "");
    }
    return 0;
  });

  // Handle password change form submit
  const handleVoluntaryPasswordChange = async (e) => {
    e.preventDefault();
    if (!changePwdForm.currentPassword || !changePwdForm.newPassword || !changePwdForm.confirmPassword) {
      alert("Заполните все поля.");
      return;
    }
    if (changePwdForm.newPassword !== changePwdForm.confirmPassword) {
      alert("Новые пароли не совпадают.");
      return;
    }
    if (changePwdForm.newPassword.length < 6) {
      alert("Пароль должен быть не менее 6 символов.");
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(changePwdForm.newPassword)) {
      alert("Пароль должен содержать как буквы, так и цифры.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/organizations/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          currentPassword: changePwdForm.currentPassword,
          newPassword: changePwdForm.newPassword
        })
      });
      const result = await response.json();
      if (response.ok) {
        alert("Пароль успешно изменен!");
        setChangePwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        alert(result.message || "Ошибка смены пароля.");
      }
    } catch (err) {
      alert("Ошибка сети.");
    }
  };

  // Generate calendar grid structure
  const calendarDays = calendarView === "week" ? getWeekDays(selectedCalendarDate) : [{
    dateStr: selectedCalendarDate,
    dayName: new Date(selectedCalendarDate + "T00:00:00").toLocaleDateString(language === "kz" ? "kk-KZ" : (language === "en" ? "en-US" : "ru-RU"), { weekday: "short" }),
    dateNum: new Date(selectedCalendarDate + "T00:00:00").getDate(),
    monthName: new Date(selectedCalendarDate + "T00:00:00").toLocaleDateString(language === "kz" ? "kk-KZ" : (language === "en" ? "en-US" : "ru-RU"), { month: "short" })
  }];

  const startHourNum = Number(activeSchedule.work_start.split(":")[0]);
  const endHourNum = Number(activeSchedule.work_end.split(":")[0]);
  const stepMin = activeSchedule.slot_duration;

  const getCalendarTimeSlots = () => {
    const slots = [];
    let curMin = startHourNum * 60;
    const endMin = endHourNum * 60;
    while (curMin + stepMin <= endMin) {
      const h = Math.floor(curMin / 60);
      const m = curMin % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      curMin += stepMin;
    }
    return slots;
  };

  const calendarTimeSlots = getCalendarTimeSlots();

  return (
    <div className="gov-employee-cabinet">
      {/* Messages */}
      {message && <div className="gov-success">{message}</div>}
      {error && <div className="gov-error">{error}</div>}

      {/* Tabs Content */}
      <div className="gov-employee-tab-content">
        
        {/* TABS 1: ГЛАВНАЯ (DASHBOARD) */}
        {currentTab === "dashboard" && (
          <div className="gov-employee-dashboard">
            <h3 className="gov-section-title">{t("employeeDashboardTitle") || "Панель управления сотрудника"}</h3>
            
            <div className="employee-dashboard-grid">
              
              <div className="employee-stat-card cursor-pointer" onClick={() => changeTab("appointments")}>
                <span className="stat-card-title">{t("todayAppointments") || "Записи на сегодня"}</span>
                <span className="stat-card-number">{appointments.filter(a => a.date === new Date().toISOString().split("T")[0] && a.status !== "cancelled").length}</span>
                <span className="stat-card-desc">{t("todayAppointmentsDesc") || "Всего активных записей на сегодня"}</span>
              </div>

              <div className="employee-stat-card highlight-card">
                <span className="stat-card-title">{t("nextPatient") || "Ближайший пациент"}</span>
                {nearestApp ? (
                  <>
                    <span className="stat-card-name">{nearestApp.patient_name}</span>
                    <span className="stat-card-time">{t("time") || "Время"}: {nearestApp.time}</span>
                    <button 
                      type="button" 
                      className="dashboard-action-btn"
                      onClick={() => startAppointment(nearestApp)}
                    >
                      {t("startVisit") || "Начать прием"}
                    </button>
                  </>
                ) : (
                  <span className="stat-card-desc">{t("noMoreAppointmentsToday") || "На сегодня записей больше нет"}</span>
                )}
              </div>

              <div className="employee-stat-card">
                <span className="stat-card-title">{t("todaySchedule") || "Сегодняшний график"}</span>
                <span className="stat-card-value" style={{ display: "block", marginTop: "10px", fontSize: "20px", fontWeight: "bold", color: "#0f172a" }}>
                  {getDayHoursRange()}
                </span>
                <span className="stat-card-desc">{t("lunchBreak") || "Обед"}: {getLunchBreakRange()}</span>
              </div>

              <div className="employee-stat-card cursor-pointer" onClick={() => changeTab("profile")}>
                <span className="stat-card-title">{t("rating") || "Текущий рейтинг"}</span>
                <span className="stat-card-number" style={{ color: "#f59e0b" }}>★ {employeeProfile?.average_rating || "8.0"}</span>
                <span className="stat-card-desc">{t("basedOnReviews") || "На основе"} {employeeProfile?.rating_count || 0} {t("reviews") || "оценок"}</span>
              </div>

            </div>

            {/* Quick search input panel */}
            <div className="quick-actions-panel gov-card" style={{ marginTop: "24px" }}>
              <h3>{t("quickPatientHistorySearch") || "Быстрый поиск визитов пациента"}</h3>
              <div className="search-bar-inline">
                <input 
                  type="text" 
                  placeholder="Введите ФИО или ИИН пациента..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
                <button 
                  type="button"
                  className="quick-search-btn"
                  onClick={() => changeTab("history")}
                >
                  {t("search") || "Искать"}
                </button>
              </div>
            </div>

            {/* Banner details profile */}
            <div className="gov-card" style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <h4>ℹ️ {t("workplaceDetails") || "Детали рабочего места"}</h4>
                <div style={{ display: "grid", gap: "8px", marginTop: "12px", fontSize: "14px" }}>
                  <p><b>{t("cabinet") || "Кабинет"}:</b> №{employeeProfile?.cabinet || "—"}</p>
                  <p><b>{t("specialty") || "Специальность"}:</b> {employeeProfile?.specialty || "Врач"}</p>
                  <p><b>{t("department") || "Отделение"}:</b> {employeeProfile?.department || "Не назначено"}</p>
                  <p><b>{t("slotDurationLabel") || "Длительность приема"}:</b> {activeSchedule.slot_duration} {t("minutes") || "минут"}</p>
                </div>
              </div>
              <div>
                <h4>🔔 {t("latestNotifications") || "Последние уведомления"}</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                  {notifications.slice(0, 3).map(not => (
                    <div key={not.id} style={{ fontSize: "13px", padding: "8px", background: "#f8fafc", borderRadius: "8px", borderLeft: "4px solid #3b82f6" }}>
                      <b>{not.title}</b>: {not.message}
                    </div>
                  ))}
                  {notifications.length === 0 && <p style={{ fontStyle: "italic", fontSize: "13px", color: "#64748b" }}>Нет уведомлений</p>}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TABS 2: ЗАПИСИ (APPOINTMENTS) - CALENDAR GRID */}
        {currentTab === "appointments" && (
          <div className="gov-employee-appointments">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 className="gov-section-title" style={{ margin: 0 }}>{t("appointmentsTab") || "Календарь приемов"}</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  type="button" 
                  onClick={() => setCalendarView("day")} 
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: calendarView === "day" ? "#00b85a" : "#fff", color: calendarView === "day" ? "#fff" : "#0f172a", fontWeight: "bold", cursor: "pointer" }}
                >
                  {t("dayView") || "День"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setCalendarView("week")} 
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: calendarView === "week" ? "#00b85a" : "#fff", color: calendarView === "week" ? "#fff" : "#0f172a", fontWeight: "bold", cursor: "pointer" }}
                >
                  {t("weekView") || "Неделя"}
                </button>
              </div>
            </div>

            {/* Date Navigator */}
            <div className="gov-card" style={{ display: "flex", gap: "15px", alignItems: "center", marginBottom: "20px", padding: "12px 20px" }}>
              <button 
                type="button" 
                onClick={() => {
                  const d = new Date(selectedCalendarDate + "T00:00:00");
                  d.setDate(d.getDate() - (calendarView === "week" ? 7 : 1));
                  setSelectedCalendarDate(d.toISOString().split("T")[0]);
                }}
                style={{ background: "#f1f5f9", border: "0", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
              >
                ◀ {t("back") || "Назад"}
              </button>
              <input 
                type="date"
                value={selectedCalendarDate}
                onChange={(e) => setSelectedCalendarDate(e.target.value)}
                style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "bold" }}
              />
              <button 
                type="button" 
                onClick={() => {
                  const d = new Date(selectedCalendarDate + "T00:00:00");
                  d.setDate(d.getDate() + (calendarView === "week" ? 7 : 1));
                  setSelectedCalendarDate(d.toISOString().split("T")[0]);
                }}
                style={{ background: "#f1f5f9", border: "0", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
              >
                {t("forward") || "Вперед"} ▶
              </button>
              <button 
                type="button" 
                onClick={() => setSelectedCalendarDate(new Date().toISOString().split("T")[0])}
                style={{ marginLeft: "auto", background: "#3b82f6", color: "#fff", border: "0", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}
              >
                {t("today") || "Сегодня"}
              </button>
            </div>

            {/* Grid Container */}
            <div className="gov-card" style={{ overflowX: "auto", padding: "16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: calendarView === "week" ? "800px" : "100%" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px", width: "80px", textAlign: "center", color: "#64748b" }}>{t("time") || "Время"}</th>
                    {calendarDays.map((day) => {
                      const isToday = day.dateStr === new Date().toISOString().split("T")[0];
                      return (
                        <th key={day.dateStr} style={{ padding: "12px", textAlign: "center", background: isToday ? "#e0f2fe" : "transparent", borderLeft: "1px solid #e2e8f0" }}>
                          <span style={{ display: "block", fontSize: "12px", color: isToday ? "#0284c7" : "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>{day.dayName}</span>
                          <span style={{ fontSize: "18px", fontWeight: "900", color: isToday ? "#0369a1" : "#0f172a" }}>{day.dateNum} {day.monthName}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {calendarTimeSlots.map((slot) => (
                    <tr key={slot} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold", color: "#475569", fontSize: "13px" }}>{slot}</td>
                      {calendarDays.map((day) => {
                        const isWorkingDay = activeSchedule.work_days.includes(new Date(day.dateStr + "T00:00:00").getDay() === 0 ? 7 : new Date(day.dateStr + "T00:00:00").getDay());
                        const isLunch = slot >= activeSchedule.lunch_start && slot < activeSchedule.lunch_end;
                        const app = appointments.find(a => a.date === day.dateStr && a.time === slot && a.status !== "cancelled");

                        let cellStyle = { background: "#fff", position: "relative", borderLeft: "1px solid #e2e8f0", verticalAlign: "middle" };
                        let content = null;

                        if (app) {
                          const isFinished = app.status === "completed";
                          const isInProgress = app.status === "in_progress" || app.status === "waiting_finish_confirmation";
                          
                          cellStyle.background = isFinished ? "#e2e8f0" : (isInProgress ? "#d1fae5" : "#e0f2fe");
                          cellStyle.borderLeft = isFinished ? "4px solid #94a3b8" : (isInProgress ? "4px solid #10b981" : "4px solid #3b82f6");
                          
                          const noShowEnabled = isNoShowButtonEnabled(app.date, app.time) && (app.status === "pending" || app.status === "arrived");

                          content = (
                            <div style={{ padding: "8px", fontSize: "13px" }}>
                              <div style={{ fontWeight: "bold", color: "#1e293b" }}>{app.patient_name}</div>
                              <div style={{ fontSize: "11px", color: "#64748b", margin: "2px 0" }}>ИИН: {app.patient_iin}</div>
                              <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                                <button 
                                  type="button" 
                                  onClick={() => setSelectedAppointment(app)}
                                  style={{ padding: "2px 6px", fontSize: "10px", borderRadius: "4px", border: "1px solid #3b82f6", background: "#fff", color: "#3b82f6", cursor: "pointer", fontWeight: "bold" }}
                                >
                                  {t("open") || "Открыть"}
                                </button>
                                {(app.status === "pending" || app.status === "arrived") && (
                                  <button 
                                    type="button" 
                                    onClick={() => startAppointment(app)}
                                    style={{ padding: "2px 6px", fontSize: "10px", borderRadius: "4px", border: "0", background: "#10b981", color: "#fff", cursor: "pointer", fontWeight: "bold" }}
                                  >
                                    {t("startVisit") || "Принять"}
                                  </button>
                                )}
                                {noShowEnabled && (
                                  <button 
                                    type="button" 
                                    onClick={() => updateAppointmentStatus(app.id, "cancelled")}
                                    style={{ padding: "2px 6px", fontSize: "10px", borderRadius: "4px", border: "0", background: "#ef4444", color: "#fff", cursor: "pointer", fontWeight: "bold" }}
                                  >
                                    {t("patientNotArrived") || "Не пришел"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        } else if (isLunch) {
                          cellStyle.background = "#f1f5f9";
                          content = <span style={{ color: "#94a3b8", fontSize: "11px", fontStyle: "italic", textAlign: "center", display: "block" }}>{t("lunchBreak") || "Обед"}</span>;
                        } else if (!isWorkingDay) {
                          cellStyle.background = "#fef2f2";
                          content = <span style={{ color: "#f87171", fontSize: "11px", fontStyle: "italic", textAlign: "center", display: "block" }}>{t("weekendDay") || "Выходной"}</span>;
                        } else {
                          content = <span style={{ color: "#cbd5e1", fontSize: "11px", fontStyle: "italic", textAlign: "center", display: "block" }}>{t("freeSlot") || "Свободно"}</span>;
                        }

                        return (
                          <td key={day.dateStr} style={cellStyle}>
                            {content}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Appointment Detail Modal */}
            {selectedAppointment && (
              <div className="employee-modal" onClick={() => setSelectedAppointment(null)}>
                <div className="employee-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: "min(500px, 100%)", padding: "24px" }}>
                  <div className="modal-header-row">
                    <h3>{t("appointmentDetails") || "Детали записи"}</h3>
                    <button type="button" className="close-modal-btn" onClick={() => setSelectedAppointment(null)}>×</button>
                  </div>
                  <div style={{ marginTop: "16px", display: "grid", gap: "12px", fontSize: "14px" }}>
                    <p><b>{t("fullName") || "Пациент"}:</b> {selectedAppointment.patient_name}</p>
                    <p><b>{t("iin") || "ИИН"}:</b> {selectedAppointment.patient_iin}</p>
                    <p><b>{t("phone") || "Телефон"}:</b> {selectedAppointment.patient_phone || "—"}</p>
                    <p><b>{t("date") || "Дата"}:</b> {selectedAppointment.date}</p>
                    <p><b>{t("time") || "Время"}:</b> {selectedAppointment.time}</p>
                    <p><b>{t("reason") || "Причина"}:</b> {selectedAppointment.reason}</p>
                    <p><b>{t("status") || "Статус"}:</b> <span className={`status-badge-mini ${selectedAppointment.status}`}>{selectedAppointment.status}</span></p>
                    {selectedAppointment.patient_confirmed !== undefined && (
                      <p><b>{t("patientConfirmed") || "Подтверждено пациентом"}:</b> {selectedAppointment.patient_confirmed ? "🟢 Да" : "🔴 Нет"}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TABS 3: ИСТОРИЯ ПОСЕЩЕНИЙ (VISIT HISTORY) */}
        {currentTab === "history" && (
          <div className="gov-employee-history">
            <h3 className="gov-section-title">{t("historyTab") || "История посещений"}</h3>

            {/* Filters Bar */}
            <div className="gov-card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px", padding: "16px" }}>
              <input 
                type="text" 
                placeholder="Поиск по ФИО / ИИН..." 
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              />
              <select 
                value={historyMonth} 
                onChange={(e) => setHistoryMonth(e.target.value)}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff" }}
              >
                <option value="">{t("allMonths") || "Все месяцы"}</option>
                {["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"].map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m}</option>
                ))}
              </select>
              <select 
                value={historyYear} 
                onChange={(e) => setHistoryYear(e.target.value)}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff" }}
              >
                <option value="">{t("allYears") || "Все годы"}</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
              <select 
                value={historyStatus} 
                onChange={(e) => setHistoryStatus(e.target.value)}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff" }}
              >
                <option value="">{t("allStatuses") || "Все статусы"}</option>
                <option value="completed">Completed (Завершен)</option>
                <option value="cancelled">Cancelled (Отменен)</option>
              </select>
              <input 
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              />
              <select 
                value={historySort} 
                onChange={(e) => setHistorySort(e.target.value)}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff" }}
              >
                <option value="date_desc">{t("newestFirst") || "Сначала новые"}</option>
                <option value="date_asc">{t("oldestFirst") || "Сначала старые"}</option>
                <option value="name_asc">{t("nameAsc") || "По алфавиту (ФИО)"}</option>
              </select>
            </div>

            {/* History Table */}
            <div className="gov-card" style={{ padding: "16px", overflowX: "auto" }}>
              {sortedHistory.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                      <th style={{ padding: "12px" }}>{t("date") || "Дата и время"}</th>
                      <th style={{ padding: "12px" }}>{t("fullName") || "Пациент"}</th>
                      <th style={{ padding: "12px" }}>{t("status") || "Статус"}</th>
                      <th style={{ padding: "12px" }}>{t("details") || "Протокол осмотра"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHistory.map((item) => {
                      const isCompleted = item.status === "completed";
                      return (
                        <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                            <b>{item.date}</b> <br />
                            <span style={{ fontSize: "12px", color: "#64748b" }}>{item.time}</span>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <b>{item.patient_name}</b> <br />
                            <span style={{ fontSize: "12px", color: "#64748b" }}>ИИН: {item.patient_iin}</span>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span className={`status-badge-mini ${item.status}`} style={{ fontSize: "11px" }}>
                              {item.status === "completed" ? "Завершен" : "Отменен"}
                            </span>
                          </td>
                          <td style={{ padding: "12px", fontSize: "13px" }}>
                            {isCompleted ? (
                              <div style={{ display: "grid", gap: "4px", color: "#334155" }}>
                                {item.reason && <p style={{ margin: 0 }}><b>Жалобы при записи:</b> {item.reason}</p>}
                                {item.actual_start_time && (
                                  <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                                    Фактически: {new Date(item.actual_start_time).toLocaleTimeString()} – {item.actual_end_time ? new Date(item.actual_end_time).toLocaleTimeString() : ""}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div style={{ color: "#b91c1c" }}>
                                <p style={{ margin: 0 }}><b>Причина отмены:</b> {item.comment || "Указана администратором"}</p>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b", fontStyle: "italic" }}>
                  {t("noRecordsFound") || "История посещений по выбранным фильтрам не найдена."}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TABS 4: УВЕДОМЛЕНИЯ (NOTIFICATIONS) */}
        {currentTab === "notifications" && (
          <div className="gov-employee-notifications">
            <h3 className="gov-section-title">{t("notificationsTab") || "Уведомления и оповещения"}</h3>
            
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
              {notifications.length === 0 && (
                <p style={{ fontStyle: "italic", textAlign: "center", padding: "40px", color: "#64748b" }}>
                  {t("noNotifications") || "Уведомлений пока нет."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* TABS 5: МОЙ ПРОФИЛЬ (PROFILE & RATING) */}
        {currentTab === "profile" && (
          <div className="gov-employee-profile">
            <h3 className="gov-section-title">{t("profileTab") || "Мой профиль"}</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              
              {/* Left Column: Personal info & Password Reset */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* Doctor details card */}
                <div className="gov-card">
                  <h4 style={{ borderBottom: "2px solid #f1f5f9", paddingBottom: "12px", margin: "0 0 16px 0" }}>👤 {t("doctorProfileDetails") || "Личные данные"}</h4>
                  <div style={{ display: "grid", gap: "10px", fontSize: "14px" }}>
                    <p><b>{t("fullName") || "ФИО"}:</b> {employeeProfile?.full_name || user.full_name}</p>
                    <p><b>{t("email") || "Электронная почта"}:</b> {employeeProfile?.email || user.email}</p>
                    <p><b>{t("phone") || "Номер телефона"}:</b> {employeeProfile?.phone || "—"}</p>
                    <p><b>{t("specialty") || "Специальность"}:</b> {employeeProfile?.specialty || "Врач"}</p>
                    <p><b>{t("department") || "Отделение"}:</b> {employeeProfile?.department || "Не указано"}</p>
                    <p><b>{t("cabinet") || "Кабинет"}:</b> №{employeeProfile?.cabinet || "—"}</p>
                  </div>
                </div>

                {/* Voluntary Change Password Form */}
                <div className="gov-card">
                  <h4 style={{ borderBottom: "2px solid #f1f5f9", paddingBottom: "12px", margin: "0 0 16px 0" }}>🔒 {t("changePasswordSecurity") || "Безопасность и смена пароля"}</h4>
                  <form onSubmit={handleVoluntaryPasswordChange} className="org-admin-form" style={{ gap: "12px" }}>
                    <label>
                      {t("currentPassword") || "Текущий пароль"}
                      <input 
                        type="password"
                        value={changePwdForm.currentPassword}
                        onChange={(e) => setChangePwdForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      {t("newPassword") || "Новый пароль"}
                      <input 
                        type="password"
                        value={changePwdForm.newPassword}
                        onChange={(e) => setChangePwdForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      {t("repeatPassword") || "Подтверждение нового пароля"}
                      <input 
                        type="password"
                        value={changePwdForm.confirmPassword}
                        onChange={(e) => setChangePwdForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        required
                      />
                    </label>
                    <button type="submit" style={{ background: "#00b85a", color: "#fff", border: "0", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
                      {t("updatePasswordBtn") || "Сменить пароль"}
                    </button>
                  </form>
                </div>

              </div>

              {/* Right Column: Reviews & Star distribution */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* Ratings Dashboard */}
                <div className="gov-card">
                  <h4 style={{ borderBottom: "2px solid #f1f5f9", paddingBottom: "12px", margin: "0 0 16px 0" }}>★ {t("ratingDist") || "Рейтинг и оценки"}</h4>
                  <div style={{ display: "flex", alignItems: "center", gap: "30px", marginBottom: "20px" }}>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "48px", fontWeight: "950", color: "#f59e0b" }}>{employeeProfile?.average_rating || "8.0"}</span>
                      <span style={{ display: "block", fontSize: "13px", color: "#64748b" }}>{t("basedOnReviews") || "Всего"} {totalReviewsCount} {t("reviews") || "отзывов"}</span>
                    </div>
                    {/* Star bars */}
                    <div style={{ flex: 1, display: "grid", gap: "4px" }}>
                      {ratingDistribution.map((count, index) => {
                        const score = index + 1;
                        const percent = totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;
                        return (
                          <div key={score} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
                            <span style={{ width: "20px", textAlign: "right" }}>{score} ★</span>
                            <div style={{ flex: 1, height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{ width: `${percent}%`, height: "100%", background: "#f59e0b" }}></div>
                            </div>
                            <span style={{ width: "25px", color: "#64748b" }}>{count}</span>
                          </div>
                        );
                      }).reverse()}
                    </div>
                  </div>
                </div>

                {/* Anonymous Comments List */}
                <div className="gov-card">
                  <h4 style={{ borderBottom: "2px solid #f1f5f9", paddingBottom: "12px", margin: "0 0 16px 0" }}>💬 {t("reviewsList") || "Анонимные отзывы пациентов"}</h4>
                  <div style={{ maxHeight: "350px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "6px" }}>
                    {reviews.length > 0 ? (
                      reviews.map((rev) => (
                        <div key={rev.id} style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                            <span style={{ color: "#64748b", fontWeight: "bold" }}>{rev.dateLabel}</span>
                            <span style={{ color: "#f59e0b", fontWeight: "bold" }}>★ {rev.rating} / 10</span>
                          </div>
                          <p style={{ margin: 0, fontSize: "13px", color: "#334155" }}>"{rev.comment}"</p>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "#64748b", fontStyle: "italic", textAlign: "center", margin: "24px 0" }}>{t("noReviewsYet") || "Отзывов с комментариями пока нет."}</p>
                    )}
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