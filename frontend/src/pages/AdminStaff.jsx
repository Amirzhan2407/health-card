import { useEffect, useState } from "react";
import "../styles/adminLayout.css";

const API_URL = "https://health-card.onrender.com";

const roleOptions = [
  {
    value: "super_admin",
    label: "Главный админ",
  },
  {
    value: "site_support",
    label: "Обычный админ",
  },
];

const categoryOptions = [
  {
    value: "gov_polyclinics",
    label: "Государственные поликлиники",
  },
  {
    value: "gov_hospitals",
    label: "Государственные больницы",
  },
  {
    value: "private_clinics",
    label: "Частные клиники",
  },
];

function roleLabel(value) {
  return "Сотрудник техподдержки";
}

function categoryLabel(value) {
  if (value === "all") return "Все категории";

  return (
    categoryOptions.find((item) => item.value === value)?.label || "Не указано"
  );
}

function formatDate(date) {
  if (!date) return "Не указано";

  return new Date(date).toLocaleDateString("ru-RU");
}

export default function AdminStaff() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [role, setRole] = useState("super_admin");
  const [category, setCategory] = useState("all");

  const adminData = JSON.parse(localStorage.getItem("adminData") || "null");
  const token = adminData?.token;

  const hasAccess = adminData && ["super_admin", "site_support", "support_admin"].includes(adminData.role);

  const resetForm = () => {
    setFullName("");
    setUsername("");
    setBirthDate("");
    setRole("super_admin");
    setCategory("all");
  };

  const loadAdmins = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/admin/staff`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось загрузить админов.");
      }

      setAdmins(data.staff || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Ошибка загрузки админов.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && hasAccess) {
      loadAdmins();
    } else {
      setLoading(false);
    }
  }, []);

  const addAdmin = async () => {
    if (!fullName.trim()) {
      alert("Введите ФИО админа");
      return;
    }

    if (!username.trim()) {
      alert("Введите логин админа");
      return;
    }

    if (!birthDate) {
      alert("Укажите дату рождения");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`${API_URL}/api/admin/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          username: username.trim(),
          birthDate,
          role: "super_admin",
          category: "all",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось добавить админа.");
      }

      resetForm();
      setOpen(false);
      await loadAdmins();

      alert(
        `Админ создан.\n\nЛогин: ${data.admin.username}\nУникальный номер: ${data.admin.employeeNumber}`
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Ошибка создания админа.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (admin) => {
    if (admin.username === adminData?.username) return;

    try {
      const response = await fetch(
        `${API_URL}/api/admin/staff/${admin.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isActive: !admin.is_active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось изменить статус.");
      }

      await loadAdmins();
    } catch (err) {
      console.error(err);
      alert(err.message || "Ошибка изменения статуса.");
    }
  };

  if (!hasAccess) {
    return (
      <div className="adminPage">
        <div className="adminPageHeader">
          <div>
            <h1>Нет доступа</h1>
            <p>Страница “Админы” доступна только сотрудникам техподдержки.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="adminPage">
      <div className="adminPageHeader">
        <div>
          <h1>Админы</h1>
          <p>
            Администраторы техподдержки могут создавать аккаунты других сотрудников техподдержки и управлять их активностью.
          </p>
        </div>

        <button
          className="adminPrimaryBtn"
          type="button"
          onClick={() => setOpen(true)}
        >
          + Добавить админа
        </button>
      </div>

      {error && <div className="adminErrorBox">{error}</div>}

      <div className="adminTableCard">
        {loading ? (
          <div className="adminLoadingText">Загрузка админов...</div>
        ) : (
          <div className="adminTable adminStaffTable">
            <div className="adminTableHead">
              <span>Логин</span>
              <span>ФИО</span>
              <span>Уникальный номер</span>
              <span>Дата рождения</span>
              <span>Роль</span>
              <span>Категория</span>
              <span>Статус</span>
              <span>Действие</span>
            </div>

            {admins.map((admin) => (
              <div className="adminTableRow" key={admin.id}>
                <span className="strongText">{admin.username}</span>
                <span>{admin.full_name}</span>
                <span>{admin.employee_number || "—"}</span>
                <span>{formatDate(admin.birth_date)}</span>
                <span>{roleLabel(admin.role)}</span>
                <span>{categoryLabel(admin.category)}</span>

                <span>
                  <b
                    className={`statusPill ${
                      admin.is_active ? "active" : "blocked"
                    }`}
                  >
                    {admin.is_active ? "Активен" : "Заблокирован"}
                  </b>

                  {admin.must_set_password && (
                    <small className="adminNeedPassword">
                      Пароль не создан
                    </small>
                  )}
                </span>

                <span>
                  {admin.username === adminData?.username ? (
                    <button
                      className="adminSmallBtn disabled"
                      type="button"
                      disabled
                    >
                      Вы
                    </button>
                  ) : (
                    <button
                      className="adminSmallBtn"
                      type="button"
                      onClick={() => toggleStatus(admin)}
                    >
                      {admin.is_active ? "Заблокировать" : "Разблокировать"}
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="adminModalOverlay" onClick={() => setOpen(false)}>
          <div className="adminModal" onClick={(e) => e.stopPropagation()}>
            <div className="adminModalTitle">Добавить админа</div>

            <div className="adminModalBody">
              <div className="adminField">
                <label>Логин</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Например: support_poly_1"
                />
              </div>

              <div className="adminField">
                <label>ФИО</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Например: Иванов Иван Иванович"
                />
              </div>

              <div className="adminField">
                <label>Дата рождения</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>

              <div className="adminHintBox">
                Уникальный номер создаётся автоматически. Пароль при создании не задаётся. Новый сотрудник получит логин и уникальный номер, после чего сам создаст пароль при первом входе.
              </div>
            </div>

            <div className="adminModalActions">
              <button
                className="adminCancelBtn"
                type="button"
                onClick={() => setOpen(false)}
              >
                Отмена
              </button>

              <button
                className="adminSaveBtn"
                type="button"
                onClick={addAdmin}
                disabled={saving}
              >
                {saving ? "Создание..." : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}