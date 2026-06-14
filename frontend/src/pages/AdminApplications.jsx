import { useEffect, useState } from "react";
import { adminRequest } from "../api/adminApi";

const STATUS_LABELS = {
  new: "Новая",
  assigned: "Назначена",
  in_progress: "В процессе",
  needs_fix: "Требует исправления",
  resent: "Отправлена повторно",
  waiting_eds: "Ожидание первого входа",
  waiting_first_login: "Ожидание первого входа",
  approved: "Подключено",
  rejected: "Отклонена",
};

const TYPE_LABELS = {
  new_organization: "Подключение новой организации",
  change_chief_doctor: "Изменение главного врача",
  change_administrator: "Изменение администратора",
  change_organization_data: "Изменение данных организации",
};

const CATEGORY_LABELS = {
  state_polyclinic: "Гос. поликлиника",
  state_hospital: "Гос. больница",
  private_clinic: "Частная клиника",
  dentistry: "Стоматология",
  laboratory: "Медицинская лаборатория",
};

const STATUS_FILTERS = [
  ["all", "Все"],
  ["new", "Новые"],
  ["in_progress", "В процессе"],
  ["waiting_first_login", "Ожидают первого входа"],
  ["approved", "Подключены"],
  ["rejected", "Отклонены"],
];

function text(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU");
}

