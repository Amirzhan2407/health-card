import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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

export default function BookAppointmentPage() {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");

  const [step, setStep] = useState(1);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);

  const [doctors, setDoctors] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState([]);

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
      list.push({
        dateStr: d.toISOString().split("T")[0],
        weekday: d.toLocaleDateString("ru-RU", { weekday: "short" }),
        daynum: d.getDate(),
        month: d.toLocaleDateString("ru-RU", { month: "short" }),
        fullLabel: d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
      });
    }
    return list;
  };
  const datesList = getNext14Days();

  // Time slots template
  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", 
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", 
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"
  ];

  // Fetch Organizations (Step 1)
  useEffect(() => {
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
  }, []);

  // Fetch Departments when Organization is chosen (Step 2)
  const handleSelectOrg = async (org) => {
    setSelectedOrg(org);
    setSelectedDept(null);
    setSelectedDoc(null);
    setStep(2);
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

  // Fetch Doctors when Department is chosen (Step 3)
  const handleSelectDept = async (dept) => {
    setSelectedDept(dept);
    setSelectedDoc(null);
    setStep(3);
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

  // Select Doctor (Step 4)
  const handleSelectDoc = (doc) => {
    setSelectedDoc(doc);
    setSelectedDate(datesList[0]?.dateStr || "");
    setSelectedTime("");
    setStep(4);
  };

  // Load Booked Slots when Date or Doctor changes
  useEffect(() => {
    if (!selectedDoc || !selectedDate) return;
    async function loadBookedSlots() {
      try {
        const res = await fetch(
          `${API_URL}/api/organization-structure/appointments?employee_id=${selectedDoc.id}&date=${selectedDate}`
        );
        const data = await res.json();
        if (res.ok) {
          // Filter out active or arrived bookings to disable those time slots
          const activeTimes = (data.appointments || [])
            .filter((app) => app.status !== "cancelled")
            .map((app) => app.time);
          setBookedSlots(activeTimes);
        }
      } catch (err) {
        console.warn("Could not load slot availability:", err);
      }
    }
    loadBookedSlots();
  }, [selectedDoc, selectedDate]);

  // Submit Booking Form (Step 5)
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
        setStep(6);
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

  return (
    <div className="book-appointment-container">
      {/* Step Progress Header */}
      {step <= 5 && (
        <div className="booking-progress-header">
          <div className="progress-steps-row">
            {[1, 2, 3, 4, 5].map((s) => (
              <React.Fragment key={s}>
                <div 
                  className={`progress-step-node ${step === s ? "active" : step > s ? "completed" : ""}`}
                  onClick={() => s < step && setStep(s)}
                >
                  {s}
                </div>
                {s < 5 && <div className={`progress-step-line ${step > s ? "completed" : ""}`} />}
              </React.Fragment>
            ))}
          </div>
          <div className="step-label-text">
            {step === 1 && "Шаг 1: Выберите медицинскую организацию"}
            {step === 2 && "Шаг 2: Выберите клиническое отделение"}
            {step === 3 && "Шаг 3: Выберите лечащего врача"}
            {step === 4 && "Шаг 4: Выберите удобную дату и время приёма"}
            {step === 5 && "Шаг 5: Подтверждение личных данных"}
          </div>
        </div>
      )}

      {error && <div className="booking-error-alert">{error}</div>}
      {loading && step !== 5 && <div className="booking-loading-spinner">Загрузка данных...</div>}

      {/* STEP 1: CHOOSE CLINIC */}
      {step === 1 && !loading && (
        <div className="step-view">
          <div className="search-box-row">
            <input 
              type="text" 
              placeholder="Поиск по названию клиники или городу..."
              value={searchOrg}
              onChange={(e) => setSearchOrg(e.target.value)}
              className="clinic-search-input"
            />
          </div>

          <div className="cards-grid">
            {filteredOrgs.length > 0 ? (
              filteredOrgs.map((org) => (
                <div key={org.id} className="clinic-card" onClick={() => handleSelectOrg(org)}>
                  <div className="clinic-card-icon">🏥</div>
                  <div className="clinic-card-info">
                    <h4>{org.organization_name}</h4>
                    <span className="clinic-city-badge">📍 {org.city || "Казахстан"}</span>
                  </div>
                  <div className="clinic-card-action">Выбрать ›</div>
                </div>
              ))
            ) : (
              <div className="empty-results">Клиники не найдены.</div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: CHOOSE DEPARTMENT */}
      {step === 2 && !loading && (
        <div className="step-view">
          <button type="button" className="booking-back-btn" onClick={() => setStep(1)}>
            ← Назад к выбору клиники
          </button>
          
          <div className="clinic-quick-info">
            Клиника: <b>{selectedOrg?.organization_name}</b>
          </div>

          <div className="cards-grid">
            {departments.length > 0 ? (
              departments.map((dept) => (
                <div key={dept.id} className="dept-card" onClick={() => handleSelectDept(dept)}>
                  <div className="dept-card-icon">🩺</div>
                  <div className="dept-card-info">
                    <h4>{dept.name}</h4>
                    <span className="dept-meta-info">Этаж: {dept.floor} • Кабинеты: {dept.rooms}</span>
                  </div>
                  <div className="dept-card-action">Выбрать ›</div>
                </div>
              ))
            ) : (
              <div className="empty-results">В данной клинике не добавлены отделения.</div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: CHOOSE DOCTOR */}
      {step === 3 && !loading && (
        <div className="step-view">
          <button type="button" className="booking-back-btn" onClick={() => setStep(2)}>
            ← Назад к выбору отделения
          </button>
          
          <div className="clinic-quick-info">
            Клиника: <b>{selectedOrg?.organization_name}</b> • Отделение: <b>{selectedDept?.name}</b>
          </div>

          <div className="cards-grid">
            {doctors.length > 0 ? (
              doctors.map((doc) => (
                <div key={doc.id} className="doctor-card" onClick={() => handleSelectDoc(doc)}>
                  <div className="doctor-avatar">
                    {doc.full_name?.split(" ").slice(0,2).map(n=>n[0]).join("") || "Д"}
                  </div>
                  <div className="doctor-card-info">
                    <h4>{doc.full_name}</h4>
                    <p className="doc-pos">{doc.position || "Врач-специалист"}</p>
                    <span className="doc-cab">Кабинет №{doc.cabinet || "—"}</span>
                  </div>
                  <div className="doctor-card-action">Записаться ›</div>
                </div>
              ))
            ) : (
              <div className="empty-results">В этом отделении пока нет доступных врачей.</div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: CHOOSE DATE AND TIME */}
      {step === 4 && (
        <div className="step-view">
          <button type="button" className="booking-back-btn" onClick={() => setStep(3)}>
            ← Назад к выбору врача
          </button>

          <div className="doctor-summary-header">
            <div className="doctor-avatar mini">
              {selectedDoc?.full_name?.split(" ").slice(0,2).map(n=>n[0]).join("") || "Д"}
            </div>
            <div>
              <h3>{selectedDoc?.full_name}</h3>
              <p>{selectedDoc?.position} • Кабинет №{selectedDoc?.cabinet}</p>
            </div>
          </div>

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
                }}
              >
                <span className="weekday">{day.weekday}</span>
                <span className="daynum">{day.daynum}</span>
                <span className="month">{day.month}</span>
              </button>
            ))}
          </div>

          <div className="timetable-section-title">
            Доступное время на <b>{datesList.find(d => d.dateStr === selectedDate)?.fullLabel || selectedDate}</b>
          </div>

          {/* Time Slot Grid */}
          <div className="time-slots-grid">
            {timeSlots.map((time) => {
              const isBooked = bookedSlots.includes(time);
              return (
                <button
                  key={time}
                  type="button"
                  disabled={isBooked}
                  className={`time-slot-node ${selectedTime === time ? "selected" : ""} ${isBooked ? "booked" : ""}`}
                  onClick={() => setSelectedTime(time)}
                >
                  <span className="time-val">{time}</span>
                  <span className="status-val">{isBooked ? "Занято" : "Свободно"}</span>
                </button>
              );
            })}
          </div>

          <div className="next-step-btn-container">
            <button
              type="button"
              disabled={!selectedDate || !selectedTime}
              className="booking-action-btn"
              onClick={() => setStep(5)}
            >
              Подтвердить время приёма
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: FILL DETAILS & CONFIRM */}
      {step === 5 && (
        <div className="step-view">
          <button type="button" className="booking-back-btn" onClick={() => setStep(4)}>
            ← Назад к выбору даты и времени
          </button>

          <div className="booking-summary-checkout-card">
            <h4>Детали вашей записи:</h4>
            <div className="checkout-row">
              <span>Клиника:</span>
              <b>{selectedOrg?.organization_name}</b>
            </div>
            <div className="checkout-row">
              <span>Отделение:</span>
              <b>{selectedDept?.name}</b>
            </div>
            <div className="checkout-row">
              <span>Врач:</span>
              <b>{selectedDoc?.full_name}</b>
            </div>
            <div className="checkout-row">
              <span>Кабинет:</span>
              <b>№{selectedDoc?.cabinet || "—"}</b>
            </div>
            <div className="checkout-row highlight">
              <span>Дата и время:</span>
              <b>{datesList.find(d => d.dateStr === selectedDate)?.fullLabel} в {selectedTime}</b>
            </div>
          </div>

          <form onSubmit={handleBookingSubmit} className="booking-checkout-form">
            <h3>Личные данные пациента</h3>

            <div className="input-group">
              <label htmlFor="fullName">ФИО пациента <span className="req">*</span></label>
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
                <label htmlFor="iin">ИИН пациента <span className="req">*</span></label>
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
                <label htmlFor="phone">Контактный телефон</label>
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
              <label htmlFor="email">Электронная почта <span className="req">*</span></label>
              <input 
                id="email"
                type="email" 
                placeholder="your-email@mail.ru"
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
              <span className="input-hint">Сюда будет выслан электронный талон с QR-кодом для приёма</span>
            </div>

            <div className="input-group">
              <label htmlFor="reason">Причина обращения</label>
              <input 
                id="reason"
                type="text" 
                placeholder="Плановый осмотр, жалобы и т.д."
                value={form.reason}
                onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>

            <div className="input-group">
              <label htmlFor="comment">Комментарий для врача</label>
              <textarea 
                id="comment"
                placeholder="Дополнительные сведения, которые вы хотите передать врачу заранее"
                value={form.comment}
                onChange={(e) => setForm(prev => ({ ...prev, comment: e.target.value }))}
              />
            </div>

            <button type="submit" disabled={loading} className="booking-action-btn submit-btn">
              {loading ? "Оформление записи..." : "Подтвердить и записаться"}
            </button>
          </form>
        </div>
      )}

      {/* STEP 6: SUCCESS CONFIRMATION COUPON */}
      {step === 6 && successData && (
        <div className="step-view success-view">
          <div className="success-checkmark-wrapper">
            <div className="checkmark-circle">✓</div>
            <h2>Запись успешно оформлена!</h2>
            <p>Электронный талон отправлен на почту <b>{successData.patient_email}</b></p>
          </div>

          {/* Ticket Talon */}
          <div className="medical-talon-sheet">
            <div className="talon-header">
              <h3>ЭЛЕКТРОННЫЙ ТАЛОН</h3>
              <span>Clinic OS Booking System</span>
            </div>

            <div className="talon-body">
              <div className="talon-fields">
                <div className="talon-field">
                  <span className="label">Пациент</span>
                  <span className="value">{successData.patient_name}</span>
                </div>
                <div className="talon-field">
                  <span className="label">ИИН</span>
                  <span className="value">{successData.patient_iin}</span>
                </div>
                <div className="talon-field">
                  <span className="label">Медицинская организация</span>
                  <span className="value">{selectedOrg?.organization_name}</span>
                </div>
                <div className="talon-field">
                  <span className="label">Специалист</span>
                  <span className="value">{selectedDoc?.full_name} ({selectedDoc?.position})</span>
                </div>
                <div className="talon-field highlight-field">
                  <span className="label">Дата и время приема</span>
                  <span className="value">
                    {datesList.find(d => d.dateStr === successData.date)?.fullLabel || successData.date} в <b>{successData.time}</b>
                  </span>
                </div>
                <div className="talon-field">
                  <span className="label">Кабинет</span>
                  <span className="value">№{successData.cabinet || selectedDoc?.cabinet || "—"}</span>
                </div>
              </div>

              <div className="talon-qrcode">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ClinicOS_Appointment_${successData.id}`} 
                  alt="QR Talon" 
                  className="talon-qr-img"
                />
                <span className="qr-caption">Покажите этот код при входе в клинику</span>
              </div>
            </div>

            <div className="talon-footer">
              Пожалуйста, приходите за 10 минут до назначенного времени приёма.
            </div>
          </div>

          <div className="success-actions-row">
            <button type="button" className="booking-action-btn outline-btn" onClick={() => navigate("/")}>
              На главную
            </button>
            <button type="button" className="booking-action-btn" onClick={() => {
              setStep(1);
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
              Записаться еще раз
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
