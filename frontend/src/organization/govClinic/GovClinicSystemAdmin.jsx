import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";

const API_URL = "https://health-card.onrender.com"; 

const DEPARTMENT_OPTIONS = [
  "Терапия",
  "Педиатрия",
  "Хирургия",
  "Травматология",
  "Неврология",
  "Кардиология",
  "Эндокринология",
  "ЛОР",
  "Офтальмология",
  "Гинекология",
  "Дерматология",
  "Инфекционный кабинет",
  "Рентген кабинет",
  "УЗИ кабинет",
  "Функциональная диагностика",
  "Лаборатория",
  "Регистратура",
  "Доврачебный кабинет",
  "Процедурный кабинет",
  "Прививочный кабинет",
  "Бухгалтерия",
  "ИТ отдел",
];

const POSITIONS = [
  "Врач-терапевт",
  "Врач-педиатр",
  "Врач-хирург",
  "Врач-травматолог",
  "Врач-невролог",
  "Врач-кардиолог",
  "Врач-гинеколог",
  "Врач-офтальмолог",
  "Врач-отоларинголог (ЛОР)",
  "Врач-дерматолог",
  "Врач УЗИ",
  "Врач-рентгенолог",
  "Администратор организации"
];

function generatePassword() {
  const a = Math.random().toString(36).slice(2, 6).toUpperCase();
  const b = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${a}-${b}`;
}

function getStatusText(status) {
  if (status === "active") return "Активен";
  if (status === "blocked") return "Заблокирован";
  if (status === "no_access") return "Нет доступа";
  return status || "Нет доступа";
}

export default function GovClinicSystemAdmin() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "dashboard";
  const { t } = useLanguage();

  const organizationUser = JSON.parse(
    localStorage.getItem("organizationUser") || "null"
  );

  const organizationData = JSON.parse(
    localStorage.getItem("organizationData") || "null"
  );

  const organizationId =
    organizationUser?.organization_id || organizationData?.id || "";

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [accessEmployee, setAccessEmployee] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    floor: "",
    rooms: "",
  });

  const [accessForm, setAccessForm] = useState({
    login: "",
    tempPassword: "",
  });

  const [filters, setFilters] = useState({
    search: "",
    departmentId: "all",
    status: "all",
  });

  // Employee Management States
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [savingEmployee, setSavingEmployee] = useState(false);
  
  const EMPTY_EMPLOYEE_FORM = {
    full_name: "",
    phone: "",
    email: "",
    position: "",
    department: "",
    department_id: "",
    cabinet: "",
    role: "doctor",
    work_start: "08:00",
    work_end: "17:00",
  };
  
  const [employeeForm, setEmployeeForm] = useState(EMPTY_EMPLOYEE_FORM);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [documents, setDocuments] = useState({});

  // Support Chat States
  const [supportMessages, setSupportMessages] = useState([]);
  const [newSupportMsg, setNewSupportMsg] = useState("");
  const [supportFile, setSupportFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Support Conversations/Tickets
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");

  // Doctor Schedules & Absences
  const [selectedDocForSched, setSelectedDocForSched] = useState("");
  const [docSchedule, setDocSchedule] = useState(null);
  const [schedForm, setSchedForm] = useState({
    work_days: [1, 2, 3, 4, 5],
    work_start: "08:00",
    work_end: "17:00",
    lunch_start: "13:00",
    lunch_end: "14:00",
    slot_duration: 30
  });
  const [absenceForm, setAbsenceForm] = useState({
    absence_type: "planned",
    reason: "",
    start_date: "",
    end_date: "",
    comment: ""
  });
  const [docAbsences, setDocAbsences] = useState([]);
  const [affectedApps, setAffectedApps] = useState([]);
  
  // Manual transfer modal/state
  const [transferModalApp, setTransferModalApp] = useState(null);
  const [transferForm, setTransferForm] = useState({
    new_doctor_id: "",
    new_date: "",
    new_time: "",
    transfer_reason: "Плановое отсутствие лечащего врача"
  });
  const [transferAlternateSlots, setTransferAlternateSlots] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [docExceptions, setDocExceptions] = useState([]);
  const [exceptionForm, setExceptionForm] = useState({
    exception_date: "",
    is_working: true,
    work_start: "08:00",
    work_end: "17:00",
    lunch_start: "13:00",
    lunch_end: "14:00",
    slot_duration: 30
  });

  useEffect(() => {
    if (tab === "notifications" && organizationUser?.id) {
      loadNotifications();
    }
  }, [tab, organizationUser?.id]);

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/notifications/${organizationUser.id}`);
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.warn("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  async function markNotificationRead(notifId) {
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/notifications/${notifId}/read`, {
        method: "PATCH"
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
      }
    } catch (err) {
      console.warn(err);
    }
  }

  async function markAllNotificationsRead() {
    if (!organizationUser?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/notifications/read-all/${organizationUser.id}`, {
        method: "PATCH"
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    if (!organizationId) return;
    loadData();
  }, [organizationId]);

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const [departmentsResponse, employeesResponse] = await Promise.all([
        fetch(`${API_URL}/api/organization-structure/departments`, {
          headers: {
            "x-organization-id": organizationId,
          },
        }),
        fetch(`${API_URL}/api/organization-structure/employees`, {
          headers: {
            "x-organization-id": organizationId,
          },
        }),
      ]);

      const departmentsResult = await departmentsResponse.json();
      const employeesResult = await employeesResponse.json();

      if (!departmentsResponse.ok) {
        throw new Error(departmentsResult.message || "Ошибка отделений.");
      }

      if (!employeesResponse.ok) {
        throw new Error(employeesResult.message || "Ошибка сотрудников.");
      }

      setDepartments(departmentsResult.departments || []);
      setEmployees(employeesResult.employees || []);
    } catch (error) {
      setMessage(error.message || "Ошибка загрузки данных.");
    } finally {
      setLoading(false);
    }
  }

  // Load Support tickets periodically
  useEffect(() => {
    if (tab === "support" && organizationId) {
      loadSupportConversations();
    }
  }, [tab, organizationId]);

  async function loadSupportConversations() {
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/support/conversations`, {
        headers: { "x-organization-id": organizationId }
      });
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.warn("Error loading support conversations:", err);
    }
  }

  useEffect(() => {
    if (tab === "transfers" && organizationId) {
      loadAllTransfers();
    }
  }, [tab, organizationId]);

  async function loadAllTransfers() {
    setLoading(true);
    try {
      const appRes = await fetch(`${API_URL}/api/organization-structure/appointments?organization_id=${organizationId}`);
      const appData = await appRes.json();
      if (!appRes.ok) throw new Error(appData.message || "Ошибка загрузки записей");

      const docs = employees.filter(e => e.role === "doctor" || String(e.position).toLowerCase().includes("врач"));
      let allAbsences = [];
      await Promise.all(docs.map(async (doc) => {
        try {
          const absRes = await fetch(`${API_URL}/api/organization-structure/employees/${doc.id}/absence`, {
            headers: { "x-organization-id": organizationId }
          });
          const absData = await absRes.json();
          if (absRes.ok && absData.absences) {
            allAbsences = allAbsences.concat(absData.absences.map(a => ({ ...a, doctor_name: doc.full_name })));
          }
        } catch (e) {
          console.warn("Could not fetch absences for doc:", doc.id);
        }
      }));

      const conflicting = (appData.appointments || []).filter(app => {
        const match = allAbsences.find(abs => 
          abs.employee_id === app.employee_id &&
          app.date >= abs.start_date &&
          app.date <= abs.end_date
        );
        return !!match && app.status !== "cancelled" && app.status !== "completed";
      });

      setAffectedApps(conflicting);
    } catch (e) {
      console.error("Error loading transfers:", e);
    } finally {
      setLoading(false);
    }
  }

  // Load messages for the selected ticket
  useEffect(() => {
    if (!selectedConversation) return;
    loadConversationMessages(selectedConversation.id);
    const interval = setInterval(() => loadConversationMessages(selectedConversation.id), 3000);
    return () => clearInterval(interval);
  }, [selectedConversation]);

  async function loadConversationMessages(convId) {
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/support/conversations/${convId}/messages`, {
        headers: { "x-organization-id": organizationId }
      });
      const data = await res.json();
      if (res.ok) {
        setSupportMessages(data.messages || []);
      }
    } catch (err) {
      console.warn("Error loading support messages:", err);
    }
  }

  // Load schedule and absences for a doctor
  useEffect(() => {
    if (!selectedDocForSched) return;
    loadDocSchedule(selectedDocForSched);
    loadDocAbsences(selectedDocForSched);
    loadDocExceptions(selectedDocForSched);
  }, [selectedDocForSched]);

  async function loadDocSchedule(docId) {
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/employees/${docId}/schedule`, {
        headers: { "x-organization-id": organizationId }
      });
      const data = await res.json();
      if (res.ok && data.schedule) {
        setDocSchedule(data.schedule);
        setSchedForm({
          work_days: data.schedule.work_days || [1, 2, 3, 4, 5],
          work_start: data.schedule.work_start || "08:00",
          work_end: data.schedule.work_end || "17:00",
          lunch_start: data.schedule.lunch_start || "13:00",
          lunch_end: data.schedule.lunch_end || "14:00",
          slot_duration: data.schedule.slot_duration || 30,
          start_date: data.schedule.start_date || new Date().toISOString().split('T')[0],
          end_date: data.schedule.end_date || "",
          daily_schedules: data.schedule.daily_schedules || {
            "1": { work_start: "08:00", work_end: "17:00", lunch_start: "13:00", lunch_end: "14:00", slot_duration: 30 },
            "2": { work_start: "08:00", work_end: "17:00", lunch_start: "13:00", lunch_end: "14:00", slot_duration: 30 },
            "3": { work_start: "08:00", work_end: "17:00", lunch_start: "13:00", lunch_end: "14:00", slot_duration: 30 },
            "4": { work_start: "08:00", work_end: "17:00", lunch_start: "13:00", lunch_end: "14:00", slot_duration: 30 },
            "5": { work_start: "08:00", work_end: "17:00", lunch_start: "13:00", lunch_end: "14:00", slot_duration: 30 },
            "6": { work_start: "08:00", work_end: "17:00", lunch_start: "13:00", lunch_end: "14:00", slot_duration: 30 },
            "7": { work_start: "08:00", work_end: "17:00", lunch_start: "13:00", lunch_end: "14:00", slot_duration: 30 },
          }
        });
      }
    } catch (err) {
      console.warn("Error loading doctor schedule:", err);
    }
  }

  async function saveDocSchedule(e) {
    e.preventDefault();
    if (!selectedDocForSched) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/employees/${selectedDocForSched}/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": organizationId
        },
        body: JSON.stringify(schedForm)
      });
      const data = await res.json();
      if (res.ok) {
        alert("Рабочий график успешно сохранен.");
        loadDocSchedule(selectedDocForSched);
      } else {
        alert(data.message || "Ошибка сохранения графика.");
      }
    } catch (err) {
      alert("Ошибка сети при сохранении графика.");
    } finally {
      setLoading(false);
    }
  }

  function applyTimeToAllDays() {
    if (!schedForm.work_days || schedForm.work_days.length === 0) return;
    const firstDay = schedForm.work_days[0];
    const source = schedForm.daily_schedules[String(firstDay)] || { work_start: "08:00", work_end: "17:00", lunch_start: "13:00", lunch_end: "14:00", slot_duration: 30 };
    const copy = { ...schedForm.daily_schedules };
    schedForm.work_days.forEach(d => {
      copy[String(d)] = { ...source };
    });
    setSchedForm(prev => ({ ...prev, daily_schedules: copy }));
  }

  async function loadDocAbsences(docId) {
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/employees/${docId}/absence`, {
        headers: { "x-organization-id": organizationId }
      });
      const data = await res.json();
      if (res.ok) {
        setDocAbsences(data.absences || []);
      }
    } catch (err) {
      console.warn("Error loading absences:", err);
    }
  }

  async function loadDocExceptions(docId) {
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/employees/${docId}/exceptions`, {
        headers: { "x-organization-id": organizationId }
      });
      const data = await res.json();
      if (res.ok) {
        setDocExceptions(data.exceptions || []);
      }
    } catch (err) {
      console.warn("Error loading exceptions:", err);
    }
  }

  async function logDocException(e) {
    e.preventDefault();
    if (!selectedDocForSched) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/employees/${selectedDocForSched}/exceptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": organizationId
        },
        body: JSON.stringify(exceptionForm)
      });
      const data = await res.json();
      if (res.ok) {
        alert("Исключение успешно добавлено.");
        loadDocExceptions(selectedDocForSched);
        setExceptionForm({
          exception_date: "",
          is_working: true,
          work_start: "08:00",
          work_end: "17:00",
          lunch_start: "13:00",
          lunch_end: "14:00",
          slot_duration: 30
        });
      } else {
        alert(data.message || "Ошибка добавления исключения.");
      }
    } catch (err) {
      alert("Ошибка сети.");
    } finally {
      setLoading(false);
    }
  }

  async function removeDocException(excId) {
    if (!selectedDocForSched) return;
    if (!confirm("Вы уверены, что хотите удалить это исключение?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/employees/${selectedDocForSched}/exceptions/${excId}`, {
        method: "DELETE",
        headers: { "x-organization-id": organizationId }
      });
      if (res.ok) {
        alert("Исключение удалено.");
        loadDocExceptions(selectedDocForSched);
      } else {
        alert("Ошибка удаления.");
      }
    } catch (err) {
      alert("Ошибка сети.");
    } finally {
      setLoading(false);
    }
  }

  async function logDocAbsence(e) {
    e.preventDefault();
    if (!selectedDocForSched) return;
    setLoading(true);
    setAffectedApps([]);
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/employees/${selectedDocForSched}/absence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": organizationId
        },
        body: JSON.stringify(absenceForm)
      });
      const data = await res.json();
      if (res.ok) {
        alert("Отсутствие успешно зарегистрировано.");
        if (data.affectedAppointmentsCount > 0) {
          setAffectedApps(data.affectedAppointments || []);
        }
        loadDocAbsences(selectedDocForSched);
        setAbsenceForm({
          absence_type: "planned",
          reason: "",
          start_date: "",
          end_date: "",
          comment: ""
        });
      } else {
        alert(data.message || "Ошибка регистрации отсутствия.");
      }
    } catch (err) {
      alert("Ошибка сети при регистрации отсутствия.");
    } finally {
      setLoading(false);
    }
  }

  async function removeDocAbsence(absenceId) {
    if (!selectedDocForSched) return;
    if (!confirm("Вы уверены, что хотите снять отсутствие врача?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/employees/${selectedDocForSched}/absence/${absenceId}`, {
        method: "DELETE",
        headers: { "x-organization-id": organizationId }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Отсутствие снято.");
        loadDocAbsences(selectedDocForSched);
      } else {
        alert(data.message || "Ошибка удаления.");
      }
    } catch (err) {
      alert("Ошибка сети.");
    } finally {
      setLoading(false);
    }
  }

  async function createSupportTicket(e) {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;
    setLoading(true);
    try {
      let attachmentUrl = null;
      if (supportFile) {
        setUploadingFile(true);
        const formData = new FormData();
        formData.append("file", supportFile);
        const uploadRes = await fetch(`${API_URL}/api/organization-structure/support-upload`, {
          method: "POST",
          headers: { "x-organization-id": organizationId },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.file_url) {
          attachmentUrl = uploadData.file_url;
        } else {
          throw new Error(uploadData.message || "Ошибка загрузки файла");
        }
      }

      const res = await fetch(`${API_URL}/api/organization-structure/support/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": organizationId
        },
        body: JSON.stringify({
          subject: ticketSubject.trim(),
          description: ticketDescription.trim(),
          senderName: organizationUser?.full_name || "Администратор",
          senderId: organizationUser?.id,
          messageText: ticketDescription.trim(),
          attachmentUrl
        })
      });

      const data = await res.json();
      if (res.ok) {
        setTicketSubject("");
        setTicketDescription("");
        setSupportFile(null);
        setShowNewTicketForm(false);
        loadSupportConversations();
        if (data.conversation) {
          setSelectedConversation(data.conversation);
        }
      } else {
        alert(data.message || "Ошибка создания тикета.");
      }
    } catch (err) {
      alert(err.message || "Ошибка сети.");
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  }

  async function sendSupportReply(e) {
    e.preventDefault();
    if (!selectedConversation || (!newSupportMsg.trim() && !supportFile)) return;
    setLoading(true);
    try {
      let attachmentUrl = null;
      if (supportFile) {
        setUploadingFile(true);
        const formData = new FormData();
        formData.append("file", supportFile);
        const uploadRes = await fetch(`${API_URL}/api/organization-structure/support-upload`, {
          method: "POST",
          headers: { "x-organization-id": organizationId },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.file_url) {
          attachmentUrl = uploadData.file_url;
        } else {
          throw new Error(uploadData.message || "Ошибка загрузки файла");
        }
      }

      const res = await fetch(`${API_URL}/api/organization-structure/support/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": organizationId
        },
        body: JSON.stringify({
          senderType: "org_admin",
          senderId: organizationUser?.id || organizationId,
          senderName: organizationUser?.full_name || "Администратор",
          messageText: newSupportMsg.trim(),
          attachmentUrl
        })
      });

      const data = await res.json();
      if (res.ok) {
        setNewSupportMsg("");
        setSupportFile(null);
        loadConversationMessages(selectedConversation.id);
      } else {
        alert(data.message || "Ошибка отправки.");
      }
    } catch (err) {
      alert(err.message || "Ошибка сети.");
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  }

  // Get list of doctors with same position as the conflicting appointment doctor
  const alternateDoctors = useMemo(() => {
    if (!transferModalApp) return [];
    const originalDoc = employees.find(e => e.id === transferModalApp.employee_id);
    if (!originalDoc) return [];
    
    return employees.filter(e => 
      e.id !== originalDoc.id && 
      (e.role === "doctor" || String(e.position).toLowerCase().includes("врач")) && 
      e.position === originalDoc.position
    );
  }, [transferModalApp, employees]);

  useEffect(() => {
    if (!transferForm.new_doctor_id || !transferForm.new_date) {
      setTransferAlternateSlots([]);
      return;
    }
    loadAlternateSlots(transferForm.new_doctor_id, transferForm.new_date);
  }, [transferForm.new_doctor_id, transferForm.new_date]);

  async function loadAlternateSlots(docId, date) {
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/employees/${docId}/slots?date=${date}`);
      const data = await res.json();
      if (res.ok) {
        setTransferAlternateSlots(data.slots || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleTransferSubmit(e) {
    e.preventDefault();
    if (!transferModalApp || !transferForm.new_doctor_id || !transferForm.new_date || !transferForm.new_time) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/appointments/${transferModalApp.id}/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": organizationId
        },
        body: JSON.stringify({
          new_doctor_id: transferForm.new_doctor_id,
          new_date: transferForm.new_date,
          new_time: transferForm.new_time,
          transfer_reason: transferForm.transfer_reason
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Предложение о переносе приёма успешно отправлено пациенту.");
        setTransferModalApp(null);
        setAffectedApps(prev => prev.filter(app => app.id !== transferModalApp.id));
      } else {
        alert(data.message || "Ошибка переноса.");
      }
    } catch (err) {
      alert("Ошибка сети.");
    } finally {
      setLoading(false);
    }
  }

  function getDepartmentName(id) {
    return departments.find((dep) => String(dep.id) === String(id))?.name || "—";
  }

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const search = filters.search.toLowerCase();

      const matchesSearch =
        String(employee.full_name || "").toLowerCase().includes(search) ||
        String(employee.phone || "").toLowerCase().includes(search) ||
        String(employee.email || "").toLowerCase().includes(search) ||
        String(employee.cabinet || "").toLowerCase().includes(search) ||
        String(employee.position || "").toLowerCase().includes(search) ||
        String(employee.login || "").toLowerCase().includes(search);

      const matchesDepartment =
        filters.departmentId === "all" ||
        String(employee.department_id) === String(filters.departmentId);

      const status = employee.login ? employee.status || "active" : "no_access";

      const matchesStatus =
        filters.status === "all" || String(status) === String(filters.status);

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, filters]);

  const noAccessCount = employees.filter((e) => !e.login).length;
  const activeCount = employees.filter((e) => e.login && e.status === "active").length;
  const blockedCount = employees.filter((e) => e.status === "blocked").length;

  function updateDepartmentForm(e) {
    const { name, value } = e.target;
    setDepartmentForm((prev) => ({ ...prev, [name]: value }));
  }

  async function addDepartment(e) {
    e.preventDefault();

    if (!organizationId) {
      setMessage("organizationId не найден. Перезайдите в аккаунт.");
      return;
    }

    if (!departmentForm.name || !departmentForm.floor || !departmentForm.rooms) {
      setMessage("Заполните отделение, этаж и кабинеты.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/organization-structure/departments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-organization-id": organizationId,
          },
          body: JSON.stringify({
            organizationId,
            name: departmentForm.name,
            floor: departmentForm.floor,
            rooms: departmentForm.rooms,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Ошибка добавления отделения.");
      }

      setDepartments((prev) => [...prev, result.department]);

      setDepartmentForm({
        name: "",
        floor: "",
        rooms: "",
      });

      setMessage("Отделение сохранено.");
    } catch (error) {
      setMessage(error.message || "Ошибка добавления отделения.");
    } finally {
      setLoading(false);
    }
  }

  function openAccessModal(employee) {
    const loginBase = String(employee.full_name || "")
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, ".")
      .replace(/^\.+|\.+$/g, "");

    setAccessEmployee(employee);
    setAccessForm({
      login: employee.login || loginBase || "",
      tempPassword: generatePassword(),
    });
  }

  async function createAccess(e) {
    e.preventDefault();

    if (!accessEmployee) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/organization-structure/employees/${accessEmployee.id}/access`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-organization-id": organizationId,
          },
          body: JSON.stringify({
            organizationId,
            city: organizationUser?.city || "",
            bin: organizationUser?.bin || "",
            login: accessForm.login,
            tempPassword: accessForm.tempPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Ошибка создания доступа.");
      }

      setEmployees((prev) =>
        prev.map((item) =>
          item.id === accessEmployee.id ? result.employee : item
        )
      );

      setMessage(`Доступ создан. Временный пароль: ${result.tempPassword}`);
      setAccessEmployee(null);
    } catch (error) {
      setMessage(error.message || "Ошибка создания доступа.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(employee) {
    const tempPassword = generatePassword();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/organization-structure/employees/${employee.id}/reset-password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-organization-id": organizationId,
          },
          body: JSON.stringify({
            organizationId,
            tempPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Ошибка сброса пароля.");
      }

      setEmployees((prev) =>
        prev.map((item) => (item.id === employee.id ? result.employee : item))
      );

      setMessage(`Пароль сброшен. Новый временный пароль: ${result.tempPassword}`);
    } catch (error) {
      setMessage(error.message || "Ошибка сброса пароля.");
    } finally {
      setLoading(false);
    }
  }

  async function changeBlockStatus(employee, action) {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/organization-structure/employees/${employee.id}/${action}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-organization-id": organizationId,
          },
          body: JSON.stringify({
            organizationId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Ошибка изменения статуса.");
      }

      setEmployees((prev) =>
        prev.map((item) => (item.id === employee.id ? result.employee : item))
      );

      setMessage(result.message || "Статус обновлен.");
    } catch (error) {
      setMessage(error.message || "Ошибка изменения статуса.");
    } finally {
      setLoading(false);
    }
  }

  function normalizeEmployee(employee) {
    return {
      id: employee.id,
      fullName: employee.full_name || employee.fullName || "",
      age: employee.age || "",
      phone: employee.phone || "",
      email: employee.email || "",
      position: employee.position || "",
      departmentId: employee.department_id || employee.departmentId || "",
      cabinet: employee.cabinet || "",
      login: employee.login || "",
      status: employee.login ? employee.status || "active" : "no_access",
      documents: employee.documents || [],
      work_start: employee.work_start || employee.workStart || "08:00",
      work_end: employee.work_end || employee.workEnd || "17:00",
    };
  }

  async function saveEmployee(e) {
    e.preventDefault();

    if (!organizationId) {
      setMessage("Организация не найдена. Войдите заново.");
      return;
    }

    if (!employeeForm.full_name.trim()) {
      setMessage("Укажите ФИО сотрудника.");
      return;
    }

    if (!employeeForm.position.trim()) {
      setMessage("Укажите должность.");
      return;
    }

    if (!employeeForm.department_id) {
      setMessage("Укажите отделение.");
      return;
    }

    setSavingEmployee(true);
    setMessage("");

    try {
      const payload = {
        organization_id: organizationId,
        full_name: employeeForm.full_name.trim(),
        phone: employeeForm.phone.trim(),
        email: employeeForm.email.trim(),
        position: employeeForm.position.trim(),
        department_id: employeeForm.department_id || null,
        cabinet: employeeForm.cabinet.trim(),
        status: "active",
        work_start: employeeForm.work_start,
        work_end: employeeForm.work_end,
      };

      const url = editingEmployeeId
        ? API_URL + "/api/organization-structure/employees/" + editingEmployeeId
        : API_URL + "/api/organization-structure/employees";

      const response = await fetch(url, {
        method: editingEmployeeId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": organizationId,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Не удалось сохранить сотрудника.");
      }

      setMessage(editingEmployeeId ? "Сотрудник изменён." : "Сотрудник добавлен.");
      resetEmployeeForm();
      loadData();
    } catch (err) {
      setMessage(err.message || "Ошибка сохранения сотрудника.");
    } finally {
      setSavingEmployee(false);
    }
  }

  function editEmployee(employee) {
    const item = normalizeEmployee(employee);
    setEditingEmployeeId(item.id);
    setEmployeeForm({
      full_name: item.fullName,
      phone: item.phone,
      email: item.email,
      position: item.position,
      department: departments.find(d => String(d.id) === String(item.departmentId))?.name || "",
      department_id: item.departmentId,
      cabinet: item.cabinet,
      role: employee.role || "doctor",
      work_start: item.work_start,
      work_end: item.work_end,
    });
    setShowEmployeeForm(true);
  }

  async function dismissEmployee(employee) {
    const confirmed = window.confirm("Уволить сотрудника " + employee.full_name + "?");
    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        API_URL + "/api/organization-structure/employees/" + employee.id,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-organization-id": organizationId,
          },
          body: JSON.stringify({
            status: "dismissed"
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Не удалось уволить сотрудника.");
      }

      setMessage("Сотрудник уволен.");
      loadData();
    } catch (err) {
      setMessage(err.message || "Ошибка увольнения сотрудника.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteEmployee(employee) {
    const confirmed = window.confirm("Удалить сотрудника " + employee.full_name + "?");
    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        API_URL + "/api/organization-structure/employees/" + employee.id,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Не удалось удалить сотрудника.");
      }

      setMessage("Сотрудник удалён.");
      loadData();
    } catch (err) {
      setMessage(err.message || "Ошибка удаления сотрудника.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadDocuments(e) {
    e.preventDefault();

    if (!selectedEmployeeId) {
      setMessage("Выберите сотрудника.");
      return;
    }

    setSavingEmployee(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("employee_id", selectedEmployeeId);
      formData.append("organization_id", organizationId);

      Object.keys(documents).forEach((key) => {
        if (documents[key]) {
          formData.append(key, documents[key]);
        }
      });

      const response = await fetch(
        API_URL + "/api/organization-structure/employee-documents",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Не удалось загрузить документы.");
      }

      setMessage("Документы загружены.");
      setDocuments({});
      loadData();
    } catch (err) {
      setMessage(err.message || "Ошибка загрузки документов.");
    } finally {
      setSavingEmployee(false);
    }
  }

  function resetEmployeeForm() {
    setEmployeeForm(EMPTY_EMPLOYEE_FORM);
    setEditingEmployeeId(null);
    setShowEmployeeForm(false);
  }

  function updateEmployeeField(e) {
    const { name, value } = e.target;
    setEmployeeForm((prev) => ({ ...prev, [name]: value }));
  }

  function handlePositionChange(e) {
    const value = e.target.value;
    let newRole = employeeForm.role;

    const lowVal = value.toLowerCase();
    if (lowVal.includes("врач") || lowVal.includes("узи") || lowVal.includes("рентгенолог")) {
      newRole = "doctor";
    } else if (lowVal.includes("медсестра") || lowVal.includes("медбрат")) {
      newRole = "nurse";
    } else if (lowVal.includes("регистратор")) {
      newRole = "registrar";
    } else if (lowVal.includes("заведующий")) {
      newRole = "department_head";
    } else if (lowVal.includes("заместитель")) {
      newRole = "deputy_chief_doctor";
    }

    setEmployeeForm((prev) => ({
      ...prev,
      position: value,
      role: newRole,
    }));
  }

  function updateDocumentFile(e) {
    const { name, files } = e.target;
    setDocuments((prev) => ({
      ...prev,
      [name]: files && files.length > 0 ? files[0] : null,
    }));
  }

  return (
    <div className="org-admin-page">
      <div className="gov-page-head">
        <div>
          <h2 className="gov-page-title">Администратор организации</h2>
          <p className="gov-page-subtitle">
            Управление отделениями и доступами сотрудников.
          </p>
        </div>
      </div>

      {message ? <div className="admin-message">{message}</div> : null}
      {loading ? <div className="admin-message">Загрузка...</div> : null}

      {tab === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div className="gov-card org-info-card">
            <h3 style={{ margin: "0 0 16px", color: "#00b85a", fontSize: "20px", fontWeight: "bold" }}>Информация об организации</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
              <div style={{ borderBottom: "1px solid rgba(128,128,128,0.15)", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b", fontSize: "12px", display: "block", textTransform: "uppercase", fontWeight: "bold" }}>Название</span>
                <strong style={{ fontSize: "15px" }}>{organizationData?.organization_name || "—"}</strong>
              </div>
              <div style={{ borderBottom: "1px solid rgba(128,128,128,0.15)", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b", fontSize: "12px", display: "block", textTransform: "uppercase", fontWeight: "bold" }}>БИН</span>
                <strong style={{ fontSize: "15px" }}>{organizationData?.bin || "—"}</strong>
              </div>
              <div style={{ borderBottom: "1px solid rgba(128,128,128,0.15)", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b", fontSize: "12px", display: "block", textTransform: "uppercase", fontWeight: "bold" }}>Город</span>
                <strong style={{ fontSize: "15px" }}>{organizationData?.city || "—"}</strong>
              </div>
              <div style={{ borderBottom: "1px solid rgba(128,128,128,0.15)", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b", fontSize: "12px", display: "block", textTransform: "uppercase", fontWeight: "bold" }}>Адрес</span>
                <strong style={{ fontSize: "15px" }}>{organizationData?.address || "—"}</strong>
              </div>
              <div style={{ borderBottom: "1px solid rgba(128,128,128,0.15)", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b", fontSize: "12px", display: "block", textTransform: "uppercase", fontWeight: "bold" }}>Главный врач</span>
                <strong style={{ fontSize: "15px" }}>{organizationData?.chief_doctor_full_name || "—"}</strong>
              </div>
              <div style={{ borderBottom: "1px solid rgba(128,128,128,0.15)", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b", fontSize: "12px", display: "block", textTransform: "uppercase", fontWeight: "bold" }}>Телефон главврача</span>
                <strong style={{ fontSize: "15px" }}>{organizationData?.chief_doctor_phone || "—"}</strong>
              </div>
              <div style={{ borderBottom: "1px solid rgba(128,128,128,0.15)", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b", fontSize: "12px", display: "block", textTransform: "uppercase", fontWeight: "bold" }}>Email главврача</span>
                <strong style={{ fontSize: "15px" }}>{organizationData?.chief_doctor_email || "—"}</strong>
              </div>
              <div style={{ borderBottom: "1px solid rgba(128,128,128,0.15)", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b", fontSize: "12px", display: "block", textTransform: "uppercase", fontWeight: "bold" }}>Email организации</span>
                <strong style={{ fontSize: "15px" }}>{organizationData?.organization_email || "—"}</strong>
              </div>
            </div>
          </div>

          <div className="admin-stat-grid">
            <div className="admin-stat-card">
              <span>Отделений</span>
              <b>{departments.length}</b>
            </div>

            <div className="admin-stat-card">
              <span>Сотрудников</span>
              <b>{employees.length}</b>
            </div>

            <div className="admin-stat-card">
              <span>Без доступа</span>
              <b>{noAccessCount}</b>
            </div>

            <div className="admin-stat-card">
              <span>Активных доступов</span>
              <b>{activeCount}</b>
            </div>

            <div className="admin-stat-card">
              <span>Заблокировано</span>
              <b>{blockedCount}</b>
            </div>

            <div className="admin-stat-card">
              <span>Кабинеты</span>
              <b>{departments.filter((d) => d.rooms).length}</b>
            </div>
          </div>

          <div className="gov-card" style={{ marginTop: "8px" }}>
            <h3>Сотрудники, ожидающие создания доступа ({noAccessCount})</h3>
            {employees.filter((emp) => !emp.login).length === 0 ? (
              <p className="empty-text" style={{ margin: "10px 0 0" }}>Все сотрудники имеют доступы.</p>
            ) : (
              <div className="employee-card-list" style={{ marginTop: "16px" }}>
                {employees
                  .filter((emp) => !emp.login)
                  .map((employee) => {
                    const item = normalizeEmployee(employee);
                    return (
                      <div className="employee-card" key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <h4 style={{ margin: 0 }}>{item.fullName}</h4>
                          <p style={{ margin: "4px 0 0", color: "#64748b" }}>{item.position || "Должность не указана"}</p>
                        </div>
                        <div className="employee-card-info" style={{ textAlign: "right" }}>
                          <span>Отделение: {getDepartmentName(item.departmentId)}</span>
                          <span>Кабинет: {item.cabinet || "—"}</span>
                        </div>
                        <div className="employee-actions">
                          <button
                            type="button"
                            onClick={() => openAccessModal(employee)}
                            style={{
                              background: "#00b85a",
                              color: "#ffffff",
                              border: 0,
                              borderRadius: "10px",
                              padding: "8px 16px",
                              fontWeight: "bold",
                              cursor: "pointer"
                            }}
                          >
                            Создать доступ
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "departments" && (
        <div className="org-admin-grid">
          <section className="gov-card">
            <h3>Добавить отделение</h3>

            <form className="org-admin-form" onSubmit={addDepartment}>
              <label>
                Название отделения
                <select
                  name="name"
                  value={departmentForm.name}
                  onChange={updateDepartmentForm}
                  required
                >
                  <option value="">Выберите отделение</option>
                  {DEPARTMENT_OPTIONS.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Этаж
                <input
                  name="floor"
                  value={departmentForm.floor}
                  onChange={updateDepartmentForm}
                  placeholder="Например: 2 этаж"
                  required
                />
              </label>

              <label>
                Кабинеты
                <input
                  name="rooms"
                  value={departmentForm.rooms}
                  onChange={updateDepartmentForm}
                  placeholder="Например: 101–107"
                  required
                />
              </label>

              <button type="submit" disabled={loading}>
                Добавить отделение
              </button>
            </form>
          </section>

          <section className="gov-card org-admin-wide">
            <h3>Список отделений</h3>

            <div className="department-list">
              {departments.length ? (
                departments.map((department) => {
                  const people = employees.filter(
                    (employee) =>
                      String(employee.department_id) === String(department.id)
                  );

                  return (
                    <div className="department-card" key={department.id}>
                      <div className="department-head">
                        <div>
                          <h4>{department.name}</h4>
                          <p>
                            {department.floor} · Кабинеты: {department.rooms}
                          </p>
                        </div>

                        <b>{people.length} сотрудников</b>
                      </div>

                      <div className="department-people">
                        {people.length ? (
                          people.map((person) => (
                            <span key={person.id}>
                              {person.full_name} — {person.position || "должность не указана"}
                            </span>
                          ))
                        ) : (
                          <em>Сотрудники пока не добавлены</em>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="empty-text">Отделения пока не добавлены.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === "employees" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {showEmployeeForm ? (
            <form className="gov-card" onSubmit={saveEmployee} style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <h3 style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '24px' }}>
                {editingEmployeeId ? "✏️ Редактировать профиль сотрудника" : "👤 Добавление нового сотрудника"}
              </h3>

              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ color: '#0f172a', margin: '0 0 16px', fontSize: '15px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📋 Личные данные
                </h4>
                <div className="gov-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    ФИО сотрудника
                    <input
                      name="full_name"
                      value={employeeForm.full_name}
                      onChange={updateEmployeeField}
                      placeholder="Иванов Иван Иванович"
                      required
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    Номер телефона
                    <input
                      name="phone"
                      value={employeeForm.phone}
                      onChange={updateEmployeeField}
                      placeholder="+7 777 000 00 00"
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    Электронная почта
                    <input
                      type="email"
                      name="email"
                      value={employeeForm.email}
                      onChange={updateEmployeeField}
                      placeholder="doctor@clinic.kz"
                    />
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ color: '#0f172a', margin: '0 0 16px', fontSize: '15px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  💼 Профессиональные данные
                </h4>
                <div className="gov-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    Должность
                    <select
                      name="position"
                      value={employeeForm.position}
                      onChange={handlePositionChange}
                      required
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="">Выберите должность</option>
                      {POSITIONS.map((pos) => (
                        <option key={pos} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    Отделение
                    <select
                      name="department"
                      value={employeeForm.department}
                      onChange={function (e) {
                        const selectedDep = departments.find(d => d.name === e.target.value);
                        setEmployeeForm(prev => ({
                          ...prev,
                          department: e.target.value,
                          department_id: selectedDep ? selectedDep.id : ""
                        }));
                      }}
                      required
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="">Выберите отделение</option>
                      {departments.map((dep) => (
                        <option key={dep.id} value={dep.name}>
                          {dep.name} (этаж {dep.floor || "—"})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    Кабинет
                    <input
                      name="cabinet"
                      value={employeeForm.cabinet}
                      onChange={updateEmployeeField}
                      placeholder="204"
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    Роль в системе
                    <select 
                      name="role" 
                      value={employeeForm.role} 
                      onChange={updateEmployeeField}
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="doctor">🩺 Врач</option>
                      <option value="nurse">💉 Медсестра / медбрат</option>
                      <option value="registrar">💻 Регистратор</option>
                      <option value="department_head">🏥 Заведующий отделением</option>
                      <option value="deputy_chief_doctor">👨‍⚕️ Заместитель главного врача</option>
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    Начало смены (рабочее время)
                    <input
                      type="time"
                      name="work_start"
                      value={employeeForm.work_start}
                      onChange={updateEmployeeField}
                      required
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    Конец смены (рабочее время)
                    <input
                      type="time"
                      name="work_end"
                      value={employeeForm.work_end}
                      onChange={updateEmployeeField}
                      required
                    />
                  </label>
                </div>
              </div>

              <div className="gov-actions" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginTop: '24px', display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={savingEmployee} style={{ background: '#00b85a', color: '#fff', border: 0, padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {savingEmployee ? "Сохранение..." : editingEmployeeId ? "Сохранить изменения" : "Добавить сотрудника"}
                </button>

                <button type="button" onClick={() => setEmployeeForm(EMPTY_EMPLOYEE_FORM)} style={{ background: '#64748b', color: '#fff', border: 0, padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Очистить
                </button>

                <button type="button" onClick={resetEmployeeForm} style={{ background: '#cbd5e1', color: '#1e293b', border: 0, padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Назад к списку
                </button>
              </div>
            </form>
          ) : (
            <section className="gov-card">
              <div className="employee-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h3>Список сотрудников</h3>
                  <p className="gov-page-subtitle">
                    Добавление сотрудников организации, настройка графиков работы, выдача и блокировка доступов.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      resetEmployeeForm();
                      setShowEmployeeForm(true);
                    }}
                    style={{
                      background: "#00b85a",
                      color: "#ffffff",
                      border: 0,
                      borderRadius: "12px",
                      padding: "10px 20px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    ➕ Добавить сотрудника
                  </button>
                </div>
              </div>

              <div className="employee-filters" style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
                <input
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }))
                  }
                  placeholder="Поиск по ФИО, должности, логину"
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                />

                <select
                  value={filters.departmentId}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      departmentId: e.target.value,
                    }))
                  }
                  style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                >
                  <option value="all">Все отделения</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                >
                  <option value="all">Все статусы</option>
                  <option value="no_access">Нет доступа</option>
                  <option value="active">Активен</option>
                  <option value="blocked">Заблокирован</option>
                </select>
              </div>

              <div className="employee-card-list">
                {filteredEmployees.length ? (
                  filteredEmployees.map((employee) => {
                    const item = normalizeEmployee(employee);

                    return (
                      <div
                        className="employee-card"
                        key={item.id}
                        onDoubleClick={() => setSelectedEmployee(item)}
                        style={{ padding: "16px", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "12px", background: "#ffffff" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: "16px" }}>{item.fullName}</h4>
                            <p style={{ margin: "4px 0", color: "#64748b", fontWeight: "bold" }}>{item.position || "Должность не указана"}</p>
                            <p style={{ margin: "2px 0", fontSize: "13px", color: "#475569" }}>
                              📞 {item.phone || "—"} | ✉️ {item.email || "—"}
                            </p>
                          </div>

                          <div className="employee-card-info" style={{ textAlign: "right", fontSize: "13px", color: "#64748b" }}>
                            <div style={{ fontWeight: "bold" }}>Отделение: {getDepartmentName(item.departmentId)}</div>
                            <div>Кабинет: {item.cabinet || "—"}</div>
                            <div>Смена: <b>{item.work_start} - {item.work_end}</b></div>
                            <div>Логин: <b>{item.login || "не создан"}</b></div>
                            <div>Статус: <span className={`status-badge-mini ${item.status}`}>{getStatusText(item.status)}</span></div>
                          </div>
                        </div>

                        <div className="employee-actions" style={{ display: "flex", gap: "8px", marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "12px", flexWrap: "wrap" }}>
                          <button type="button" onClick={() => editEmployee(employee)} style={{ background: "#3b82f6", color: "#ffffff", border: 0, borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" }}>
                            Изменить данные
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmployeeId(employee.id);
                              goAdminTab("documents");
                            }}
                            style={{ background: "#6366f1", color: "#ffffff", border: 0, borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" }}
                          >
                            Документы
                          </button>

                          {employee.status !== "dismissed" && (
                            <button type="button" onClick={() => dismissEmployee(employee)} style={{ background: "#ef4444", color: "#ffffff", border: 0, borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" }}>
                              Уволить
                            </button>
                          )}

                          <button type="button" onClick={() => deleteEmployee(employee)} style={{ background: "#94a3b8", color: "#ffffff", border: 0, borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" }}>
                            Удалить
                          </button>

                          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                            {!item.login ? (
                              <button type="button" onClick={() => openAccessModal(employee)} style={{ background: "#00b85a", color: "#ffffff", border: 0, borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
                                Выдать доступ
                              </button>
                            ) : (
                              <>
                                <button type="button" onClick={() => resetPassword(employee)} style={{ background: "#f59e0b", color: "#ffffff", border: 0, borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" }}>
                                  Сбросить пароль
                                </button>

                                {item.status === "blocked" ? (
                                  <button
                                    type="button"
                                    onClick={() => changeBlockStatus(employee, "unblock")}
                                    style={{ background: "#10b981", color: "#ffffff", border: 0, borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" }}
                                  >
                                    Разблокировать
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => changeBlockStatus(employee, "block")}
                                    style={{ background: "#ef4444", color: "#ffffff", border: 0, borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" }}
                                  >
                                    Заблокировать
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="empty-text">Сотрудники не найдены.</p>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {tab === "documents" && (
        <div className="gov-card">
          <div className="gov-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '24px' }}>
            <h3 style={{ margin: 0 }}>📂 Личные дела и документы сотрудников</h3>
            <button
              type="button"
              onClick={() => goAdminTab("employees")}
              style={{
                background: "#cbd5e1",
                color: "#1e293b",
                border: 0,
                borderRadius: "12px",
                padding: "8px 16px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              Назад к списку
            </button>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e293b' }}>
              Выберите сотрудника для управления документами
            </label>
            <select
              value={selectedEmployeeId}
              onChange={function (event) {
                setSelectedEmployeeId(event.target.value);
                setMessage("");
              }}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
            >
              <option value="">Не выбран</option>
              {employees.map(function (employee) {
                return (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} ({employee.position})
                  </option>
                );
              })}
            </select>
          </div>

          {selectedEmployeeId ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <form onSubmit={uploadDocuments} style={{ borderRight: '1px solid #e2e8f0', paddingRight: '32px' }}>
                <h4 style={{ marginBottom: '20px', color: '#0f172a', fontWeight: 'bold' }}>📤 Загрузить новые документы</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#475569', fontSize: '14px' }}>
                    Удостоверение личности
                    <input type="file" name="identity_document" onChange={updateDocumentFile} style={{ padding: '6px 0' }} />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#475569', fontSize: '14px' }}>
                    Диплом
                    <input type="file" name="diploma" onChange={updateDocumentFile} style={{ padding: '6px 0' }} />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#475569', fontSize: '14px' }}>
                    Сертификат
                    <input type="file" name="certificate" onChange={updateDocumentFile} style={{ padding: '6px 0' }} />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#475569', fontSize: '14px' }}>
                    Трудовой договор
                    <input type="file" name="employment_contract" onChange={updateDocumentFile} style={{ padding: '6px 0' }} />
                  </label>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <button
                    type="submit"
                    disabled={savingEmployee}
                    style={{
                      background: '#00b85a',
                      color: '#fff',
                      border: 0,
                      padding: '10px 20px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '15px'
                    }}
                  >
                    {savingEmployee ? "Загрузка..." : "Загрузить файлы"}
                  </button>
                </div>
              </form>

              <div>
                <h4 style={{ marginBottom: '20px', color: '#0f172a', fontWeight: 'bold' }}>📋 Загруженные документы</h4>
                {employees.find(emp => emp.id === selectedEmployeeId)?.documents?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {employees.find(emp => emp.id === selectedEmployeeId).documents.map(function (doc) {
                      const docLabels = {
                        identity_document: "Удостоверение личности",
                        diploma: "Диплом",
                        certificate: "Сертификат",
                        employment_contract: "Трудовой договор"
                      };
                      
                      const parts = (doc.file_name || "").split("__");
                      const docType = parts.length > 1 ? parts[0] : "document";
                      const displayName = parts.length > 1 ? parts.slice(1).join("__") : doc.file_name;

                      return (
                        <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ marginRight: '12px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>
                              {docLabels[docType] || docType}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', wordBreak: 'break-all', marginTop: '2px' }}>
                              {displayName}
                            </div>
                          </div>
                          {doc.file_url ? (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                background: '#3b82f6',
                                color: '#fff',
                                textDecoration: 'none',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Открыть
                            </a>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Нет ссылки</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: '#64748b', fontStyle: 'italic', margin: 0 }}>Документы пока не загружены.</p>
                )}
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', marginTop: '32px', margin: 0 }}>
              Выберите сотрудника из списка выше, чтобы управлять его личным делом.
            </p>
          )}
        </div>
      )}

      {/* -------------------- TAB: SCHEDULES -------------------- */}
      {tab === "schedules" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="gov-card">
            <h3>Управление рабочим временем врачей</h3>
            <p className="gov-page-subtitle">
              Выберите врача для настройки его периода действия графика, рабочих дней и индивидуальных часов работы.
            </p>
            
            <label style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "400px", marginTop: "16px" }}>
              Выберите врача:
              <select
                value={selectedDocForSched}
                onChange={(e) => setSelectedDocForSched(e.target.value)}
                style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "15px" }}
              >
                <option value="">-- Выберите врача --</option>
                {employees
                  .filter(e => e.role === "doctor" || String(e.position).toLowerCase().includes("врач"))
                  .map(doc => (
                    <option key={doc.id} value={doc.id}>
                      🩺 {doc.full_name} ({doc.position})
                    </option>
                  ))
                }
              </select>
            </label>
          </div>

          {selectedDocForSched && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Working Schedule Config */}
              <form className="gov-card" onSubmit={saveDocSchedule}>
                <h4>⚙️ Настройка графика работы</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      Дата начала действия графика:
                      <input
                        type="date"
                        value={schedForm.start_date || ""}
                        onChange={(e) => setSchedForm(prev => ({ ...prev, start_date: e.target.value }))}
                        required
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      Дата окончания действия графика (необязательно):
                      <input
                        type="date"
                        value={schedForm.end_date || ""}
                        onChange={(e) => setSchedForm(prev => ({ ...prev, end_date: e.target.value }))}
                      />
                    </label>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <strong>Рабочие дни недели:</strong>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                      {[
                        { val: 1, label: "Пн" },
                        { val: 2, label: "Вт" },
                        { val: 3, label: "Ср" },
                        { val: 4, label: "Чт" },
                        { val: 5, label: "Пт" },
                        { val: 6, label: "Сб" },
                        { val: 7, label: "Вс" },
                      ].map(day => {
                        const checked = schedForm.work_days.includes(day.val);
                        return (
                          <label key={day.val} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", background: "#f1f5f9", padding: "6px 12px", borderRadius: "8px" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                let updated;
                                if (e.target.checked) {
                                  updated = [...schedForm.work_days, day.val].sort();
                                } else {
                                  updated = schedForm.work_days.filter(d => d !== day.val);
                                }
                                setSchedForm(prev => ({ ...prev, work_days: updated }));
                              }}
                            />
                            {day.label}
                          </label>
                        );
                      })}
                    </div>

                    <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                      <button
                        type="button"
                        onClick={() => setSchedForm(prev => ({ ...prev, work_days: [1, 2, 3, 4, 5, 6, 7] }))}
                        style={{ padding: "6px 12px", background: "#3b82f6", color: "#fff", border: "0", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
                      >
                        Выбрать все дни
                      </button>
                      <button
                        type="button"
                        onClick={applyTimeToAllDays}
                        style={{ padding: "6px 12px", background: "#475569", color: "#fff", border: "0", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
                      >
                        Применить одинаковое время ко всем выбранным
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
                    <strong>Часы работы по дням:</strong>
                    {schedForm.work_days.map(dayNum => {
                      const dayNames = { "1": "Понедельник", "2": "Вторник", "3": "Ср", "4": "Четверг", "5": "Пятница", "6": "Суббота", "7": "Воскресенье" };
                      const daySched = (schedForm.daily_schedules && schedForm.daily_schedules[String(dayNum)]) || { work_start: "08:00", work_end: "17:00", lunch_start: "13:00", lunch_end: "14:00", slot_duration: 30 };
                      const updateDaily = (key, val) => {
                        const copy = { ...schedForm.daily_schedules };
                        copy[String(dayNum)] = { ...daySched, [key]: val };
                        setSchedForm(prev => ({ ...prev, daily_schedules: copy }));
                      };

                      return (
                        <div key={dayNum} style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 1fr 1fr 1.2fr", gap: "12px", alignItems: "center", padding: "10px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                          <strong>{dayNames[String(dayNum)]}:</strong>
                          <label style={{ display: "flex", flexDirection: "column", fontSize: "12px" }}>
                            Начало:
                            <input type="time" value={daySched.work_start} onChange={(e) => updateDaily("work_start", e.target.value)} required />
                          </label>
                          <label style={{ display: "flex", flexDirection: "column", fontSize: "12px" }}>
                            Конец:
                            <input type="time" value={daySched.work_end} onChange={(e) => updateDaily("work_end", e.target.value)} required />
                          </label>
                          <label style={{ display: "flex", flexDirection: "column", fontSize: "12px" }}>
                            Обед с:
                            <input type="time" value={daySched.lunch_start} onChange={(e) => updateDaily("lunch_start", e.target.value)} required />
                          </label>
                          <label style={{ display: "flex", flexDirection: "column", fontSize: "12px" }}>
                            Обед до:
                            <input type="time" value={daySched.lunch_end} onChange={(e) => updateDaily("lunch_end", e.target.value)} required />
                          </label>
                          <label style={{ display: "flex", flexDirection: "column", fontSize: "12px" }}>
                            Запись (мин):
                            <select value={daySched.slot_duration} onChange={(e) => updateDaily("slot_duration", Number(e.target.value))} style={{ padding: "6px" }}>
                              <option value="15">15 минут</option>
                              <option value="20">20 минут</option>
                              <option value="30">30 минут</option>
                              <option value="40">40 минут</option>
                              <option value="45">45 минут</option>
                              <option value="60">60 минут</option>
                            </select>
                          </label>
                        </div>
                      );
                    })}
                  </div>

                  <button type="submit" disabled={loading} className="gov-btn" style={{ background: "#00b85a", color: "#fff", border: "0", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
                    Сохранить рабочий график
                  </button>
                </div>
              </form>

              {/* Date Exceptions */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <form className="gov-card" onSubmit={logDocException}>
                  <h4>📅 Исключения из графика (на конкретную дату)</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      Дата:
                      <input
                        type="date"
                        value={exceptionForm.exception_date}
                        onChange={(e) => setExceptionForm(prev => ({ ...prev, exception_date: e.target.value }))}
                        required
                      />
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", margin: "8px 0", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={exceptionForm.is_working}
                        onChange={(e) => setExceptionForm(prev => ({ ...prev, is_working: e.target.checked }))}
                      />
                      Врач работает в этот день
                    </label>

                    {exceptionForm.is_working && (
                      <>
                        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          Время начала:
                          <input type="time" value={exceptionForm.work_start} onChange={(e) => setExceptionForm(prev => ({ ...prev, work_start: e.target.value }))} required />
                        </label>
                        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          Время окончания:
                          <input type="time" value={exceptionForm.work_end} onChange={(e) => setExceptionForm(prev => ({ ...prev, work_end: e.target.value }))} required />
                        </label>
                        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          Начало обеда:
                          <input type="time" value={exceptionForm.lunch_start} onChange={(e) => setExceptionForm(prev => ({ ...prev, lunch_start: e.target.value }))} required />
                        </label>
                        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          Окончание обеда:
                          <input type="time" value={exceptionForm.lunch_end} onChange={(e) => setExceptionForm(prev => ({ ...prev, lunch_end: e.target.value }))} required />
                        </label>
                        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          Продолжительность записи (минут):
                          <select value={exceptionForm.slot_duration} onChange={(e) => setExceptionForm(prev => ({ ...prev, slot_duration: Number(e.target.value) }))} style={{ padding: "8px" }}>
                            <option value="15">15 минут</option>
                            <option value="20">20 минут</option>
                            <option value="30">30 минут</option>
                            <option value="40">40 минут</option>
                            <option value="45">45 минут</option>
                            <option value="60">60 минут</option>
                          </select>
                        </label>
                      </>
                    )}

                    <button type="submit" disabled={loading} className="gov-btn" style={{ background: "#3b82f6", color: "#fff", border: "0", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
                      Добавить исключение
                    </button>
                  </div>
                </form>

                <div className="gov-card">
                  <h4>📋 Зарегистрированные исключения</h4>
                  <div style={{ marginTop: "16px", overflowX: "auto" }}>
                    {docExceptions.length === 0 ? (
                      <p style={{ color: "#64748b", fontStyle: "italic", margin: 0 }}>Исключений нет</p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #cbd5e1" }}>
                            <th style={{ padding: "8px" }}>Дата</th>
                            <th style={{ padding: "8px" }}>Статус</th>
                            <th style={{ padding: "8px" }}>Время</th>
                            <th style={{ padding: "8px" }}>Действие</th>
                          </tr>
                        </thead>
                        <tbody>
                          {docExceptions.map(exc => (
                            <tr key={exc.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "8px" }}>{exc.exception_date}</td>
                              <td style={{ padding: "8px" }}>
                                {exc.is_working ? (
                                  <span style={{ color: "#00b85a", fontWeight: "bold" }}>Рабочий</span>
                                ) : (
                                  <span style={{ color: "#ef4444", fontWeight: "bold" }}>Выходной</span>
                                )}
                              </td>
                              <td style={{ padding: "8px" }}>
                                {exc.is_working ? `${exc.work_start}–${exc.work_end}` : "—"}
                              </td>
                              <td style={{ padding: "8px" }}>
                                <button
                                  onClick={() => removeDocException(exc.id)}
                                  style={{ background: "#ef4444", color: "#fff", border: "0", padding: "4px 8px", borderRadius: "6px", cursor: "pointer" }}
                                >
                                  Удалить
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------- TAB: ABSENCES -------------------- */}
      {tab === "absences" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="gov-card">
            <h3>Управление отсутствиями врачей</h3>
            <p className="gov-page-subtitle">
              Зарегистрируйте отпуск, командировку или больничный. При экстренном отсутствии затронутые записи пациентов будут выведены для переноса.
            </p>
            
            <label style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "400px", marginTop: "16px" }}>
              Выберите врача:
              <select
                value={selectedDocForSched}
                onChange={(e) => setSelectedDocForSched(e.target.value)}
                style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "15px" }}
              >
                <option value="">-- Выберите врача --</option>
                {employees
                  .filter(e => e.role === "doctor" || String(e.position).toLowerCase().includes("врач"))
                  .map(doc => (
                    <option key={doc.id} value={doc.id}>
                      🩺 {doc.full_name} ({doc.position})
                    </option>
                  ))
                }
              </select>
            </label>
          </div>

          {selectedDocForSched && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Log Absence Form */}
              <form className="gov-card" onSubmit={logDocAbsence}>
                <h4>📅 Регистрация отсутствия / блокировка</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    Тип отсутствия:
                    <select
                      value={absenceForm.absence_type}
                      onChange={(e) => setAbsenceForm(prev => ({ ...prev, absence_type: e.target.value }))}
                      style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    >
                      <option value="planned">🌴 Плановое отсутствие (отпуск, командировка, учеба)</option>
                      <option value="emergency">🚨 Экстренное отсутствие (болезнь, срочный невыход)</option>
                    </select>
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    Дата начала:
                    <input
                      type="date"
                      value={absenceForm.start_date}
                      onChange={(e) => setAbsenceForm(prev => ({ ...prev, start_date: e.target.value }))}
                      required
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    Дата окончания:
                    <input
                      type="date"
                      value={absenceForm.end_date}
                      onChange={(e) => setAbsenceForm(prev => ({ ...prev, end_date: e.target.value }))}
                      required
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    Причина:
                    <input
                      type="text"
                      placeholder="Например, Больничный или Отпуск"
                      value={absenceForm.reason}
                      onChange={(e) => setAbsenceForm(prev => ({ ...prev, reason: e.target.value }))}
                      required
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    Комментарий (необязательно):
                    <textarea
                      placeholder="Дополнительные примечания..."
                      value={absenceForm.comment}
                      onChange={(e) => setAbsenceForm(prev => ({ ...prev, comment: e.target.value }))}
                      style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", minHeight: "60px" }}
                    />
                  </label>

                  <button type="submit" disabled={loading} className="gov-btn" style={{ marginTop: "12px", background: "#ef4444", color: "#fff", border: "0", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
                    Зарегистрировать отсутствие
                  </button>
                </div>
              </form>

              <div className="gov-card">
                <h4>📋 Зарегистрированные периоды отсутствия</h4>
                <div style={{ marginTop: "16px", overflowX: "auto" }}>
                  {docAbsences.length === 0 ? (
                    <p style={{ color: "#64748b", fontStyle: "italic", margin: 0 }}>Периодов отсутствия не найдено.</p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #cbd5e1" }}>
                          <th style={{ padding: "8px" }}>Начало</th>
                          <th style={{ padding: "8px" }}>Конец</th>
                          <th style={{ padding: "8px" }}>Тип</th>
                          <th style={{ padding: "8px" }}>Причина</th>
                          <th style={{ padding: "8px" }}>Действие</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docAbsences.map(abs => (
                          <tr key={abs.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "8px" }}>{abs.start_date}</td>
                            <td style={{ padding: "8px" }}>{abs.end_date}</td>
                            <td style={{ padding: "8px" }}>
                              {abs.absence_type === "emergency" ? (
                                <span style={{ color: "#ef4444", fontWeight: "bold" }}>🚨 Экстренное</span>
                              ) : (
                                <span style={{ color: "#3b82f6", fontWeight: "bold" }}>🌴 Плановое</span>
                              )}
                            </td>
                            <td style={{ padding: "8px" }}>{abs.reason}</td>
                            <td style={{ padding: "8px" }}>
                              <button
                                onClick={() => removeDocAbsence(abs.id)}
                                style={{ background: "#ef4444", color: "#fff", border: "0", padding: "4px 8px", borderRadius: "6px", cursor: "pointer" }}
                              >
                                Удалить
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedDocForSched && affectedApps.length > 0 && (
            <div className="gov-card" style={{ borderColor: "#f59e0b", background: "#fffbeb" }}>
              <h4 style={{ color: "#b45309" }}>⚠️ Конфликтующие записи пациентов ({affectedApps.length})</h4>
              <p style={{ color: "#b45309", fontSize: "14px", margin: "4px 0 16px" }}>
                На период отсутствия врача обнаружены активные записи пациентов. Пожалуйста, перенесите их к другим специалистам.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                {affectedApps.map(app => (
                  <div key={app.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "#ffffff", borderRadius: "10px", border: "1px solid #fde68a" }}>
                    <div>
                      <strong>📅 {app.date} в {app.time}</strong>
                      <span style={{ marginLeft: "12px", color: "#64748b" }}>Пациент: {app.patient_iin}</span>
                    </div>
                    <button
                      onClick={() => {
                        setTransferModalApp(app);
                        setTransferForm(prev => ({
                          ...prev,
                          new_date: app.date,
                          new_time: ""
                        }));
                      }}
                      style={{ background: "#f59e0b", color: "#fff", border: "0", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                    >
                      Перенести запись
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------- TAB: TRANSFERS -------------------- */}
      {tab === "transfers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="gov-card">
            <h3>Перенос записей пациентов</h3>
            <p className="gov-page-subtitle">
              Список всех записей, затронутых плановыми или экстренными отсутствиями врачей. Найдите свободное время других врачей для переноса приёма.
            </p>
            <button
              onClick={loadAllTransfers}
              style={{ marginTop: "12px", background: "#3b82f6", color: "#fff", border: "0", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
            >
              🔄 Обновить список конфликтов
            </button>
          </div>

          <div className="gov-card">
            <h4>⚠️ Записи, требующие переноса ({affectedApps.length})</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
              {affectedApps.length === 0 ? (
                <p style={{ color: "#64748b", fontStyle: "italic", textAlign: "center", padding: "24px" }}>
                  Нет конфликтующих записей, требующих переноса.
                </p>
              ) : (
                affectedApps.map(app => (
                  <div key={app.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div>
                      <strong>📅 {app.date} в {app.time}</strong>
                      <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
                        <span>Врач: {app.doctor_name || "Лечащий врач"}</span>
                        <span style={{ margin: "0 8px" }}>|</span>
                        <span>Пациент: {app.patient_iin}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setTransferModalApp(app);
                        setTransferForm(prev => ({
                          ...prev,
                          new_date: app.date,
                          new_time: ""
                        }));
                      }}
                      style={{ background: "#f59e0b", color: "#fff", border: "0", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                    >
                      Перенести запись
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB: NOTIFICATIONS -------------------- */}
      {tab === "notifications" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="gov-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3>Уведомления администратора</h3>
              <p className="gov-page-subtitle">Важные системные уведомления о действиях сотрудников, переносах записей и запросах.</p>
            </div>
            {notifications.some(n => !n.is_read) && (
              <button
                onClick={markAllNotificationsRead}
                style={{ background: "#3b82f6", color: "#fff", border: "0", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
              >
                Пометить все как прочитанные
              </button>
            )}
          </div>

          <div className="gov-card">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {notifications.length === 0 ? (
                <p style={{ color: "#64748b", fontStyle: "italic", textAlign: "center", padding: "24px" }}>
                  Нет системных уведомлений.
                </p>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid",
                      background: notif.is_read ? "#f8fafc" : "#e0f2fe",
                      borderColor: notif.is_read ? "#e2e8f0" : "#bae6fd",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "16px"
                    }}
                  >
                    <div>
                      <strong style={{ display: "block", color: notif.is_read ? "#1e293b" : "#0369a1" }}>{notif.title}</strong>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#475569" }}>{notif.message}</p>
                      <span style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginTop: "8px" }}>
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                    </div>
                    {!notif.is_read && (
                      <button
                        onClick={() => markNotificationRead(notif.id)}
                        style={{
                          background: "transparent",
                          color: "#0284c7",
                          border: "1px solid #0284c7",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        Прочитано
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB: SUPPORT CHAT -------------------- */}
      {tab === "support" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px", minHeight: "500px" }}>
          {/* Tickets list */}
          <div className="gov-card" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px" }}>
            <button
              onClick={() => {
                setShowNewTicketForm(true);
                setSelectedConversation(null);
              }}
              style={{
                width: "100%",
                background: "#00b85a",
                color: "#fff",
                border: "0",
                padding: "12px",
                borderRadius: "10px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              ➕ Новое обращение
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", flex: 1 }}>
              {conversations.length === 0 ? (
                <p style={{ color: "#64748b", fontStyle: "italic", textAlign: "center" }}>Нет обращений</p>
              ) : (
                conversations.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedConversation(c);
                      setShowNewTicketForm(false);
                    }}
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      cursor: "pointer",
                      background: selectedConversation?.id === c.id ? "#e0f2fe" : "#ffffff",
                      borderColor: selectedConversation?.id === c.id ? "#38bdf8" : "#cbd5e1"
                    }}
                  >
                    <strong style={{ display: "block", fontSize: "14px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {c.subject}
                    </strong>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "12px" }}>
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: "bold",
                        background: c.status === "open" ? "#fef3c7" : c.status === "in_work" ? "#dbeafe" : c.status === "resolved" ? "#d1fae5" : "#f1f5f9",
                        color: c.status === "open" ? "#d97706" : c.status === "in_work" ? "#2563eb" : c.status === "resolved" ? "#059669" : "#64748b"
                      }}>
                        {c.status}
                      </span>
                      <span style={{ color: "#94a3b8" }}>{new Date(c.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ticket Messages / Create ticket form */}
          <div className="gov-card" style={{ display: "flex", flexDirection: "column", minHeight: "500px" }}>
            {showNewTicketForm ? (
              <form onSubmit={createSupportTicket} style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
                <h3>🎫 Создание обращения в техподдержку</h3>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  Тема обращения:
                  <input
                    type="text"
                    placeholder="Например, Ошибка при генерации расписания"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    required
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  Описание проблемы:
                  <textarea
                    placeholder="Подробно опишите вашу проблему..."
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    required
                    style={{ minHeight: "150px" }}
                  />
                </label>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  Прикрепить подтверждающий документ:
                  <input
                    type="file"
                    onChange={(e) => setSupportFile(e.target.files[0])}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "auto" }}>
                  <button
                    type="submit"
                    disabled={loading || uploadingFile}
                    style={{ background: "#00b85a", color: "#fff", border: "0", padding: "12px 24px", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    {uploadingFile ? "Загрузка файла..." : "Создать обращение"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewTicketForm(false)}
                    style={{ background: "#94a3b8", color: "#fff", border: "0", padding: "12px 24px", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    Отмена
                  </button>
                </div>
              </form>
            ) : selectedConversation ? (
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3>{selectedConversation.subject}</h3>
                    <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>{selectedConversation.description}</p>
                  </div>
                  <span style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    background: selectedConversation.status === "open" ? "#fef3c7" : selectedConversation.status === "in_work" ? "#dbeafe" : selectedConversation.status === "resolved" ? "#d1fae5" : "#f1f5f9",
                    color: selectedConversation.status === "open" ? "#d97706" : selectedConversation.status === "in_work" ? "#2563eb" : selectedConversation.status === "resolved" ? "#059669" : "#64748b"
                  }}>
                    Статус: {selectedConversation.status}
                  </span>
                </div>

                {/* Message list */}
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "8px", minHeight: "250px", maxHeight: "400px" }}>
                  {supportMessages.length === 0 ? (
                    <p style={{ color: "#94a3b8", fontStyle: "italic", textAlign: "center", margin: "auto" }}>Сообщений нет</p>
                  ) : (
                    supportMessages.map(msg => {
                      const isSupport = msg.sender_type === "support";
                      return (
                        <div
                          key={msg.id}
                          style={{
                            maxWidth: "70%",
                            alignSelf: isSupport ? "flex-start" : "flex-end",
                            background: isSupport ? "#f1f5f9" : "#dbeafe",
                            padding: "12px",
                            borderRadius: "12px",
                            borderBottomLeftRadius: isSupport ? "0" : "12px",
                            borderBottomRightRadius: isSupport ? "12px" : "0"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>
                            <strong>{msg.sender_name}</strong>
                            <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: "14px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.message_text}</p>
                          {msg.attachment_url && (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "13px", color: "#2563eb", textDecoration: "none", fontWeight: "bold" }}
                            >
                              📎 Скачать документ
                            </a>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Reply Form */}
                <form onSubmit={sendSupportReply} style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                  <textarea
                    placeholder="Напишите ответ в техподдержку..."
                    value={newSupportMsg}
                    onChange={(e) => setNewSupportMsg(e.target.value)}
                    required={!supportFile}
                    style={{ minHeight: "60px", padding: "10px" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <input
                      type="file"
                      onChange={(e) => setSupportFile(e.target.files[0])}
                    />
                    <button
                      type="submit"
                      disabled={loading || uploadingFile}
                      style={{ background: "#00b85a", color: "#fff", border: "0", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                    >
                      {uploadingFile ? "Загрузка..." : "Отправить"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <p style={{ color: "#64748b", fontStyle: "italic", textAlign: "center", margin: "auto" }}>
                Выберите обращение из списка слева или создайте новое.
              </p>
            )}
          </div>
        </div>
      )}

      {/* -------------------- MODAL: APPOINTMENT TRANSFER -------------------- */}
      {transferModalApp && (
        <div className="employee-modal" onClick={() => setTransferModalApp(null)}>
          <div className="employee-modal-card" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setTransferModalApp(null)}>×</button>

            <h3>Перенос записи пациента</h3>
            <p style={{ color: "#64748b", fontSize: "14px", margin: "4px 0 16px" }}>
              Запись от {transferModalApp.date} в {transferModalApp.time} (ИИН пациента: {transferModalApp.patient_iin})
            </p>

            <form onSubmit={handleTransferSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                Альтернативный врач той же специальности:
                <select
                  value={transferForm.new_doctor_id}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, new_doctor_id: e.target.value }))}
                  required
                  style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                >
                  <option value="">-- Выберите врача --</option>
                  {alternateDoctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      🩺 {doc.full_name} ({doc.cabinet ? `каб. ${doc.cabinet}` : "без каб."})
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                Новая дата:
                <input
                  type="date"
                  value={transferForm.new_date}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, new_date: e.target.value }))}
                  required
                />
              </label>

              {transferForm.new_doctor_id && transferForm.new_date && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span>Доступное время:</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", maxHeight: "150px", overflowY: "auto", padding: "4px" }}>
                    {transferAlternateSlots.length === 0 ? (
                      <span style={{ gridColumn: "1/-1", color: "#64748b", fontSize: "13px", fontStyle: "italic" }}>Нет свободных слотов</span>
                    ) : (
                      transferAlternateSlots.map(s => (
                        <button
                          key={s.time}
                          type="button"
                          disabled={!s.available}
                          onClick={() => setTransferForm(prev => ({ ...prev, new_time: s.time }))}
                          style={{
                            padding: "6px",
                            borderRadius: "6px",
                            border: "1px solid",
                            fontWeight: "bold",
                            cursor: s.available ? "pointer" : "not-allowed",
                            background: transferForm.new_time === s.time ? "#00b85a" : s.available ? "#ffffff" : "#f1f5f9",
                            color: transferForm.new_time === s.time ? "#ffffff" : s.available ? "#0f172a" : "#cbd5e1",
                            borderColor: transferForm.new_time === s.time ? "#00b85a" : "#cbd5e1"
                          }}
                        >
                          {s.time}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                Причина переноса:
                <input
                  type="text"
                  value={transferForm.transfer_reason}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, transfer_reason: e.target.value }))}
                  required
                />
              </label>

              <button
                type="submit"
                disabled={loading || !transferForm.new_time}
                style={{
                  background: "#00b85a",
                  color: "#fff",
                  border: "0",
                  padding: "12px",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  marginTop: "8px"
                }}
              >
                Отправить предложение о переносе
              </button>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: EMPLOYEE DETAILS -------------------- */}
      {selectedEmployee && (
        <div className="employee-modal" onClick={() => setSelectedEmployee(null)}>
          <div className="employee-modal-card" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedEmployee(null)}>×</button>

            <h3>{selectedEmployee.fullName}</h3>
            <p>{selectedEmployee.position}</p>

            <div className="employee-detail-grid">
              <div>
                <span>Телефон</span>
                <b>{selectedEmployee.phone || "—"}</b>
              </div>

              <div>
                <span>Почта</span>
                <b>{selectedEmployee.email || "—"}</b>
              </div>

              <div>
                <span>Должность</span>
                <b>{selectedEmployee.position || "—"}</b>
              </div>

              <div>
                <span>Отделение</span>
                <b>{getDepartmentName(selectedEmployee.departmentId)}</b>
              </div>

              <div>
                <span>Кабинет</span>
                <b>{selectedEmployee.cabinet || "—"}</b>
              </div>

              <div>
                <span>Логин</span>
                <b>{selectedEmployee.login || "—"}</b>
              </div>

              <div>
                <span>Статус</span>
                <b>{getStatusText(selectedEmployee.status)}</b>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: ACCESS CREATION -------------------- */}
      {accessEmployee && (
        <div className="employee-modal" onClick={() => setAccessEmployee(null)}>
          <div className="employee-modal-card" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setAccessEmployee(null)}>×</button>

            <h3>Создать доступ</h3>
            <p>
              {accessEmployee.full_name} — {accessEmployee.position}
            </p>

            <form className="org-admin-form" onSubmit={createAccess}>
              <label>
                Логин
                <input
                  value={accessForm.login}
                  onChange={(e) =>
                    setAccessForm((prev) => ({
                      ...prev,
                      login: e.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label>
                Временный пароль
                <div className="password-row">
                  <input
                    value={accessForm.tempPassword}
                    onChange={(e) =>
                      setAccessForm((prev) => ({
                        ...prev,
                        tempPassword: e.target.value,
                      }))
                    }
                    required
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setAccessForm((prev) => ({
                        ...prev,
                        tempPassword: generatePassword(),
                      }))
                    }
                  >
                    Сгенерировать
                  </button>
                </div>
              </label>

              <button type="submit" disabled={loading}>
                Выдать доступ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}