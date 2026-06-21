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
  
];
const WEEK_DAYS = [
  { id: 1, name: "Понедельник", shortName: "Пн" },
  { id: 2, name: "Вторник", shortName: "Вт" },
  { id: 3, name: "Среда", shortName: "Ср" },
  { id: 4, name: "Четверг", shortName: "Чт" },
  { id: 5, name: "Пятница", shortName: "Пт" },
  { id: 6, name: "Суббота", shortName: "Сб" },
  { id: 7, name: "Воскресенье", shortName: "Вс" },
];

function createInitialDoctorSchedule() {
  const days = {};

  WEEK_DAYS.forEach((day) => {
    days[day.id] = {
      is_working: false,
      work_start: "09:00",
      work_end: "17:30",
      lunch_start: "13:00",
      lunch_end: "14:00",
      slot_duration: 30,
    };
  });

  return {
    valid_from: "",
    valid_to: "",
    days,
  };
}

function parseCabinetList(roomsValue) {
  const cabinets = new Set();

  String(roomsValue || "")
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const normalizedPart = part.replace(/[–—]/g, "-");
      const rangeMatch = normalizedPart.match(/^(\d+)\s*-\s*(\d+)$/);

      if (rangeMatch) {
        const start = Number(rangeMatch[1]);
        const end = Number(rangeMatch[2]);

        if (start <= end && end - start <= 500) {
          for (let cabinet = start; cabinet <= end; cabinet += 1) {
            cabinets.add(String(cabinet));
          }
        }

        return;
      }

      if (/^\d+$/.test(normalizedPart)) {
        cabinets.add(normalizedPart);
      }
    });

  return Array.from(cabinets).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}



