

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API_URL = "https://health-card.onrender.com";

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
  "Медсестра",
  "Медбрат",
  "Старшая медсестра",
  "Регистратор",
  "Заведующий отделением",
  "Заместитель главного врача",
  "Кадровый специалист",
  "Бухгалтер"
];

const EMPTY_FORM = {
  full_name: "",
  phone: "",
  email: "",
  position: "",
  department: "",
  department_id: "",
  cabinet: "",
  role: "doctor",
};

export default function GovClinicHR() {
const [searchParams, setSearchParams] = useSearchParams();

const user = JSON.parse(localStorage.getItem("organizationUser") || "null");
const organization = JSON.parse(localStorage.getItem("organizationData") || "null");

const activeTab = searchParams.get("tab") || "dashboard";

const [employees, setEmployees] = useState([]);
const [orgDepartments, setOrgDepartments] = useState([]);
const [form, setForm] = useState(EMPTY_FORM);
const [editingId, setEditingId] = useState(null);
const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
const [documents, setDocuments] = useState({});

const [loading, setLoading] = useState(false);
const [saving, setSaving] = useState(false);

const [message, setMessage] = useState("");
const [error, setError] = useState("");

function changeTab(tab) {
setSearchParams({ tab: tab });
setMessage("");
setError("");
}

function updateField(event) {
const name = event.target.name;
const value = event.target.value;


setForm({
  ...form,
  [name]: value,
});

setError("");


}

function handlePositionChange(event) {
  const value = event.target.value;
  let newRole = form.role;

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

  setForm({
    ...form,
    position: value,
    role: newRole,
  });
  setError("");
}

function updateDocument(event) {
const name = event.target.name;
const file = event.target.files && event.target.files.length > 0
? event.target.files[0]
: null;


setDocuments({
  ...documents,
  [name]: file,
});


}

function resetForm() {
setForm(EMPTY_FORM);
setEditingId(null);
setError("");
setMessage("");
}

async function loadEmployees() {
if (!user || !user.organization_id) {
setError("Организация не найдена. Войдите заново.");
return;
}


setLoading(true);
setError("");

try {
  const response = await fetch(
    API_URL + "/api/organization-structure/employees?organization_id=" + user.organization_id
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Не удалось загрузить сотрудников.");
  }

  setEmployees(result.employees || result.data || []);
} catch (err) {
  setError(err.message || "Ошибка загрузки сотрудников.");
  setEmployees([]);
} finally {
  setLoading(false);
}


}

async function saveEmployee(event) {
event.preventDefault();


if (!user || !user.organization_id) {
  setError("Организация не найдена. Войдите заново.");
  return;
}

if (!form.full_name.trim()) {
  setError("Укажите ФИО сотрудника.");
  return;
}

if (!form.position.trim()) {
  setError("Укажите должность.");
  return;
}

if (!form.department.trim()) {
  setError("Укажите отделение.");
  return;
}

setSaving(true);
setError("");
setMessage("");

try {
  const payload = {
    organization_id: user.organization_id,
    full_name: form.full_name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    position: form.position.trim(),
    department_id: form.department_id || null,
    cabinet: form.cabinet.trim(),
    status: "active",
  };

  const url = editingId
    ? API_URL + "/api/organization-structure/employees/" + editingId
    : API_URL + "/api/organization-structure/employees";

  const response = await fetch(url, {
    method: editingId ? "PATCH" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Не удалось сохранить сотрудника.");
  }

  setMessage(editingId ? "Сотрудник изменён." : "Сотрудник добавлен.");
  resetForm();
  await loadEmployees();
  changeTab("employees");
} catch (err) {
  setError(err.message || "Ошибка сохранения сотрудника.");
} finally {
  setSaving(false);
}


}

function editEmployee(employee) {
setEditingId(employee.id);


setForm({
  full_name: employee.full_name || "",
  phone: employee.phone || "",
  email: employee.email || "",
  position: employee.position || "",
  department: employee.department || "",
  department_id: employee.department_id || employee.departmentId || "",
  cabinet: employee.cabinet || "",
  role: employee.role || "doctor",
});

changeTab("add");


}

async function dismissEmployee(employee) {
const confirmed = window.confirm("Уволить сотрудника " + employee.full_name + "?");


if (!confirmed) {
  return;
}

setError("");
setMessage("");

try {
  const response = await fetch(
    API_URL + "/api/organization-structure/employees/" + employee.id,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "dismissed",
        dismissed_at: new Date().toISOString(),
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Не удалось уволить сотрудника.");
  }

  setMessage("Сотрудник уволен.");
  await loadEmployees();
} catch (err) {
  setError(err.message || "Ошибка увольнения сотрудника.");
}


}

async function deleteEmployee(employee) {
const confirmed = window.confirm("Удалить сотрудника " + employee.full_name + "?");


if (!confirmed) {
  return;
}

setError("");
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
  await loadEmployees();
} catch (err) {
  setError(err.message || "Ошибка удаления сотрудника.");
}


}

async function uploadDocuments(event) {
event.preventDefault();


if (!selectedEmployeeId) {
  setError("Выберите сотрудника.");
  return;
}

setSaving(true);
setError("");
setMessage("");

try {
  const formData = new FormData();

  formData.append("employee_id", selectedEmployeeId);
  formData.append("organization_id", user.organization_id);

  Object.keys(documents).forEach(function (key) {
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
  await loadEmployees();
} catch (err) {
  setError(err.message || "Ошибка загрузки документов.");
} finally {
  setSaving(false);
}


}

async function loadDepartments() {
  if (!user || !user.organization_id) return;
  try {
    const response = await fetch(
      API_URL + "/api/organization-structure/departments?organization_id=" + user.organization_id
    );
    const result = await response.json();
    if (response.ok) {
      setOrgDepartments(result.departments || []);
    }
  } catch (err) {
    console.error("Ошибка загрузки отделений:", err);
  }
}

useEffect(function () {
  loadEmployees();
  loadDepartments();
}, []);

const activeEmployees = employees.filter(function (employee) {
return employee.status !== "dismissed";
});

const dismissedEmployees = employees.filter(function (employee) {
return employee.status === "dismissed";
});

return ( <div> <h2 className="gov-page-title">Отдел кадров</h2>


  <p className="gov-page-subtitle">
    Добавление сотрудников, изменение данных, загрузка документов и ведение личных дел.
  </p>

  {message ? <div className="gov-success">{message}</div> : null}
  {error ? <div className="gov-error">{error}</div> : null}

  {activeTab === "dashboard" ? (
    <div className="gov-grid">
      <div className="gov-card">
        <h3>Организация</h3>
        <p>{organization && organization.organization_name ? organization.organization_name : "Медицинская организация"}</p>
      </div>

      <div className="gov-card">
        <h3>Активные сотрудники</h3>
        <p>{activeEmployees.length} сотрудников</p>
      </div>

      <div className="gov-card">
        <h3>Уволенные сотрудники</h3>
        <p>{dismissedEmployees.length} сотрудников</p>
      </div>

      <div className="gov-card">
        <h3>Ответственный</h3>
        <p>{user && user.full_name ? user.full_name : "Сотрудник отдела кадров"}</p>
      </div>
    </div>
  ) : null}

  {activeTab === "employees" ? (
    <div className="gov-card">
      <div className="gov-card-head">
        <h3>Список сотрудников</h3>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={function () {
              resetForm();
              changeTab("add");
            }}
            style={{
              background: "#00b85a",
              color: "#ffffff",
              border: 0,
              borderRadius: "12px",
              padding: "8px 16px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            ➕ Добавить сотрудника
          </button>

          <button type="button" onClick={loadEmployees}>
            {loading ? "Загрузка..." : "Обновить"}
          </button>
        </div>
      </div>

      {loading ? (
        <p>Загрузка сотрудников...</p>
      ) : employees.length === 0 ? (
        <p>Сотрудники пока не добавлены.</p>
      ) : (
        <div className="gov-table">
          <div className="gov-table-row gov-table-head">
            <span>ФИО</span>
            <span>Должность</span>
            <span>Отделение</span>
            <span>Статус</span>
            <span>Действия</span>
          </div>

          {employees.map(function (employee) {
            return (
              <div className="gov-table-row" key={employee.id}>
                <span>
                  <b>{employee.full_name || "—"}</b>
                  <small>{employee.email || employee.phone || "—"}</small>
                </span>

                <span>{employee.position || "—"}</span>
                <span>{employee.department || "—"}</span>
                <span>
                  <span className={`gov-status ${employee.status === "dismissed" ? "dismissed" : "active"}`}>
                    {employee.status === "dismissed" ? "Уволен" : "Активен"}
                  </span>
                </span>

                <span className="gov-actions">
                  <button
                    type="button"
                    onClick={function () {
                      editEmployee(employee);
                    }}
                  >
                    Изменить
                  </button>

                  <button
                    type="button"
                    onClick={function () {
                      setSelectedEmployeeId(employee.id);
                      changeTab("documents");
                    }}
                  >
                    Документы
                  </button>

                  {employee.status !== "dismissed" ? (
                    <button
                      type="button"
                      onClick={function () {
                        dismissEmployee(employee);
                      }}
                    >
                      Уволить
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={function () {
                      deleteEmployee(employee);
                    }}
                  >
                    Удалить
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  ) : null}

  {activeTab === "add" ? (
    <form className="gov-card" onSubmit={saveEmployee} style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h3 style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '24px' }}>
        {editingId ? "✏️ Редактировать профиль сотрудника" : "👤 Добавление нового сотрудника"}
      </h3>

      <div style={{ marginBottom: '32px' }}>
        <h4 style={{ color: '#0f172a', margin: '0 0 16px', fontSize: '15px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📋 Личные данные
        </h4>
        <div className="gov-form-grid">
          <label>
            ФИО сотрудника
            <input
              name="full_name"
              value={form.full_name}
              onChange={updateField}
              placeholder="Иванов Иван Иванович"
              required
            />
          </label>



          <label>
            Номер телефона
            <input
              name="phone"
              value={form.phone}
              onChange={updateField}
              placeholder="+7 777 000 00 00"
            />
          </label>

          <label>
            Электронная почта
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={updateField}
              placeholder="doctor@clinic.kz"
            />
          </label>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h4 style={{ color: '#0f172a', margin: '0 0 16px', fontSize: '15px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          💼 Профессиональные данные
        </h4>
        <div className="gov-form-grid">
          <label>
            Должность
            <select
              name="position"
              value={form.position}
              onChange={handlePositionChange}
              required
            >
              <option value="">Выберите должность</option>
              {POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </label>

          <label>
            Отделение
            <select
              name="department"
              value={form.department}
              onChange={function (e) {
                const selectedDep = orgDepartments.find(d => d.name === e.target.value);
                setForm({
                  ...form,
                  department: e.target.value,
                  department_id: selectedDep ? selectedDep.id : ""
                });
              }}
              required
            >
              <option value="">Выберите отделение</option>
              {orgDepartments.map((dep) => (
                <option key={dep.id} value={dep.name}>
                  {dep.name} (этаж {dep.floor || "—"})
                </option>
              ))}
            </select>
            {orgDepartments.length === 0 && (
              <small style={{ color: '#ef4444', marginTop: '4px', fontWeight: 'bold' }}>
                ⚠️ Сначала добавьте отделения в кабинете администратора!
              </small>
            )}
          </label>

          <label>
            Кабинет
            <input
              name="cabinet"
              value={form.cabinet}
              onChange={updateField}
              placeholder="204"
            />
          </label>

          <label>
            Роль в системе
            <select name="role" value={form.role} onChange={updateField}>
              <option value="doctor">🩺 Врач</option>
              <option value="nurse">💉 Медсестра / медбрат</option>
              <option value="registrar">💻 Регистратор</option>
              <option value="department_head">🏥 Заведующий отделением</option>
              <option value="deputy_chief_doctor">👨‍⚕️ Заместитель главного врача</option>
            </select>
          </label>
        </div>
      </div>

      <div className="gov-actions" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginTop: '24px' }}>
        <button type="submit" disabled={saving}>
          {saving ? "Сохранение..." : editingId ? "Сохранить изменения" : "Добавить сотрудника"}
        </button>

        <button type="button" onClick={resetForm}>
          Очистить форму
        </button>

        <button type="button" onClick={function () { changeTab("employees"); }}>
          Назад к списку
        </button>
      </div>
    </form>
  ) : null}

  {activeTab === "documents" ? (
    <div className="gov-card">
      <div className="gov-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>📂 Документы сотрудника</h3>
        <button
          type="button"
          onClick={function () { changeTab("employees"); }}
          style={{
            background: "#cbd5e1",
            color: "#1e293b",
            border: 0,
            borderRadius: "12px",
            padding: "8px 16px",
            fontWeight: "700",
            cursor: "pointer"
          }}
        >
          Назад к списку
        </button>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e293b' }}>
          Выберите сотрудника
        </label>
        <select
          value={selectedEmployeeId}
          onChange={function (event) {
            setSelectedEmployeeId(event.target.value);
            setMessage("");
            setError("");
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
          {/* Левая колонка: Загрузка новых */}
          <form onSubmit={uploadDocuments} style={{ borderRight: '1px solid #e2e8f0', paddingRight: '32px' }}>
            <h4 style={{ marginBottom: '20px', color: '#0f172a', fontWeight: 'bold' }}>📤 Загрузить новые документы</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#475569', fontSize: '14px' }}>
                Удостоверение личности
                <input type="file" name="identity_document" onChange={updateDocument} style={{ padding: '6px 0' }} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#475569', fontSize: '14px' }}>
                Диплом
                <input type="file" name="diploma" onChange={updateDocument} style={{ padding: '6px 0' }} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#475569', fontSize: '14px' }}>
                Сертификат
                <input type="file" name="certificate" onChange={updateDocument} style={{ padding: '6px 0' }} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#475569', fontSize: '14px' }}>
                Трудовой договор
                <input type="file" name="employment_contract" onChange={updateDocument} style={{ padding: '6px 0' }} />
              </label>
            </div>

            <div style={{ marginTop: '24px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: '#00b85a',
                  color: '#fff',
                  border: 0,
                  padding: '10px 20px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '15px'
                }}
              >
                {saving ? "Загрузка..." : "Загрузить файлы"}
              </button>
            </div>
          </form>

          {/* Правая колонка: Список уже загруженных */}
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
                  return (
                    <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ marginRight: '12px' }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>
                          {docLabels[doc.document_type] || doc.document_type}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', wordBreak: 'break-all', marginTop: '2px' }}>
                          {doc.file_name}
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
                            fontWeight: '700',
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
          Выберите сотрудника из списка выше, чтобы просмотреть его документы или загрузить новые.
        </p>
      )}
    </div>
  ) : null}
</div>


);
}
