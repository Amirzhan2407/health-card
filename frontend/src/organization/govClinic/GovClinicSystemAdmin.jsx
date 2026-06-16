import { useMemo, useState } from "react";

const initialDepartments = [
  {
    id: 1,
    name: "Терапия",
    floor: "2 этаж",
    rooms: "101–107",
    description: "Приём взрослых пациентов и первичная диагностика.",
  },
  {
    id: 2,
    name: "Педиатрия",
    floor: "3 этаж",
    rooms: "201–206",
    description: "Приём детей и подростков.",
  },
];

const initialEmployees = [
  {
    id: 1,
    fullName: "Ахметова Айгуль Сериковна",
    age: "42",
    phone: "+7 777 111 22 33",
    email: "akhmetova@clinic.kz",
    departmentId: 1,
    cabinet: "103",
    position: "Врач-терапевт",
    documents: ["Удостоверение личности.pdf", "Диплом.pdf"],
  },
  {
    id: 2,
    fullName: "Ибраев Нурлан Канатович",
    age: "38",
    phone: "+7 701 555 44 33",
    email: "ibraev@clinic.kz",
    departmentId: 2,
    cabinet: "202",
    position: "Педиатр",
    documents: ["Диплом.pdf"],
  },
];

export default function GovClinicSystemAdmin() {
  const [tab, setTab] = useState("departments");
  const [departments, setDepartments] = useState(initialDepartments);
  const [employees, setEmployees] = useState(initialEmployees);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    floor: "",
    rooms: "",
    description: "",
  });

  const [employeeForm, setEmployeeForm] = useState({
    fullName: "",
    age: "",
    phone: "",
    email: "",
    position: "",
    departmentId: "",
    cabinet: "",
    documents: [],
  });

  const [filters, setFilters] = useState({
    search: "",
    departmentId: "all",
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const search = filters.search.toLowerCase();

      const matchesSearch =
        employee.fullName.toLowerCase().includes(search) ||
        employee.phone.toLowerCase().includes(search) ||
        employee.email.toLowerCase().includes(search) ||
        employee.cabinet.toLowerCase().includes(search);

      const matchesDepartment =
        filters.departmentId === "all" ||
        String(employee.departmentId) === String(filters.departmentId);

      return matchesSearch && matchesDepartment;
    });
  }, [employees, filters]);

  function getDepartmentName(id) {
    return departments.find((dep) => dep.id === Number(id))?.name || "—";
  }

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

  function addDepartment(e) {
    e.preventDefault();

    if (!departmentForm.name.trim()) return;

    setDepartments((prev) => [
      ...prev,
      {
        id: Date.now(),
        ...departmentForm,
      },
    ]);

    setDepartmentForm({
      name: "",
      floor: "",
      rooms: "",
      description: "",
    });
  }

  function addEmployee(e) {
    e.preventDefault();

    if (!employeeForm.fullName.trim() || !employeeForm.departmentId) return;

    setEmployees((prev) => [
      ...prev,
      {
        id: Date.now(),
        ...employeeForm,
        departmentId: Number(employeeForm.departmentId),
      },
    ]);

    setEmployeeForm({
      fullName: "",
      age: "",
      phone: "",
      email: "",
      position: "",
      departmentId: "",
      cabinet: "",
      documents: [],
    });
  }

  return (
    <div className="org-admin-page">
      <div className="gov-page-head">
        <div>
          <h2 className="gov-page-title">Администратор организации</h2>
          <p className="gov-page-subtitle">
            Управление отделами, кабинетами, сотрудниками и документами поликлиники.
          </p>
        </div>
      </div>

      <div className="org-admin-tabs">
        <button
          className={tab === "departments" ? "active" : ""}
          onClick={() => setTab("departments")}
        >
          Отделы организации
        </button>

        <button
          className={tab === "employees" ? "active" : ""}
          onClick={() => setTab("employees")}
        >
          Сотрудники
        </button>
      </div>

      {tab === "departments" && (
        <div className="org-admin-grid">
          <section className="gov-card">
            <h3>Добавить отдел</h3>

            <form className="org-admin-form" onSubmit={addDepartment}>
              <label>
                Название отдела
                <input
                  name="name"
                  value={departmentForm.name}
                  onChange={updateDepartmentForm}
                  placeholder="Например: Терапия"
                  required
                />
              </label>

              <label>
                Этаж
                <input
                  name="floor"
                  value={departmentForm.floor}
                  onChange={updateDepartmentForm}
                  placeholder="Например: 2 этаж"
                />
              </label>

              <label>
                Кабинеты
                <input
                  name="rooms"
                  value={departmentForm.rooms}
                  onChange={updateDepartmentForm}
                  placeholder="Например: 101–107"
                />
              </label>

              <label>
                Описание
                <textarea
                  name="description"
                  value={departmentForm.description}
                  onChange={updateDepartmentForm}
                  placeholder="Краткое описание отдела"
                />
              </label>

              <button type="submit">Добавить отдел</button>
            </form>
          </section>

          <section className="gov-card org-admin-wide">
            <h3>Список отделов</h3>

            <div className="department-list">
              {departments.map((department) => {
                const people = employees.filter(
                  (employee) => employee.departmentId === department.id
                );

                return (
                  <div className="department-card" key={department.id}>
                    <div className="department-head">
                      <div>
                        <h4>{department.name}</h4>
                        <p>
                          {department.floor || "Этаж не указан"} · Кабинеты:{" "}
                          {department.rooms || "не указаны"}
                        </p>
                      </div>

                      <b>{people.length} сотрудников</b>
                    </div>

                    {department.description && (
                      <p className="department-desc">{department.description}</p>
                    )}

                    <div className="department-people">
                      {people.length ? (
                        people.map((person) => (
                          <span key={person.id}>{person.fullName}</span>
                        ))
                      ) : (
                        <em>Сотрудники пока не добавлены</em>
                      )}
                    </div>
                  </div>
                );
              })}
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
                <input
                  name="position"
                  value={employeeForm.position}
                  onChange={updateEmployeeForm}
                  placeholder="Например: Врач-терапевт"
                />
              </label>

              <label>
                Отдел
                <select
                  name="departmentId"
                  value={employeeForm.departmentId}
                  onChange={updateEmployeeForm}
                  required
                >
                  <option value="">Выберите отдел</option>
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
                Документы
                <input
                  name="documents"
                  type="file"
                  multiple
                  onChange={updateEmployeeForm}
                />
              </label>

              <button type="submit">Добавить сотрудника</button>
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
                  <option value="all">Все отделы</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="employee-card-list">
              {filteredEmployees.map((employee) => (
                <div
                  className="employee-card"
                  key={employee.id}
                  onDoubleClick={() => setSelectedEmployee(employee)}
                >
                  <div>
                    <h4>{employee.fullName}</h4>
                    <p>{employee.position || "Должность не указана"}</p>
                  </div>

                  <div className="employee-card-info">
                    <span>Возраст: {employee.age || "—"}</span>
                    <span>Отдел: {getDepartmentName(employee.departmentId)}</span>
                    <span>Кабинет: {employee.cabinet || "—"}</span>
                  </div>
                </div>
              ))}
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
                <span>Отдел</span>
                <b>{getDepartmentName(selectedEmployee.departmentId)}</b>
              </div>

              <div>
                <span>Кабинет</span>
                <b>{selectedEmployee.cabinet || "—"}</b>
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