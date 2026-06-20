import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

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
  "Отдел кадров",
  "Бухгалтерия",
  "ИТ отдел",
];

const POSITIONS = [
  "Врач-терапевт",
  "Врач-педиатр",
  "Врач-хирург",
  "Врач-tравматолог",
  "Врач-невролог",
  "Врач-кардиолог",
  "Врач-гинеколог",
  "Врач-офтальмолог",
  "Врач-отоларинголог (ЛОР)",
  "Врач-дерматолог",
  "Врач УЗИ",
  "Врач-рентгенолог",
  "Медсестра",
  "Медбрат",
  "Старшая медсестра",
  "Регистратор",
  "Заведующий отделением",
  "Заместитель главного врача",
  "Кадровый специалист",
  "Бухгалтер"
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

  // Load Support Messages periodically
  useEffect(() => {
    if (tab !== "support" || !organizationId) return;
    loadSupportMessages();
    const interval = setInterval(loadSupportMessages, 3000);
    return () => clearInterval(interval);
  }, [tab, organizationId]);

  async function loadSupportMessages() {
    try {
      const res = await fetch(`${API_URL}/api/organization-structure/support-messages`, {
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

  async function sendSupportMessage(e) {
    e.preventDefault();
    if (!newSupportMsg.trim() && !supportFile) return;

    setLoading(true);
    let finalMessage = newSupportMsg.trim();

    try {
      if (supportFile) {
        setUploadingFile(true);
        const formData = new FormData();
        formData.append("file", supportFile);

        const uploadRes = await fetch(`${API_URL}/api/organization-structure/support-upload`, {
          method: "POST",
          headers: {
            "x-organization-id": organizationId
          },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.file_url) {
          finalMessage += (finalMessage ? "\n" : "") + `[Документ: ${uploadData.file_name}](${uploadData.file_url})`;
        } else {
          throw new Error(uploadData.message || "Ошибка при загрузке файла");
        }
      }

      const res = await fetch(`${API_URL}/api/organization-structure/support-messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": organizationId
        },
        body: JSON.stringify({
          message: finalMessage,
          senderUsername: organizationUser?.login,
          senderFullName: organizationUser?.full_name || "Администратор клиники"
        })
      });

      const result = await res.json();
      if (res.ok) {
        setNewSupportMsg("");
        setSupportFile(null);
        loadSupportMessages();
      } else {
        throw new Error(result.message || "Ошибка отправки сообщения");
      }
    } catch (err) {
      setMessage(err.message || "Ошибка чата");
    } finally {
      setLoading(false);
      setUploadingFile(false);
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

      {tab === "support" && (
        <div className="gov-card support-chat-card-container">
          <h3>Техническая поддержка</h3>
          <p className="gov-page-subtitle">
            Здесь вы можете общаться с технической поддержкой Clinic OS, отправлять тексты и подтверждающие документы (например, при смене главного врача, администратора или кадрового специалиста).
          </p>

          <div className="support-messages-box">
            {supportMessages.length === 0 ? (
              <p className="empty-chat-text">Нет сообщений. Напишите первое сообщение техподдержке.</p>
            ) : (
              supportMessages.map((msg) => {
                const isOwn = msg.sender_role === "organization_admin";
                // Simple parser for markdown links to render clickable documents
                const renderMessageText = (textStr) => {
                  const linkRegex = /\[Документ: (.+?)\]\((.+?)\)/g;
                  const parts = [];
                  let lastIndex = 0;
                  let match;
                  while ((match = linkRegex.exec(textStr)) !== null) {
                     if (match.index > lastIndex) {
                       parts.push(textStr.slice(lastIndex, match.index));
                     }
                     parts.push(
                       <a key={match[2]} href={match[2]} target="_blank" rel="noopener noreferrer" className="chat-doc-link">
                         📎 {match[1]} (скачать)
                       </a>
                     );
                     lastIndex = linkRegex.lastIndex;
                  }
                  if (lastIndex < textStr.length) {
                     parts.push(textStr.slice(lastIndex));
                  }
                  return parts.length > 0 ? parts : textStr;
                };

                return (
                  <div key={msg.id} className={`support-message-item ${isOwn ? "own" : "support"}`}>
                    <div className="msg-header">
                      <b>{msg.sender_full_name}</b>
                      <small>{new Date(msg.created_at).toLocaleString("ru-RU")}</small>
                    </div>
                     <p className="msg-body">{renderMessageText(msg.message)}</p>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={sendSupportMessage} className="support-send-form">
            <textarea
              placeholder="Введите текст обращения в техподдержку..."
              value={newSupportMsg}
              onChange={(e) => setNewSupportMsg(e.target.value)}
              className="support-textarea"
              required={!supportFile}
            />

            <div className="support-actions-bar">
              <div className="file-upload-wrapper">
                <input 
                  type="file" 
                  id="support-file-input"
                  onChange={(e) => setSupportFile(e.target.files[0])}
                  style={{ display: "none" }}
                />
                <label htmlFor="support-file-input" className="file-upload-label">
                  📎 {supportFile ? supportFile.name : "Прикрепить документ"}
                </label>
                {supportFile && (
                  <button type="button" onClick={() => setSupportFile(null)} className="clear-file-btn">×</button>
                )}
              </div>

              <button type="submit" disabled={loading || uploadingFile} className="support-submit-btn">
                {uploadingFile ? "Загрузка файла..." : loading ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedEmployee && (
        <div className="employee-modal" onClick={() => setSelectedEmployee(null)}>
          <div className="employee-modal-card" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedEmployee(null)}>×</button>

            <h3>{selectedEmployee.fullName}</h3>
            <p>{selectedEmployee.position}</p>

            <div className="employee-detail-grid">
              <div>
                <span>Возраст</span>
                <b>{selectedEmployee.age || "—"}</b>
              </div>

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

            <h4>Документы</h4>

            <div className="employee-docs">
              {selectedEmployee.documents?.length ? (
                selectedEmployee.documents.map((doc) => (
                  <span key={doc}>{doc}</span>
                ))
              ) : (
                <em>Документы не прикреплены</em>
              )}
            </div>
          </div>
        </div>
      )}

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