function generatePassword() {
  const a = Math.random().toString(36).slice(2, 6).toUpperCase();
  const b = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${a}-${b}`;
}

function getStatusText(status) {
  if (status === "active") return "Активен";
  if (status === "blocked") return "Заблокирован";
  if (status === "no_access") return "Нет доступа";
  if (status === "dismissed") return "В архиве";

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
  birth_date: "",
  phone: "",
  email: "",
  specialty: "",
  department: "",
  department_id: "",
  cabinet: "",
  role: "doctor",
};
  
  const [employeeForm, setEmployeeForm] = useState(EMPTY_EMPLOYEE_FORM);
  const [doctorScheduleForm, setDoctorScheduleForm] = useState(
  createInitialDoctorSchedule
);

const [schedulePreset, setSchedulePreset] = useState({
  work_start: "09:00",
  work_end: "17:30",
  lunch_start: "13:00",
  lunch_end: "14:00",
  slot_duration: 30,
});

  // Doctor Detailed Panel States
  const [activeSubTab, setActiveSubTab] = useState("info"); // "info", "schedule", "absences"
  const [employeeAbsences, setEmployeeAbsences] = useState([]);
  const [employeeExceptions, setEmployeeExceptions] = useState([]);
  const [absenceForm, setAbsenceForm] = useState({
    absence_type: "planned",
    reason: "vacation",
    start_date: "",
    end_date: "",
    comment: ""
  });
  const [exceptionForm, setExceptionForm] = useState({
    exception_date: "",
    is_working: true,
    work_start: "09:00",
    work_end: "17:30",
    lunch_start: "13:00",
    lunch_end: "14:00",
    slot_duration: 30
  });
  const [absenceAffectedApps, setAbsenceAffectedApps] = useState([]);
  

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
                throw new Error(
          employeesResult.message || "Ошибка загрузки врачей."
        );
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
  
const selectedDepartment = useMemo(() => {
  return (
    departments.find(
      (department) =>
        String(department.id) ===
        String(employeeForm.department_id)
    ) || null
  );
}, [departments, employeeForm.department_id]);

const availableCabinets = useMemo(() => {
  return parseCabinetList(selectedDepartment?.rooms);
}, [selectedDepartment]);



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

      const status =
  employee.status === "dismissed"
    ? "dismissed"
    : employee.login
      ? employee.status || "active"
      : "no_access";

      const matchesStatus =
        filters.status === "all" || String(status) === String(filters.status);

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, filters]);

  const currentEmployees = employees.filter(
  (employee) => employee.status !== "dismissed"
);

const noAccessCount = currentEmployees.filter(
  (employee) => !employee.login
).length;

const activeCount = currentEmployees.filter(
  (employee) =>
    employee.login && employee.status === "active"
).length;

const blockedCount = currentEmployees.filter(
  (employee) => employee.status === "blocked"
).length;

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
      status:
  employee.status === "dismissed"
    ? "dismissed"
    : employee.login
      ? employee.status || "active"
      : "no_access",
      
      
    };
  }

  async function saveEmployee(e) {
    e.preventDefault();

    if (!organizationId) {
      setMessage("Организация не найдена. Войдите заново.");
      return;
    }

    if (!employeeForm.full_name.trim()) {
      setMessage("Укажите ФИО врача.");
      return;
    }


    if (
  !employeeForm.age ||
  Number(employeeForm.age) < 18 ||
  Number(employeeForm.age) > 100
) {
  setMessage("Укажите корректный возраст врача.");
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


    if (!employeeForm.cabinet) {
  setMessage("Выберите кабинет.");
  return;
}

    setSavingEmployee(true);
    setMessage("");

    try {
      const payload = {
  organization_id: organizationId,
  full_name: employeeForm.full_name.trim(),
  birth_date: employeeForm.birth_date,
  phone: employeeForm.phone.trim(),
  email: employeeForm.email.trim(),
  specialty: employeeForm.specialty.trim(),
  position: employeeForm.specialty.trim(),
  department_id: employeeForm.department_id || null,
  cabinet: employeeForm.cabinet.trim(),
  role: "doctor",
  ...(editingEmployeeId ? {} : { status: "active" }),
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
        throw new Error(result.message || "Не удалось сохранить врача.");
      }

     setMessage(
  editingEmployeeId
    ? "Данные врача успешно изменены."
    : "Врач успешно добавлен."
);
      resetEmployeeForm();
      loadData();
    } catch (err) {
      setMessage(err.message || "Ошибка сохранения врача.");
    } finally {
      setSavingEmployee(false);
    }
  }

  function editEmployee(employee) {
    const item = normalizeEmployee(employee);
    setEditingEmployeeId(item.id);
    setEmployeeForm({
      full_name: item.fullName,
      birth_date: employee.birth_date || "",
      phone: item.phone,
      email: item.email,
      specialty: employee.specialty || item.position || "",
      department: departments.find(d => String(d.id) === String(item.departmentId))?.name || "",
      department_id: item.departmentId,
      cabinet: item.cabinet,
      role: "doctor",
    });
    setShowEmployeeForm(true);
  }

  async function dismissEmployee(employee) {
  const confirmed = window.confirm(
    "Удалить врача " +
      employee.full_name +
      "? Врач будет перемещён в архив, а его медицинская история сохранится."
  );

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
          status: "dismissed",
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Не удалось переместить врача в архив."
      );
    }

    setMessage("Врач перемещён в архив.");
    loadData();
  } catch (err) {
    setMessage(
      err.message || "Ошибка перемещения врача в архив."
    );
  } finally {
    setLoading(false);
  }
}

  

  

  function resetEmployeeForm() {
  setEmployeeForm(EMPTY_EMPLOYEE_FORM);

  setDoctorScheduleForm(
    createInitialDoctorSchedule()
  );

  setSchedulePreset({
    work_start: "09:00",
    work_end: "17:30",
    lunch_start: "13:00",
    lunch_end: "14:00",
    slot_duration: 30,
  });

  setEditingEmployeeId(null);
  setShowEmployeeForm(false);
}

  function updateEmployeeField(e) {
    const { name, value } = e.target;
    setEmployeeForm((prev) => ({ ...prev, [name]: value }));
  }

  function handlePositionChange(e) {
  const value = e.target.value;

  setEmployeeForm((prev) => ({
    ...prev,
    position: value,
    role: "doctor",
  }));
}
function updateSchedulePeriod(field, value) {
  setDoctorScheduleForm((prev) => ({
    ...prev,
    [field]: value,
  }));
}

function toggleScheduleDay(dayId) {
  setDoctorScheduleForm((prev) => ({
    ...prev,
    days: {
      ...prev.days,
      [dayId]: {
        ...prev.days[dayId],
        is_working: !prev.days[dayId].is_working,
      },
    },
  }));
}

function updateScheduleDay(dayId, field, value) {
  setDoctorScheduleForm((prev) => ({
    ...prev,
    days: {
      ...prev.days,
      [dayId]: {
        ...prev.days[dayId],
        [field]:
          field === "slot_duration"
            ? Number(value)
            : value,
      },
    },
  }));
}

function selectAllScheduleDays() {
  setDoctorScheduleForm((prev) => {
    const updatedDays = {};

    WEEK_DAYS.forEach((day) => {
      updatedDays[day.id] = {
        ...prev.days[day.id],
        is_working: true,
      };
    });

    return {
      ...prev,
      days: updatedDays,
    };
  });
}

function clearAllScheduleDays() {
  setDoctorScheduleForm((prev) => {
    const updatedDays = {};

    WEEK_DAYS.forEach((day) => {
      updatedDays[day.id] = {
        ...prev.days[day.id],
        is_working: false,
      };
    });

    return {
      ...prev,
      days: updatedDays,
    };
  });
}

function updateSchedulePreset(field, value) {
  setSchedulePreset((prev) => ({
    ...prev,
    [field]:
      field === "slot_duration"
        ? Number(value)
        : value,
  }));
}

function applyPresetToWorkingDays() {
  setDoctorScheduleForm((prev) => {
    const updatedDays = { ...prev.days };

    WEEK_DAYS.forEach((day) => {
      if (!updatedDays[day.id].is_working) {
        return;
      }

      updatedDays[day.id] = {
        ...updatedDays[day.id],
        work_start: schedulePreset.work_start,
        work_end: schedulePreset.work_end,
        lunch_start: schedulePreset.lunch_start,
        lunch_end: schedulePreset.lunch_end,
        slot_duration: Number(schedulePreset.slot_duration),
      };
    });

    return {
      ...prev,
      days: updatedDays,
    };
  });
}

function copyScheduleToOtherWorkingDays(sourceDayId) {
  const sourceDay = doctorScheduleForm.days[sourceDayId];

  if (!sourceDay) {
    return;
  }

  setDoctorScheduleForm((prev) => {
    const updatedDays = { ...prev.days };

    WEEK_DAYS.forEach((day) => {
      if (
        day.id !== sourceDayId &&
        updatedDays[day.id].is_working
      ) {
        updatedDays[day.id] = {
          ...updatedDays[day.id],
          work_start: sourceDay.work_start,
          work_end: sourceDay.work_end,
          lunch_start: sourceDay.lunch_start,
          lunch_end: sourceDay.lunch_end,
          slot_duration: sourceDay.slot_duration,
        };
      }
    });

    return {
      ...prev,
      days: updatedDays,
    };
  });
}

  

  useEffect(() => {
    if (selectedEmployee) {
      if (tab === "schedules") {
        setActiveSubTab("schedule");
      } else {
        setActiveSubTab("info");
      }
      loadSelectedEmployeeData(selectedEmployee.id);
    }
  }, [selectedEmployee, tab]);

  async function loadSelectedEmployeeData(empId) {
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/employees/${empId}/schedule`);
      const data = await res.json();
      if (res.ok && data.schedule) {
        const days = {};
        const dbDays = data.schedule.daily_schedules || {};
        WEEK_DAYS.forEach(day => {
          const dbDay = dbDays[day.id] || {};
          days[day.id] = {
            is_working: data.schedule.work_days.includes(day.id),
            work_start: dbDay.work_start || "09:00",
            work_end: dbDay.work_end || "17:30",
            lunch_start: dbDay.lunch_start || "13:00",
            lunch_end: dbDay.lunch_end || "14:00",
            slot_duration: dbDay.slot_duration || 30
          };
        });
        setDoctorScheduleForm({
          valid_from: data.schedule.start_date || "",
          valid_to: data.schedule.end_date || "",
          days
        });
      } else {
        setDoctorScheduleForm(createInitialDoctorSchedule());
      }
    } catch (e) {
      console.error("Error loading schedule:", e);
      setDoctorScheduleForm(createInitialDoctorSchedule());
    }

    try {
      const res = await fetch(`${API_URL}/api/organization-structure/employees/${empId}/absence`);
      const data = await res.json();
      if (res.ok) setEmployeeAbsences(data.absences || []);
    } catch (e) {
      console.error("Error loading absences:", e);
    }

    try {
      const res = await fetch(`${API_URL}/api/organization-structure/employees/${empId}/exceptions`);
      const data = await res.json();
      if (res.ok) setEmployeeExceptions(data.exceptions || []);
    } catch (e) {
      console.error("Error loading exceptions:", e);
    }
  }

  async function saveWeeklySchedule(e) {
    e.preventDefault();
    if (!selectedEmployee) return;
    setLoading(true);
    setMessage("");
    try {
      const work_days = Object.keys(doctorScheduleForm.days)
        .filter(dayId => doctorScheduleForm.days[dayId].is_working)
        .map(Number);
      
      const payload = {
        work_days,
        work_start: "09:00",
        work_end: "17:30",
        lunch_start: "13:00",
        lunch_end: "14:00",
        slot_duration: 30,
        start_date: doctorScheduleForm.valid_from || new Date().toISOString().split('T')[0],
        end_date: doctorScheduleForm.valid_to || null,
        daily_schedules: doctorScheduleForm.days
      };

      const response = await fetch(`${API_URL}/api/organization-structure/employees/${selectedEmployee.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Не удалось сохранить график");
      setMessage("График работы врача успешно сохранен.");
      loadSelectedEmployeeData(selectedEmployee.id);
    } catch (err) {
      setMessage(err.message || "Ошибка сохранения графика");
    } finally {
      setLoading(false);
    }
  }

  async function addAbsence(e) {
    e.preventDefault();
    if (!selectedEmployee) return;
    setLoading(true);
    setMessage("");
    setAbsenceAffectedApps([]);
    try {
      const response = await fetch(`${API_URL}/api/organization-structure/employees/${selectedEmployee.id}/absence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(absenceForm)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Не удалось зарегистрировать отсутствие");
      
      setMessage("Отсутствие успешно зарегистрировано.");
      if (data.affectedAppointments && data.affectedAppointments.length > 0) {
        setAbsenceAffectedApps(data.affectedAppointments);
      }
      setAbsenceForm({
        absence_type: "planned",
        reason: "vacation",
        start_date: "",
        end_date: "",
        comment: ""
      });
      loadSelectedEmployeeData(selectedEmployee.id);
      loadAllTransfers();
    } catch (err) {
      setMessage(err.message || "Ошибка регистрации отсутствия");
    } finally {
      setLoading(false);
    }
  }

  async function removeAbsence(absenceId) {
    if (!selectedEmployee) return;
    if (!window.confirm("Вы уверены, что хотите снять это отсутствие? Врач вернется к обычному графику.")) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/organization-structure/employees/${selectedEmployee.id}/absence/${absenceId}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Не удалось снять отсутствие");
      setMessage("Отсутствие успешно снято.");
      loadSelectedEmployeeData(selectedEmployee.id);
    } catch (err) {
      setMessage(err.message || "Ошибка снятия отсутствия");
    } finally {
      setLoading(false);
    }
  }

  async function addException(e) {
    e.preventDefault();
    if (!selectedEmployee) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/organization-structure/employees/${selectedEmployee.id}/exceptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exceptionForm)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Не удалось сохранить исключение");
      setMessage("Исключение из графика добавлено.");
      setExceptionForm({
        exception_date: "",
        is_working: true,
        work_start: "09:00",
        work_end: "17:30",
        lunch_start: "13:00",
        lunch_end: "14:00",
        slot_duration: 30
      });
      loadSelectedEmployeeData(selectedEmployee.id);
    } catch (err) {
      setMessage(err.message || "Ошибка сохранения исключения");
    } finally {
      setLoading(false);
    }
  }

  async function removeException(exceptionId) {
    if (!selectedEmployee) return;
    if (!window.confirm("Удалить это исключение из графика?")) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/organization-structure/employees/${selectedEmployee.id}/exceptions/${exceptionId}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Не удалось удалить исключение");
      setMessage("Исключение удалено.");
      loadSelectedEmployeeData(selectedEmployee.id);
    } catch (err) {
      setMessage(err.message || "Ошибка удаления исключения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="org-admin-page">
      <div className="gov-page-head">
        <div>
          <h2 className="gov-page-title">Администратор организации</h2>
          <p className="gov-page-subtitle">
            Управление отделениями, врачами и доступами.
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
              <span>Врачей</span>
              <b>{currentEmployees.length}</b>
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
            <h3>Врачи, ожидающие создания доступа ({noAccessCount})</h3>
            {currentEmployees.filter((emp) => !emp.login).length === 0 ? (
              <p className="empty-text" style={{ margin: "10px 0 0" }}>Все врачи имеют доступы.</p>
            ) : (
              <div className="employee-card-list" style={{ marginTop: "16px" }}>
                {currentEmployees
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
    employee.status !== "dismissed" &&
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

                        <b>{people.length} врачей</b>
                      </div>

                      <div className="department-people">
                        {people.length ? (
                          people.map((person) => (
                            <span key={person.id}>
                              {person.full_name} — {person.position || "должность не указана"}
                            </span>
                          ))
                        ) : (
                          <em>Врачи пока не добавлены</em>
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
                {editingEmployeeId ? "✏️ Редактировать профиль врача" : "👤 Добавление нового врача"}
              </h3>

              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ color: '#0f172a', margin: '0 0 16px', fontSize: '15px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📋 Личные данные
                </h4>
                <div className="gov-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    ФИО врача
                    <input
                      name="full_name"
                      value={employeeForm.full_name}
                      onChange={updateEmployeeField}
                      placeholder="Иванов Иван Иванович"
                      required
                    />
                  </label>

                  <label
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        {t("birthDateLabel") || "Дата рождения"}
                        <input
                          type="date"
                          name="birth_date"
                          value={employeeForm.birth_date}
                          onChange={updateEmployeeField}
                          required
                          style={{
                            padding: "8px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                          }}
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
                    {t("specialtyLabel") || "Специальность"}
                    <input
                      name="specialty"
                      value={employeeForm.specialty}
                      onChange={updateEmployeeField}
                      placeholder="Например: Терапевт"
                      required
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </label>

<label
  style={{
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  }}
>
  Отделение

  <select
    name="department_id"
    value={employeeForm.department_id}
    onChange={(e) => {
      const departmentId = e.target.value;

      const selectedDep = departments.find(
        (department) =>
          String(department.id) === String(departmentId)
      );

      setEmployeeForm((prev) => ({
        ...prev,
        department_id: departmentId,
        department: selectedDep?.name || "",
        cabinet: "",
      }));
    }}
    required
    style={{
      padding: "8px",
      borderRadius: "8px",
      border: "1px solid #cbd5e1",
    }}
  >
    <option value="">Выберите отделение</option>

    {departments.map((department) => (
      <option key={department.id} value={department.id}>
        {department.name} —{" "}
        {department.floor || "этаж не указан"}, кабинеты:{" "}
        {department.rooms || "не указаны"}
      </option>
    ))}
  </select>
</label>



<label
  style={{
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  }}
>
  Кабинет

  <select
    name="cabinet"
    value={employeeForm.cabinet}
    onChange={updateEmployeeField}
    disabled={
      !employeeForm.department_id ||
      availableCabinets.length === 0
    }
    required
    style={{
      padding: "8px",
      borderRadius: "8px",
      border: "1px solid #cbd5e1",
      background:
        !employeeForm.department_id ||
        availableCabinets.length === 0
          ? "#f1f5f9"
          : "#ffffff",
      cursor:
        !employeeForm.department_id ||
        availableCabinets.length === 0
          ? "not-allowed"
          : "pointer",
    }}
  >
    <option value="">
      {!employeeForm.department_id
        ? "Сначала выберите отделение"
        : availableCabinets.length === 0
          ? "В отделении нет кабинетов"
          : "Выберите кабинет"}
    </option>

    {employeeForm.cabinet &&
      !availableCabinets.includes(employeeForm.cabinet) && (
        <option value={employeeForm.cabinet}>
          Кабинет {employeeForm.cabinet}
        </option>
      )}

    {availableCabinets.map((cabinet) => (
      <option key={cabinet} value={cabinet}>
        Кабинет {cabinet}
      </option>
    ))}
  </select>
</label>



                  

                  

                  
                </div>
              </div>

             
                <button type="submit" disabled={savingEmployee} style={{ background: '#00b85a', color: '#fff', border: 0, padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {savingEmployee ? "Сохранение..." : editingEmployeeId ? "Сохранить изменения" : "Добавить врача"}
                </button>

                <button type="button" onClick={() => {
  setEmployeeForm(EMPTY_EMPLOYEE_FORM);

  setDoctorScheduleForm(
    createInitialDoctorSchedule()
  );

  setSchedulePreset({
    work_start: "09:00",
    work_end: "17:30",
    lunch_start: "13:00",
    lunch_end: "14:00",
    slot_duration: 30,
  });
}}
style={{ background: '#64748b', color: '#fff', border: 0, padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Очистить
                </button>

                <button type="button" onClick={resetEmployeeForm} style={{ background: '#cbd5e1', color: '#1e293b', border: 0, padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Назад к списку
                </button>
              
            </form>
          ) : (
            <section className="gov-card">
              <div className="employee-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h3>Список врачей</h3>
                  <p className="gov-page-subtitle">
                    Добавление врачей организации, изменение данных и управление доступом.
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
                    ➕ Добавить врача
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
                  <option value="dismissed">В архиве</option>
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
                            <p
                              style={{
                                margin: "4px 0",
                                fontSize: "13px",
                                color: "#64748b",
                              }}
                            >
                              Возраст: {item.age ? `${item.age} лет` : "—"}
                            </p>
                            <p style={{ margin: "4px 0", color: "#64748b", fontWeight: "bold" }}>{item.position || "Должность не указана"}</p>
                            <p style={{ margin: "2px 0", fontSize: "13px", color: "#475569" }}>
                              📞 {item.phone || "—"} | ✉️ {item.email || "—"}
                            </p>
                          </div>

                          <div className="employee-card-info" style={{ textAlign: "right", fontSize: "13px", color: "#64748b" }}>
                            <div style={{ fontWeight: "bold" }}>Отделение: {getDepartmentName(item.departmentId)}</div>
                            <div>Кабинет: {item.cabinet || "—"}</div>
                            
                            <div>Логин: <b>{item.login || "не создан"}</b></div>
                            <div>Статус: <span className={`status-badge-mini ${item.status}`}>{getStatusText(item.status)}</span></div>
                          </div>
                        </div>

                        <div className="employee-actions" style={{ display: "flex", gap: "8px", marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "12px", flexWrap: "wrap" }}>
                          <button type="button" onClick={() => editEmployee(employee)} style={{ background: "#3b82f6", color: "#ffffff", border: 0, borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" }}>
                            Изменить данные
                          </button>

                          

                          {employee.status !== "dismissed" && (
                            <button type="button" onClick={() => dismissEmployee(employee)} style={{ background: "#ef4444", color: "#ffffff", border: 0, borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" }}>
                              Удалить 
                            </button>
                          )}

                          

                          
{item.status !== "dismissed" && (
  <div
    style={{
      marginLeft: "auto",
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
    }}
  >
    {!item.login ? (
      <button
        type="button"
        onClick={() => openAccessModal(employee)}
        style={{
          background: "#00b85a",
          color: "#ffffff",
          border: 0,
          borderRadius: "8px",
          padding: "6px 12px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: "bold",
        }}
      >
        Выдать доступ
      </button>
    ) : (
      <>
        <button
          type="button"
          onClick={() => resetPassword(employee)}
          style={{
            background: "#f59e0b",
            color: "#ffffff",
            border: 0,
            borderRadius: "8px",
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Сбросить пароль
        </button>

        {item.status === "blocked" ? (
          <button
            type="button"
            onClick={() =>
              changeBlockStatus(employee, "unblock")
            }
            style={{
              background: "#10b981",
              color: "#ffffff",
              border: 0,
              borderRadius: "8px",
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Разблокировать
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              changeBlockStatus(employee, "block")
            }
            style={{
              background: "#ef4444",
              color: "#ffffff",
              border: 0,
              borderRadius: "8px",
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Заблокировать
          </button>
        )}
      </>
    )}
  </div>
)}


                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="empty-text">Врачи не найдены.</p>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* -------------------- TAB: SCHEDULES -------------------- */}
      {tab === "schedules" && (
        <section className="gov-card">
          <div className="employee-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h3>Графики работы врачей</h3>
              <p className="gov-page-subtitle">
                Выберите врача из списка, чтобы настроить его еженедельный график работы.
              </p>
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
              placeholder="Поиск по ФИО, должности"
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
          </div>

          <div className="employee-card-list">
            {filteredEmployees.length ? (
              filteredEmployees.map((employee) => {
                const item = normalizeEmployee(employee);

                return (
                  <div
                    className="employee-card"
                    key={item.id}
                    onClick={() => setSelectedEmployee(item)}
                    style={{ padding: "16px", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "12px", background: "#ffffff", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "16px", color: "#1e293b" }}>{item.fullName}</h4>
                        <p style={{ margin: "4px 0 0", color: "#00b85a", fontWeight: "bold", fontSize: "14px" }}>
                          {item.position || "Врач"}
                        </p>
                        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
                          Кабинет: {item.cabinet || "—"} | Отделение: {getDepartmentName(item.departmentId)}
                        </p>
                      </div>
                      <div>
                        <button
                          type="button"
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
                          Настроить график
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="empty-text">Врачи не найдены.</p>
            )}
          </div>
        </section>
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
              <p className="gov-page-subtitle">Важные системные уведомления о действиях врачей, переносах записей и обращениях.</p>
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
          <div 
            className="employee-modal-card" 
            onClick={(e) => e.stopPropagation()}
            style={{ width: activeSubTab !== 'info' ? 'min(900px, 95%)' : 'min(760px, 95%)', transition: 'width 0.25s ease' }}
          >
            <button onClick={() => setSelectedEmployee(null)}>×</button>

            <h3>{selectedEmployee.fullName}</h3>
            <p>{selectedEmployee.specialty || selectedEmployee.position}</p>

            {/* Modal tabs */}
            {tab !== "schedules" && (
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => setActiveSubTab("info")}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 0,
                    background: activeSubTab === 'info' ? '#1e293b' : 'transparent',
                    color: activeSubTab === 'info' ? '#ffffff' : '#64748b',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {t("generalInfo") || "Информация"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab("schedule")}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 0,
                    background: activeSubTab === 'schedule' ? '#1e293b' : 'transparent',
                    color: activeSubTab === 'schedule' ? '#ffffff' : '#64748b',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {t("scheduleConstructorTab") || "График работы"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab("absences")}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 0,
                    background: activeSubTab === 'absences' ? '#1e293b' : 'transparent',
                    color: activeSubTab === 'absences' ? '#ffffff' : '#64748b',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {t("absencesExceptionsTab") || "Отсутствия и исключения"}
                </button>
              </div>
            )}

            {/* TAB CONTENT: General Info */}
            {activeSubTab === "info" && (
              <div className="employee-detail-grid">
                <div>
                  <span>{t("phone") || "Телефон"}</span>
                  <b>{selectedEmployee.phone || "—"}</b>
                </div>

                <div>
                  <span>{t("birthDateLabel") || "Дата рождения"}</span>
                  <b>{selectedEmployee.birth_date || "—"}</b>
                </div>

                <div>
                  <span>{t("email") || "Почта"}</span>
                  <b>{selectedEmployee.email || "—"}</b>
                </div>

                <div>
                  <span>{t("specialtyLabel") || "Специальность"}</span>
                  <b>{selectedEmployee.specialty || selectedEmployee.position || "—"}</b>
                </div>

                <div>
                  <span>Отделение</span>
                  <b>{getDepartmentName(selectedEmployee.departmentId)}</b>
                </div>

                <div>
                  <span>{t("cabinet") || "Кабинет"}</span>
                  <b>{selectedEmployee.cabinet || "—"}</b>
                </div>

                <div>
                  <span>Логин</span>
                  <b>{selectedEmployee.login || "—"}</b>
                </div>

                <div>
                  <span>{t("status") || "Статус"}</span>
                  <b>{getStatusText(selectedEmployee.status)}</b>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Weekly Schedule */}
            {activeSubTab === "schedule" && (
              <form onSubmit={saveWeeklySchedule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 'bold', width: '100%', fontSize: '13px', color: '#1e293b' }}>
                    {t("presetLabel") || "Шаблон графика:"}
                  </div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                    Начало работы
                    <input type="time" value={schedulePreset.work_start} onChange={e => updateSchedulePreset("work_start", e.target.value)} style={{ padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                    Окончание работы
                    <input type="time" value={schedulePreset.work_end} onChange={e => updateSchedulePreset("work_end", e.target.value)} style={{ padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                    Обед с
                    <input type="time" value={schedulePreset.lunch_start} onChange={e => updateSchedulePreset("lunch_start", e.target.value)} style={{ padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                    Обед по
                    <input type="time" value={schedulePreset.lunch_end} onChange={e => updateSchedulePreset("lunch_end", e.target.value)} style={{ padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                    Длительность
                    <select value={schedulePreset.slot_duration} onChange={e => updateSchedulePreset("slot_duration", e.target.value)} style={{ padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="15">15 минут</option>
                      <option value="20">20 минут</option>
                      <option value="30">30 минут</option>
                      <option value="45">45 минут</option>
                      <option value="60">60 минут</option>
                    </select>
                  </label>
                  <button type="button" onClick={applyPresetToWorkingDays} style={{ alignSelf: 'flex-end', background: '#3b82f6', color: '#fff', border: 0, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginTop: '4px' }}>
                    {t("applyPresetBtn") || "Применить"}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                  {WEEK_DAYS.map(day => {
                    const daySched = doctorScheduleForm.days[day.id] || {};
                    return (
                      <div key={day.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: daySched.is_working ? '#f0fdf4' : '#f8fafc', borderRadius: '10px', border: '1px solid', borderColor: daySched.is_working ? '#bbf7d0' : '#e2e8f0', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', minWidth: '100px', fontSize: '13px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={daySched.is_working || false} onChange={() => toggleScheduleDay(day.id)} />
                          {day.name}
                        </label>

                        {daySched.is_working && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              Работа:
                              <input type="time" value={daySched.work_start} onChange={e => updateScheduleDay(day.id, "work_start", e.target.value)} style={{ padding: '3px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                              –
                              <input type="time" value={daySched.work_end} onChange={e => updateScheduleDay(day.id, "work_end", e.target.value)} style={{ padding: '3px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                            </label>

                            <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              Обед:
                              <input type="time" value={daySched.lunch_start} onChange={e => updateScheduleDay(day.id, "lunch_start", e.target.value)} style={{ padding: '3px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                              –
                              <input type="time" value={daySched.lunch_end} onChange={e => updateScheduleDay(day.id, "lunch_end", e.target.value)} style={{ padding: '3px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                            </label>

                            <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              Слот:
                              <select value={daySched.slot_duration} onChange={e => updateScheduleDay(day.id, "slot_duration", e.target.value)} style={{ padding: '3px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                                <option value="15">15 м</option>
                                <option value="20">20 м</option>
                                <option value="30">30 м</option>
                                <option value="45">45 м</option>
                                <option value="60">60 м</option>
                              </select>
                            </label>

                            <button type="button" onClick={() => copyScheduleToOtherWorkingDays(day.id)} style={{ background: '#e2e8f0', color: '#1e293b', border: 0, padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
                              {t("copyDayBtn") || "Скопировать"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, fontSize: '12px' }}>
                    {t("validFrom") || "Действует с"}
                    <input type="date" value={doctorScheduleForm.valid_from} onChange={e => updateSchedulePeriod("valid_from", e.target.value)} required style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, fontSize: '12px' }}>
                    {t("validTo") || "Действует по"}
                    <input type="date" value={doctorScheduleForm.valid_to} onChange={e => updateSchedulePeriod("valid_to", e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </label>
                </div>

                <button type="submit" disabled={loading} style={{ background: '#10b981', color: '#fff', border: 0, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                  {loading ? "Сохранение..." : (t("saveScheduleBtn") || "Сохранить график")}
                </button>
              </form>
            )}

            {/* TAB CONTENT: Absences & Exceptions */}
            {activeSubTab === "absences" && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '420px', overflowY: 'auto' }}>
                {/* Exceptions panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ margin: '0', fontSize: '13px', borderBottom: '2px solid #e2e8f0', paddingBottom: '4px', color: '#1e293b' }}>
                    {t("exceptionDate") || "Исключения из графика"}
                  </h4>

                  <form onSubmit={addException} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                      Дата исключения
                      <input type="date" value={exceptionForm.exception_date} onChange={e => setExceptionForm(prev => ({ ...prev, exception_date: e.target.value }))} required style={{ padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                      <input type="checkbox" checked={exceptionForm.is_working} onChange={e => setExceptionForm(prev => ({ ...prev, is_working: e.target.checked }))} />
                      {t("isWorkingDay") || "Рабочий день"}
                    </label>

                    {exceptionForm.is_working && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, fontSize: '10px' }}>
                            Работа с
                            <input type="time" value={exceptionForm.work_start} onChange={e => setExceptionForm(prev => ({ ...prev, work_start: e.target.value }))} style={{ padding: '3px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, fontSize: '10px' }}>
                            Работа по
                            <input type="time" value={exceptionForm.work_end} onChange={e => setExceptionForm(prev => ({ ...prev, work_end: e.target.value }))} style={{ padding: '3px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, fontSize: '10px' }}>
                            Обед с
                            <input type="time" value={exceptionForm.lunch_start} onChange={e => setExceptionForm(prev => ({ ...prev, lunch_start: e.target.value }))} style={{ padding: '3px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, fontSize: '10px' }}>
                            Обед по
                            <input type="time" value={exceptionForm.lunch_end} onChange={e => setExceptionForm(prev => ({ ...prev, lunch_end: e.target.value }))} style={{ padding: '3px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                          </label>
                        </div>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '10px' }}>
                          Слот приёма
                          <select value={exceptionForm.slot_duration} onChange={e => setExceptionForm(prev => ({ ...prev, slot_duration: Number(e.target.value) }))} style={{ padding: '3px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                            <option value="15">15 минут</option>
                            <option value="20">20 минут</option>
                            <option value="30">30 минут</option>
                            <option value="45">45 минут</option>
                            <option value="60">60 минут</option>
                          </select>
                        </label>
                      </div>
                    )}

                    <button type="submit" disabled={loading} style={{ background: '#3b82f6', color: '#fff', border: 0, padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', marginTop: '2px' }}>
                      {t("addExceptionBtn") || "Добавить"}
                    </button>
                  </form>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                    {employeeExceptions.length > 0 ? (
                      employeeExceptions.map(ex => (
                        <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#f1f5f9', borderRadius: '6px', fontSize: '11px' }}>
                          <div>
                            <strong>{ex.exception_date}</strong>: {ex.is_working ? "Работа " + ex.work_start + "–" + ex.work_end : "Выходной"}
                          </div>
                          <button type="button" onClick={() => removeException(ex.id)} style={{ border: 0, background: 'transparent', color: '#ef4444', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>
                            ×
                          </button>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                        {t("noExceptions") || "Исключений из графика нет."}
                      </p>
                    )}
                  </div>
                </div>

                {/* Absences panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ margin: '0', fontSize: '13px', borderBottom: '2px solid #e2e8f0', paddingBottom: '4px', color: '#1e293b' }}>
                    {t("absencesExceptionsTab") || "Отсутствия врача"}
                  </h4>

                  <form onSubmit={addAbsence} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                      {t("absenceType") || "Тип отсутствия"}
                      <select value={absenceForm.absence_type} onChange={e => setAbsenceForm(prev => ({ ...prev, absence_type: e.target.value, reason: e.target.value === "emergency" ? "sick" : "vacation" }))} style={{ padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                        <option value="planned">{t("plannedAbsence") || "Плановое"}</option>
                        <option value="emergency">{t("emergencyAbsence") || "Экстренное"}</option>
                      </select>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                      {t("absenceReason") || "Причина"}
                      <select value={absenceForm.reason} onChange={e => setAbsenceForm(prev => ({ ...prev, reason: e.target.value }))} style={{ padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                        {absenceForm.absence_type === "planned" ? (
                          <>
                            <option value="vacation">{t("vacation") || "Отпуск"}</option>
                            <option value="conference">{t("conference") || "Конференция"}</option>
                            <option value="training">{t("training") || "Обучение"}</option>
                            <option value="personal">{t("personal") || "Личные обстоятельства"}</option>
                          </>
                        ) : (
                          <>
                            <option value="sick">{t("sick") || "Больничный"}</option>
                            <option value="emergency">{t("emergency") || "Экстренный случай"}</option>
                          </>
                        )}
                      </select>
                    </label>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, fontSize: '11px' }}>
                        {t("startDate") || "Начало"}
                        <input type="date" value={absenceForm.start_date} onChange={e => setAbsenceForm(prev => ({ ...prev, start_date: e.target.value }))} required style={{ padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, fontSize: '11px' }}>
                        {t("endDate") || "Окончание"}
                        <input type="date" value={absenceForm.end_date} onChange={e => setAbsenceForm(prev => ({ ...prev, end_date: e.target.value }))} required style={{ padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
                      </label>
                    </div>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                      {t("absenceComment") || "Комментарий"}
                      <textarea value={absenceForm.comment} onChange={e => setAbsenceForm(prev => ({ ...prev, comment: e.target.value }))} placeholder="..." style={{ padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', height: '35px', resize: 'none' }} />
                    </label>

                    <button type="submit" disabled={loading} style={{ background: '#f43f5e', color: '#fff', border: 0, padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>
                      {t("registerAbsence") || "Зарегистрировать"}
                    </button>
                  </form>

                  {absenceAffectedApps.length > 0 && (
                    <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '8px', fontSize: '11px', color: '#9f1239' }}>
                      <strong>{t("affectedAppointmentsWarning") || "Отсутствие затронет записи:"}</strong>
                      <div style={{ maxHeight: '80px', overflowY: 'auto', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {absenceAffectedApps.map(app => (
                          <div key={app.id} style={{ background: '#ffe4e6', padding: '4px', borderRadius: '4px' }}>
                            • {app.patient_name} — {app.date} {app.time}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                    {employeeAbsences.length > 0 ? (
                      employeeAbsences.map(abs => (
                        <div key={abs.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#ffe4e6', borderRadius: '6px', fontSize: '11px', border: '1px solid #fecdd3' }}>
                          <div>
                            <strong>{t(abs.reason) || abs.reason}</strong>: {abs.start_date} – {abs.end_date}
                          </div>
                          <button type="button" onClick={() => removeAbsence(abs.id)} style={{ border: 0, background: 'transparent', color: '#e11d48', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>
                            ×
                          </button>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                        {t("noAbsences") || "Отсутствий врача нет."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
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