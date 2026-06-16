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

const POSITION_OPTIONS = [
  "Врач-терапевт",
  "Врач-педиатр",
  "Врач-хирург",
  "Врач-травматолог",
  "Врач-невропатолог",
  "Врач-кардиолог",
  "Врач-эндокринолог",
  "Врач-ЛОР",
  "Врач-офтальмолог",
  "Врач-гинеколог",
  "Врач-дерматолог",
  "Врач-инфекционист",
  "Врач-рентгенолог",
  "Врач УЗИ",
  "Медицинская сестра",
  "Старшая медицинская сестра",
  "Фельдшер",
  "Регистратор",
  "Лаборант",
  "Бухгалтер",
  "Специалист отдела кадров",
  "Системный администратор",
  "Заведующий отделением",
  "Заместитель главного врача",
];

function generatePassword() {
  const a = Math.random().toString(36).slice(2, 6).toUpperCase();
  const b = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${a}-${b}`;
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    floor: "",
    rooms: "",
  });

  const [employeeForm, setEmployeeForm] = useState({
    fullName: "",
    age: "",
    phone: "",
    email: "",
    position: "",
    departmentId: "",
    cabinet: "",
    login: "",
    tempPassword: "",
    documents: [],
  });

  const [filters, setFilters] = useState({
    search: "",
    departmentId: "all",
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
        String(employee.position || "").toLowerCase().includes(search);

      const matchesDepartment =
        filters.departmentId === "all" ||
        String(employee.department_id) === String(filters.departmentId);

      return matchesSearch && matchesDepartment;
    });
  }, [employees, filters]);

  const documentsCount = employees.reduce((total, employee) => {
    return total + (employee.documents?.length || 0);
  }, 0);

  function updateDepartmentForm(e) {
    const { name, value } = e.target;
    setDepartmentForm((prev) => ({ ...prev, [name]: value }));
  }

  function updateEmployeeForm(e) {
    const { name, value, files } = e.target;

    if (name === "documents") {
      setEmployeeForm((prev) => ({
        ...prev,
        documents: Array.from(files || []).map((file) => file.name),
      }));
      return;
    }

    setEmployeeForm((prev) => ({ ...prev, [name]: value }));
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

  async function addEmployee(e) {
    e.preventDefault();

    if (!organizationId) {
      setMessage("organizationId не найден. Перезайдите в аккаунт.");
      return;
    }

    if (
      !employeeForm.fullName.trim() ||
      !employeeForm.departmentId ||
      !employeeForm.position
    ) {
      setMessage("Заполните ФИО, должность и отделение.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/organization-structure/employees`,
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
            ...employeeForm,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Ошибка добавления сотрудника.");
      }

      setEmployees((prev) => [...prev, result.employee]);

      setEmployeeForm({
        fullName: "",
        age: "",
        phone: "",
        email: "",
        position: "",
        departmentId: "",
        cabinet: "",
        login: "",
        tempPassword: "",
        documents: [],
      });

      setMessage("Сотрудник сохранён.");
    } catch (error) {
      setMessage(error.message || "Ошибка добавления сотрудника.");
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
      tempPassword: employee.tempPassword || "",
      documents: employee.documents || [],
    };
  }

  return (
    <div className="org-admin-page">
      <div className="gov-page-head">
        <div>
          <h2 className="gov-page-title">Администратор организации</h2>
          <p className="gov-page-subtitle">
            Создание отделений, сотрудников, кабинетов и документов поликлиники.
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
            <span>Документов в карточках</span>
            <b>{documentsCount}</b>
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
                            <span key={person.id}>{person.full_name}</span>
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
        <div className="org-admin-grid">
          <section className="gov-card">
            <h3>Добавить сотрудника</h3>

            <form className="org-admin-form" onSubmit={addEmployee}>
              <label>
                ФИО
                <input
                  name="fullName"
                  value={employeeForm.fullName}
                  onChange={updateEmployeeForm}
                  placeholder="ФИО сотрудника"
                  required
                />
              </label>

              <label>
                Возраст
                <input
                  name="age"
                  value={employeeForm.age}
                  onChange={updateEmployeeForm}
                  placeholder="Например: 35"
                />
              </label>

              <label>
                Номер телефона
                <input
                  name="phone"
                  value={employeeForm.phone}
                  onChange={updateEmployeeForm}
                  placeholder="+7 777 000 00 00"
                />
              </label>

              <label>
                Почта
                <input
                  name="email"
                  value={employeeForm.email}
                  onChange={updateEmployeeForm}
                  placeholder="employee@clinic.kz"
                />
              </label>

              <label>
                Должность
                <select
                  name="position"
                  value={employeeForm.position}
                  onChange={updateEmployeeForm}
                  required
                >
                  <option value="">Выберите должность</option>
                  {POSITION_OPTIONS.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Отделение
                <select
                  name="departmentId"
                  value={employeeForm.departmentId}
                  onChange={updateEmployeeForm}
                  required
                >
                  <option value="">Выберите отделение</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Кабинет
                <input
                  name="cabinet"
                  value={employeeForm.cabinet}
                  onChange={updateEmployeeForm}
                  placeholder="Например: 103"
                />
              </label>

              <label>
                Логин
                <input
                  name="login"
                  value={employeeForm.login}
                  onChange={updateEmployeeForm}
                  placeholder="Например: doctor103"
                />
              </label>

              <label>
                Одноразовый пароль
                <div className="password-row">
                  <input
                    name="tempPassword"
                    value={employeeForm.tempPassword}
                    onChange={updateEmployeeForm}
                    placeholder="Одноразовый пароль"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setEmployeeForm((prev) => ({
                        ...prev,
                        tempPassword: generatePassword(),
                      }))
                    }
                  >
                    Сгенерировать
                  </button>
                </div>
              </label>

              <label>
                Документы
                <input
                  name="documents"
                  type="file"
                  multiple
                  onChange={updateEmployeeForm}
                />
              </label>

              <button type="submit" disabled={loading}>
                Добавить сотрудника
              </button>
            </form>
          </section>

          <section className="gov-card org-admin-wide">
            <div className="employee-top">
              <h3>Сотрудники</h3>

              <div className="employee-filters">
                <input
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }))
                  }
                  placeholder="Поиск по ФИО, телефону, почте, кабинету"
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
                        <span>Возраст: {item.age || "—"}</span>
                        <span>
                          Отделение: {getDepartmentName(item.departmentId)}
                        </span>
                        <span>Кабинет: {item.cabinet || "—"}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="empty-text">Сотрудники пока не добавлены.</p>
              )}
            </div>
          </section>
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
                <span>Одноразовый пароль</span>
                <b>{selectedEmployee.tempPassword || "—"}</b>
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
    </div>
  );
}