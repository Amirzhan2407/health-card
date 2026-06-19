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
    };
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
        <section className="gov-card">
          <div className="employee-top">
            <div>
              <h3>Доступы сотрудников</h3>
              <p className="gov-page-subtitle">
                Сотрудников добавляет отдел кадров. Администратор только выдает логин и пароль.
              </p>
            </div>

            <div className="employee-filters">
              <input
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    search: e.target.value,
                  }))
                }
                placeholder="Поиск по ФИО, должности, логину"
              />

              <select
                value={filters.departmentId}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    departmentId: e.target.value,
                  }))
                }
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
              >
                <option value="all">Все статусы</option>
                <option value="no_access">Нет доступа</option>
                <option value="active">Активен</option>
                <option value="blocked">Заблокирован</option>
              </select>
            </div>
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
                  >
                    <div>
                      <h4>{item.fullName}</h4>
                      <p>{item.position || "Должность не указана"}</p>
                    </div>

                    <div className="employee-card-info">
                      <span>Отделение: {getDepartmentName(item.departmentId)}</span>
                      <span>Кабинет: {item.cabinet || "—"}</span>
                      <span>Логин: {item.login || "не создан"}</span>
                      <span>Статус: {getStatusText(item.status)}</span>
                    </div>

                    <div className="employee-actions">
                      {!item.login ? (
                        <button type="button" onClick={() => openAccessModal(employee)}>
                          Создать доступ
                        </button>
                      ) : (
                        <>
                          <button type="button" onClick={() => resetPassword(employee)}>
                            Сбросить пароль
                          </button>

                          {item.status === "blocked" ? (
                            <button
                              type="button"
                              onClick={() => changeBlockStatus(employee, "unblock")}
                            >
                              Разблокировать
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => changeBlockStatus(employee, "block")}
                            >
                              Заблокировать
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="empty-text">Сотрудники пока не добавлены отделом кадров.</p>
            )}
          </div>
        </section>
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