function parseAdmins(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function canShowAccessBlocks(status) {
  return ["approved", "waiting_first_login", "waiting_eds"].includes(status);
}

function generateTempCode() {
  const part1 = Math.random().toString(36).slice(2, 6).toUpperCase();
  const part2 = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${part1}-${part2}`;
}

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [activeStatus, setActiveStatus] = useState("all");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");
  const [accessForms, setAccessForms] = useState({ chief: null, admins: [] });
  const [accessMessage, setAccessMessage] = useState("");

  async function loadApplications(status = activeStatus) {
    setLoading(true);
    setError("");

    try {
      const query = status !== "all" ? `?status=${status}` : "";
      const result = await adminRequest(`/api/organization-applications${query}`);
      setApplications(result.applications || []);
    } catch (err) {
      setApplications([]);
      setError(err.message || "Не удалось загрузить заявления.");
    } finally {
      setLoading(false);
    }
  }

  function buildAccessForms(application) {
    const admins = parseAdmins(application?.administrators || application?.admins);

    return {
      chief: {
        fullName:
          application?.new_chief_doctor_full_name ||
          application?.chief_doctor_full_name ||
          "",
        email:
          application?.new_chief_doctor_email ||
          application?.chief_doctor_email ||
          "",
        login: "",
        tempPassword: "",
      },
      admins: admins.map((admin) => ({
        fullName: admin.full_name || "",
        email: admin.email || "",
        login: "",
        tempPassword: "",
      })),
    };
  }

  async function openApplication(application) {
    setSelected(application);
    setDetails(null);
    setComment(application.review_comment || "");
    setAccessMessage("");
    setDetailsLoading(true);
    setError("");

    try {
      const result = await adminRequest(
        `/api/organization-applications/${application.id}`
      );

      setDetails(result);
      setComment(result.application?.review_comment || "");
      setAccessForms(buildAccessForms(result.application));
    } catch (err) {
      setDetails({
        application,
        documents: [],
        history: [],
      });
      setAccessForms(buildAccessForms(application));
      setError(err.message || "Не удалось открыть заявку.");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function changeStatus(status) {
    const id = details?.application?.id || selected?.id;

    if (!id) return;

    if (status === "rejected" && !comment.trim()) {
      setError("При отклонении заявки нужно указать причину.");
      return;
    }

    setError("");
    setAccessMessage("");

    try {
      await adminRequest(`/api/organization-applications/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          comment,
          reviewComment: comment,
        }),
      });

      await loadApplications(activeStatus);

      await openApplication({
        ...(details?.application || selected),
        status,
        review_comment: comment,
      });
    } catch (err) {
      setError(err.message || "Не удалось изменить статус.");
    }
  }

  function changeFilter(status) {
    setActiveStatus(status);
    loadApplications(status);
  }

  function updateChiefAccess(field, value) {
    setAccessForms((prev) => ({
      ...prev,
      chief: {
        ...prev.chief,
        [field]: value,
      },
    }));
  }

  function updateAdminAccess(index, field, value) {
    setAccessForms((prev) => ({
      ...prev,
      admins: prev.admins.map((admin, adminIndex) =>
        adminIndex === index ? { ...admin, [field]: value } : admin
      ),
    }));
  }

  async function sendAccess(role, index = null) {
    const application = details?.application || selected;

    if (!application?.id) return;

    const access =
      role === "chief" ? accessForms.chief : accessForms.admins[index];

    if (!access?.email) {
      setError("Email для отправки доступа не указан.");
      return;
    }

    if (!access?.login.trim()) {
      setError("Укажите логин.");
      return;
    }

    if (!access?.tempPassword.trim()) {
      setError("Укажите одноразовый пароль.");
      return;
    }

    setError("");
    setAccessMessage("");

    try {
      await adminRequest(`/api/organization-applications/${application.id}/send-access`, {
        method: "POST",
        body: JSON.stringify({
          role,
          index,
          fullName: access.fullName,
          email: access.email,
          login: access.login,
          tempPassword: access.tempPassword,
        }),
      });

      setAccessMessage(
        role === "chief"
          ? "Доступ главного врача отправлен."
          : `Доступ администратора #${index + 1} отправлен.`
      );
    } catch (err) {
      setError(err.message || "Не удалось отправить доступ.");
    }
  }

  useEffect(() => {
    loadApplications("all");
  }, []);

  const application = details?.application || selected;

  const administrators = parseAdmins(
    application?.administrators || application?.admins
  );

  const showAccessBlocks = canShowAccessBlocks(application?.status);

  return (
    <main className="adminContentPage">
      <section className="adminPageHead">
        <div>
          <h1>Заявления организаций</h1>
          <p>
            Проверка заявок, создание доступов главного врача и администраторов.
          </p>
        </div>

        <button type="button" onClick={() => loadApplications(activeStatus)}>
          {loading ? "Загрузка..." : "Обновить"}
        </button>
      </section>

      <section className="adminTabs">
        {STATUS_FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={activeStatus === value ? "active" : ""}
            onClick={() => changeFilter(value)}
          >
            {label}
          </button>
        ))}
      </section>

      {error ? <div className="adminError">{error}</div> : null}
      {accessMessage ? <div className="adminSuccess">{accessMessage}</div> : null}

      <section className="adminWorkGrid">
        <div className="adminCard">
          <div className="cardTop">
            <h2>Список заявок</h2>
            <span>{applications.length} шт.</span>
          </div>

          <div className="adminTable">
            <div className="adminRow adminRowHead">
              <span>№</span>
              <span>Организация</span>
              <span>Тип</span>
              <span>Категория</span>
              <span>БИН</span>
              <span>Статус</span>
              <span></span>
            </div>

            {loading ? (
              <div className="emptyRow">Загрузка...</div>
            ) : applications.length === 0 ? (
              <div className="emptyRow">Заявок пока нет</div>
            ) : (
              applications.map((item) => (
                <div className="adminRow" key={item.id}>
                  <span>
                    <b>{text(item.application_number)}</b>
                    <small>{formatDate(item.created_at)}</small>
                  </span>

                  <span>{text(item.organization_name)}</span>

                  <span>
                    {TYPE_LABELS[item.application_type] ||
                      text(item.application_type)}
                  </span>

                  <span>
                    {item.organization_type_label ||
                      CATEGORY_LABELS[item.organization_type] ||
                      text(item.organization_type)}
                  </span>

                  <span>{text(item.bin)}</span>

                  <span>
                    <b className={`pill ${item.status || ""}`}>
                      {STATUS_LABELS[item.status] || text(item.status)}
                    </b>
                  </span>

                  <span>
                    <button
                      className="miniBtn"
                      onClick={() => openApplication(item)}
                    >
                      Открыть
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="adminCard">
          {!application ? (
            <div className="emptyDetails">
              <h2>Заявка не выбрана</h2>
              <p>Сначала нажмите “Открыть” у заявки.</p>
            </div>
          ) : detailsLoading ? (
            <div className="emptyDetails">Загрузка карточки...</div>
          ) : (
            <>
              <div className="detailsTop">
                <div>
                  <h2>{text(application.application_number)}</h2>
                  <p>
                    {TYPE_LABELS[application.application_type] ||
                      text(application.application_type)}
                  </p>
                </div>

                <b className={`pill ${application.status || ""}`}>
                  {STATUS_LABELS[application.status] || text(application.status)}
                </b>
              </div>

              <div className="section">
                <h3>Организация</h3>

                <div className="infoGrid">
                  <div>
                    <span>Название</span>
                    <b>{text(application.organization_name)}</b>
                  </div>

                  <div>
                    <span>Категория</span>
                    <b>
                      {application.organization_type_label ||
                        CATEGORY_LABELS[application.organization_type] ||
                        text(application.organization_type)}
                    </b>
                  </div>

                  <div>
                    <span>БИН</span>
                    <b>{text(application.bin)}</b>
                  </div>

                  <div>
                    <span>Город</span>
                    <b>{text(application.city)}</b>
                  </div>

                  <div>
                    <span>Адрес</span>
                    <b>{text(application.address)}</b>
                  </div>

                  <div>
                    <span>Корпоративная почта</span>
                    <b>{text(application.organization_email)}</b>
                  </div>
                </div>
              </div>

              <div className="section">
                <h3>Главный врач</h3>

                <div className="infoGrid">
                  <div>
                    <span>ФИО</span>
                    <b>
                      {text(
                        application.new_chief_doctor_full_name ||
                          application.chief_doctor_full_name
                      )}
                    </b>
                  </div>

                  <div>
                    <span>Телефон</span>
                    <b>
                      {text(
                        application.new_chief_doctor_phone ||
                          application.chief_doctor_phone
                      )}
                    </b>
                  </div>

                  <div>
                    <span>Почта главного врача</span>
                    <b>
                      {text(
                        application.new_chief_doctor_email ||
                          application.chief_doctor_email
                      )}
                    </b>
                  </div>
                </div>
              </div>

              <div className="section">
                <h3>Администраторы</h3>

                {administrators.length > 0 ? (
                  <div className="adminUsersList">
                    {administrators.map((admin, index) => (
                      <div className="adminUserBox" key={index}>
                        <h4>Администратор #{index + 1}</h4>

                        <div className="infoGrid">
                          <div>
                            <span>ФИО</span>
                            <b>{text(admin.full_name)}</b>
                          </div>

                          <div>
                            <span>Телефон</span>
                            <b>{text(admin.phone)}</b>
                          </div>

                          <div>
                            <span>Почта администратора</span>
                            <b>{text(admin.email)}</b>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">
                    Администраторы не указаны или старый формат заявки.
                  </p>
                )}
              </div>

              <div className="section">
                <h3>Документы</h3>

                {details?.documents?.length ? (
                  <div className="docList">
                    {details.documents.map((doc) => (
                      <a
                        key={doc.id || doc.file_url}
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {text(
                          doc.document_name ||
                            doc.document_type ||
                            "Документ"
                        )}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Документы не найдены.</p>
                )}
              </div>

              <div className="section">
                <h3>Решение техподдержки</h3>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Комментарий для организации"
                />

                <div className="actions">
                  <button
                    className="process"
                    onClick={() => changeStatus("in_progress")}
                  >
                    В процесс
                  </button>

                  <button
                    className="approve"
                    onClick={() => changeStatus("waiting_first_login")}
                  >
                    Одобрить заявку
                  </button>

                  <button
                    className="reject"
                    onClick={() => changeStatus("rejected")}
                  >
                    Отклонить
                  </button>
                </div>
              </div>

              {showAccessBlocks && (
                <div className="section accessSection">
                  <h3>Доступы организации</h3>

                  <div className="accessBox">
                    <h4>Доступ главного врача</h4>

                    <div className="infoGrid">
                      <div>
                        <span>Имя главного врача</span>
                        <b>{text(accessForms.chief?.fullName)}</b>
                      </div>

                      <div>
                        <span>Почта</span>
                        <b>{text(accessForms.chief?.email)}</b>
                      </div>
                    </div>

                    <div className="accessFormGrid">
                      <input
                        value={accessForms.chief?.login || ""}
                        onChange={(e) => updateChiefAccess("login", e.target.value)}
                        placeholder="Логин"
                      />

                      <input
                        value={accessForms.chief?.tempPassword || ""}
                        onChange={(e) =>
                          updateChiefAccess("tempPassword", e.target.value)
                        }
                        placeholder="Одноразовый пароль"
                      />

                      <button
                        type="button"
                        className="miniBtn"
                        onClick={() =>
                          updateChiefAccess("tempPassword", generateTempCode())
                        }
                      >
                        Сгенерировать
                      </button>

                      <button
                        type="button"
                        className="approve"
                        onClick={() => sendAccess("chief")}
                      >
                        Отправить
                      </button>
                    </div>
                  </div>

                  {accessForms.admins.map((admin, index) => (
                    <div className="accessBox" key={index}>
                      <h4>Доступ администратора #{index + 1}</h4>

                      <div className="infoGrid">
                        <div>
                          <span>Имя администратора</span>
                          <b>{text(admin.fullName)}</b>
                        </div>

                        <div>
                          <span>Почта</span>
                          <b>{text(admin.email)}</b>
                        </div>
                      </div>

                      <div className="accessFormGrid">
                        <input
                          value={admin.login}
                          onChange={(e) =>
                            updateAdminAccess(index, "login", e.target.value)
                          }
                          placeholder="Логин"
                        />

                        <input
                          value={admin.tempPassword}
                          onChange={(e) =>
                            updateAdminAccess(index, "tempPassword", e.target.value)
                          }
                          placeholder="Одноразовый пароль"
                        />

                        <button
                          type="button"
                          className="miniBtn"
                          onClick={() =>
                            updateAdminAccess(index, "tempPassword", generateTempCode())
                          }
                        >
                          Сгенерировать
                        </button>

                        <button
                          type="button"
                          className="approve"
                          onClick={() => sendAccess("admin", index)}
                        >
                          Отправить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </aside>
      </section>
    </main>
  );
}