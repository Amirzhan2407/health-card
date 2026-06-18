import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API_URL = (
  import.meta.env.VITE_API_URL || "https://health-card.onrender.com"
).replace(/\/$/, "");

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