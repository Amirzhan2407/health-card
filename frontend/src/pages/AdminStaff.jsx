import { useState } from "react";
import "../styles/adminLayout.css";

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
  {
    value: "medical_centers",
    label: "Медицинские центры",
  },
  {
    value: "labs",
    label: "Лаборатории / анализы",
  },
];

const initialAdmins = [
  {
    id: 1,
    fullName: "Ещанов Амиржан Галинурович",
    username: "Amir_zhan_07",
    role: "super_admin",
    category: "all",
    status: "active",
  },
  {
    id: 2,
    fullName: "Админ Поликлиник 1",
    username: "support_poly_1",
    role: "site_support",
    category: "gov_polyclinics",
    status: "active",
  },
  {
    id: 3,
    fullName: "Админ Больниц 1",
    username: "support_hospital_1",
    role: "site_support",
    category: "gov_hospitals",
    status: "active",
  },
  {
    id: 4,
    fullName: "Админ Частных Клиник",
    username: "support_private",
    role: "site_support",
    category: "private_clinics",
    status: "active",
  },
];

function categoryLabel(value) {
  if (value === "all") return "Все категории";

  return (
    categoryOptions.find((item) => item.value === value)?.label ||
    "Не указано"
  );
}

export default function AdminStaff() {
  const [admins, setAdmins] = useState(initialAdmins);
  const [open, setOpen] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [category, setCategory] = useState("gov_polyclinics");

  const resetForm = () => {
    setFullName("");
    setUsername("");
    setPassword("");
    setCategory("gov_polyclinics");
  };

  const addAdmin = () => {
    if (!fullName.trim()) {
      alert("Введите ФИО администратора");
      return;
    }

    if (!username.trim()) {
      alert("Введите название аккаунта");
      return;
    }

    if (!password.trim()) {
      alert("Введите пароль");
      return;
    }

    const exists = admins.some(
      (admin) => admin.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (exists) {
      alert("Такое название аккаунта уже существует");
      return;
    }

    const newAdmin = {
      id: Date.now(),
      fullName: fullName.trim(),
      username: username.trim(),
      role: "site_support",
      category,
      status: "active",
    };

    setAdmins((prev) => [...prev, newAdmin]);
    resetForm();
    setOpen(false);
  };

  const toggleStatus = (id) => {
    setAdmins((prev) =>
      prev.map((admin) =>
        admin.id === id
          ? {
              ...admin,
              status: admin.status === "active" ? "blocked" : "active",
            }
          : admin
      )
    );
  };

  return (
    <div className="adminPage">
      <div className="adminPageHeader">
        <div>
          <h1>Сотрудники техподдержки</h1>
          <p>
            Главный админ создаёт аккаунты сотрудников и назначает им категорию
            ответственности.
          </p>
        </div>

        <button className="adminPrimaryBtn" type="button" onClick={() => setOpen(true)}>
          + Добавить админа
        </button>
      </div>

      <div className="adminTableCard">
        <div className="adminTable adminStaffTable">
          <div className="adminTableHead">
            <span>ФИО</span>
            <span>Аккаунт</span>
            <span>Роль</span>
            <span>Категория</span>
            <span>Статус</span>
            <span>Действие</span>
          </div>

          {admins.map((admin) => (
            <div className="adminTableRow" key={admin.id}>
              <span className="strongText">{admin.fullName}</span>
              <span>{admin.username}</span>
              <span>{admin.role}</span>
              <span>{categoryLabel(admin.category)}</span>
              <span>
                <b className={`statusPill ${admin.status}`}>
                  {admin.status === "active" ? "Активен" : "Заблокирован"}
                </b>
              </span>
              <span>
                {admin.role === "super_admin" ? (
                  <button className="adminSmallBtn disabled" type="button" disabled>
                    Главный
                  </button>
                ) : (
                  <button
                    className="adminSmallBtn"
                    type="button"
                    onClick={() => toggleStatus(admin.id)}
                  >
                    {admin.status === "active" ? "Заблокировать" : "Разблокировать"}
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div className="adminModalOverlay" onClick={() => setOpen(false)}>
          <div className="adminModal" onClick={(e) => e.stopPropagation()}>
            <div className="adminModalTitle">Добавить администратора</div>

            <div className="adminModalBody">
              <div className="adminField">
                <label>ФИО</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Например: Иванов Иван Иванович"
                />
              </div>

              <div className="adminField">
                <label>Название аккаунта</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Например: support_poly_1"
                />
              </div>

              <div className="adminField">
                <label>Пароль для авторизации</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Например: Aa123456*"
                />
              </div>

              <div className="adminField">
                <label>Категория ответственности</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categoryOptions.map((item) => (
                    <option value={item.value} key={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="adminHintBox">
                После подключения backend пароль будет сохраняться в базе только
                как хэш. Обычный пароль в базе храниться не будет.
              </div>
            </div>

            <div className="adminModalActions">
              <button className="adminCancelBtn" type="button" onClick={() => setOpen(false)}>
                Отмена
              </button>

              <button className="adminSaveBtn" type="button" onClick={addAdmin}>
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}