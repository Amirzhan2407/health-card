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
  change_chief_doctor: "Изменение администратора организации",
  change_organization_data: "Изменение данных организации",
};

const CATEGORY_LABELS = {
  state_polyclinic: "Государственная поликлиника",
  state_hospital: "Государственная больница",
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
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("ru-RU");
}

function parseAdmins(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseObject(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

function canShowAccessBlocks(status) {
  return [
    "approved",
    "waiting_first_login",
    "waiting_eds",
  ].includes(status);
}

function generateTempCode() {
  const firstPart = Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase();

  const secondPart = Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase();

  return `${firstPart}-${secondPart}`;
}

function createEmptyAccessForms() {
  return {
    chief: {
      fullName: "",
      email: "",
      login: "",
      tempPassword: "",
    },
    admins: [],
    hr: {
      fullName: "",
      email: "",
      login: "",
      tempPassword: "",
    },
  };
}

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);

  const [activeStatus, setActiveStatus] =
    useState("all");

  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [sendingAccess, setSendingAccess] =
    useState("");

  const [error, setError] = useState("");
  const [accessMessage, setAccessMessage] =
    useState("");

  const [accessForms, setAccessForms] = useState(
    createEmptyAccessForms()
  );

  async function loadApplications(
    status = activeStatus
  ) {
    setLoading(true);
    setError("");

    try {
      const query =
        status !== "all"
          ? `?status=${encodeURIComponent(status)}`
          : "";

      const result = await adminRequest(
        `/api/organization-applications${query}`
      );

      setApplications(
        Array.isArray(result?.applications)
          ? result.applications
          : Array.isArray(result)
            ? result
            : []
      );
    } catch (err) {
      setApplications([]);
      setError(
        err?.message ||
          "Не удалось загрузить заявления."
      );
    } finally {
      setLoading(false);
    }
  }

  function getHrSpecialist(application) {
    const parsedHr = parseObject(
      application?.hr_specialist ||
        application?.hrSpecialist
    );

    if (parsedHr) {
      return {
        full_name:
          parsedHr.full_name ||
          parsedHr.fullName ||
          "",
        phone: parsedHr.phone || "",
        email: parsedHr.email || "",
      };
    }

    const fullName =
      application?.hr_full_name ||
      application?.hr_specialist_full_name ||
      "";

    const phone =
      application?.hr_phone ||
      application?.hr_specialist_phone ||
      "";

    const email =
      application?.hr_email ||
      application?.hr_specialist_email ||
      "";

    if (!fullName && !phone && !email) {
      return null;
    }

    return {
      full_name: fullName,
      phone,
      email,
    };
  }

  function buildAccessForms(application) {
    const admins = parseAdmins(
      application?.administrators ||
        application?.admins
    );

    const hr = getHrSpecialist(application);

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
        fullName:
          admin?.full_name ||
          admin?.fullName ||
          "",
        email: admin?.email || "",
        login: "",
        tempPassword: "",
      })),

      hr: {
        fullName:
          hr?.full_name ||
          hr?.fullName ||
          "",
        email: hr?.email || "",
        login: "",
        tempPassword: "",
      },
    };
  }

  async function openApplication(application) {
    if (!application?.id) {
      return;
    }

    setSelected(application);
    setDetails(null);
    setComment(application?.review_comment || "");
    setAccessMessage("");
    setError("");
    setDetailsLoading(true);

    try {
      const result = await adminRequest(
        `/api/organization-applications/${application.id}`
      );

      const loadedApplication =
        result?.application || application;

      setDetails({
        application: loadedApplication,
        documents: Array.isArray(result?.documents)
          ? result.documents
          : [],
        history: Array.isArray(result?.history)
          ? result.history
          : [],
      });

      setSelected(loadedApplication);

      setComment(
        loadedApplication?.review_comment || ""
      );

      setAccessForms(
        buildAccessForms(loadedApplication)
      );
    } catch (err) {
      setDetails({
        application,
        documents: [],
        history: [],
      });

      setAccessForms(
        buildAccessForms(application)
      );

      setError(
        err?.message ||
          "Не удалось открыть заявку."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function changeStatus(status) {
    const currentApplication =
      details?.application || selected;

    const id = currentApplication?.id;

    if (!id || actionLoading) {
      return;
    }

    if (
      status === "rejected" &&
      !comment.trim()
    ) {
      setError(
        "При отклонении заявки нужно указать причину."
      );
      return;
    }

    setActionLoading(true);
    setError("");
    setAccessMessage("");

    try {
      await adminRequest(
        `/api/organization-applications/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            comment: comment.trim(),
            reviewComment: comment.trim(),
          }),
        }
      );

      const updatedApplication = {
        ...currentApplication,
        status,
        review_comment: comment.trim(),
      };

      setSelected(updatedApplication);

      setDetails((previous) => ({
        application: updatedApplication,
        documents: previous?.documents || [],
        history: previous?.history || [],
      }));

      setApplications((previous) =>
        previous.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                review_comment: comment.trim(),
              }
            : item
        )
      );

      if (status === "waiting_first_login") {
        setAccessMessage(
          "Заявка одобрена. Теперь создайте и отправьте доступ администратору организации."
        );
      } else if (status === "in_progress") {
        setAccessMessage(
          "Заявка переведена в процесс."
        );
      } else if (status === "rejected") {
        setAccessMessage("Заявка отклонена.");
      }

      await loadApplications(activeStatus);
    } catch (err) {
      setError(
        err?.message ||
          "Не удалось изменить статус заявки."
      );
    } finally {
      setActionLoading(false);
    }
  }

  function changeFilter(status) {
    setActiveStatus(status);
    setSelected(null);
    setDetails(null);
    setComment("");
    setError("");
    setAccessMessage("");
    setAccessForms(createEmptyAccessForms());
    loadApplications(status);
  }

  function updateChiefAccess(field, value) {
    setAccessForms((previous) => ({
      ...previous,
      chief: {
        ...previous.chief,
        [field]: value,
      },
    }));
  }

  function updateAdminAccess(
    index,
    field,
    value
  ) {
    setAccessForms((previous) => ({
      ...previous,
      admins: previous.admins.map(
        (admin, adminIndex) =>
          adminIndex === index
            ? {
                ...admin,
                [field]: value,
              }
            : admin
      ),
    }));
  }

  function updateHrAccess(field, value) {
    setAccessForms((previous) => ({
      ...previous,
      hr: {
        ...previous.hr,
        [field]: value,
      },
    }));
  }

  async function sendAccess(role, index = null) {
    const currentApplication =
      details?.application || selected;

    if (!currentApplication?.id) {
      setError("Не удалось определить заявку.");
      return;
    }

    let access = null;
    let loadingKey = role;

    if (role === "chief") {
      access = accessForms.chief;
      loadingKey = "chief";
    }

    if (role === "admin") {
      access = accessForms.admins[index];
      loadingKey = `admin-${index}`;
    }

    if (role === "hr") {
      access = accessForms.hr;
      loadingKey = "hr";
    }

    if (!access) {
      setError(
        "Данные пользователя для доступа не найдены."
      );
      return;
    }

    if (!access.fullName?.trim()) {
      setError("ФИО пользователя не указано.");
      return;
    }

    if (!access.email?.trim()) {
      setError(
        "Почта для отправки доступа не указана."
      );
      return;
    }

    if (!access.login?.trim()) {
      setError("Укажите логин.");
      return;
    }

    if (!access.tempPassword?.trim()) {
      setError("Укажите одноразовый пароль.");
      return;
    }

    setSendingAccess(loadingKey);
    setError("");
    setAccessMessage("");

    try {
      await adminRequest(
        `/api/organization-applications/${currentApplication.id}/send-access`,
        {
          method: "POST",
          body: JSON.stringify({
            role,
            index:
              role === "admin" ? index : null,
            fullName: access.fullName.trim(),
            email: access.email
              .trim()
              .toLowerCase(),
            login: access.login.trim(),
            tempPassword:
              access.tempPassword.trim(),
          }),
        }
      );

      if (role === "chief") {
        setAccessMessage(
          "Логин и одноразовый пароль администратора организации отправлены."
        );
      }
    } catch (err) {
      setError(
        err?.message ||
          "Не удалось отправить доступ."
      );
    } finally {
      setSendingAccess("");
    }
  }

  useEffect(() => {
    loadApplications("all");
  }, []);

  const application =
    details?.application || selected;

  const administrators = parseAdmins(
    application?.administrators ||
      application?.admins
  );

  const hrSpecialist =
    getHrSpecialist(application);

  const showAccessBlocks =
    canShowAccessBlocks(application?.status);

  const isNewOrganization =
    application?.application_type ===
    "new_organization";

  return (
    <main className="adminContentPage">
      <section className="adminPageHead">
        <div>
          <h1>Заявления организаций</h1>

          <p>
            Проверка заявок и создание доступов для администратора организации.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            loadApplications(activeStatus)
          }
          disabled={loading}
        >
          {loading ? "Загрузка..." : "Обновить"}
        </button>
      </section>

      <section className="adminTabs">
        {STATUS_FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={
              activeStatus === value
                ? "active"
                : ""
            }
            onClick={() => changeFilter(value)}
          >
            {label}
          </button>
        ))}
      </section>

      {error ? (
        <div className="adminError">{error}</div>
      ) : null}

      {accessMessage ? (
        <div className="adminSuccess">
          {accessMessage}
        </div>
      ) : null}

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
              <div className="emptyRow">
                Загрузка...
              </div>
            ) : applications.length === 0 ? (
              <div className="emptyRow">
                Заявок пока нет
              </div>
            ) : (
              applications.map((item) => (
                <div
                  className="adminRow"
                  key={item.id}
                >
                  <span>
                    <b>
                      {text(
                        item.application_number
                      )}
                    </b>

                    <small>
                      {formatDate(item.created_at)}
                    </small>
                  </span>

                  <span>
                    {text(item.organization_name)}
                  </span>

                  <span>
                    {TYPE_LABELS[
                      item.application_type
                    ] ||
                      text(
                        item.application_type
                      )}
                  </span>

                  <span>
                    {item.organization_type_label ||
                      CATEGORY_LABELS[
                        item.organization_type
                      ] ||
                      text(
                        item.organization_type
                      )}
                  </span>

                  <span>{text(item.bin)}</span>

                  <span>
                    <b
                      className={`pill ${
                        item.status || ""
                      }`}
                    >
                      {STATUS_LABELS[
                        item.status
                      ] || text(item.status)}
                    </b>
                  </span>

                  <span>
                    <button
                      type="button"
                      className="miniBtn"
                      onClick={() =>
                        openApplication(item)
                      }
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

              <p>
                Нажмите «Открыть» возле нужной
                заявки.
              </p>
            </div>
          ) : detailsLoading ? (
            <div className="emptyDetails">
              Загрузка карточки...
            </div>
          ) : (
            <>
              <div className="detailsTop">
                <div>
                  <h2>
                    {text(
                      application.application_number
                    )}
                  </h2>

                  <p>
                    {TYPE_LABELS[
                      application.application_type
                    ] ||
                      text(
                        application.application_type
                      )}
                  </p>
                </div>

                <b
                  className={`pill ${
                    application.status || ""
                  }`}
                >
                  {STATUS_LABELS[
                    application.status
                  ] || text(application.status)}
                </b>
              </div>

              <div className="section">
                <h3>Организация</h3>

                <div className="infoGrid">
                  <div>
                    <span>Название</span>
                    <b>
                      {text(
                        application.organization_name
                      )}
                    </b>
                  </div>

                  <div>
                    <span>Категория</span>
                    <b>
                      {application.organization_type_label ||
                        CATEGORY_LABELS[
                          application
                            .organization_type
                        ] ||
                        text(
                          application.organization_type
                        )}
                    </b>
                  </div>

                  <div>
                    <span>БИН</span>
                    <b>
                      {text(application.bin)}
                    </b>
                  </div>

                  <div>
                    <span>Город</span>
                    <b>
                      {text(application.city)}
                    </b>
                  </div>

                  <div>
                    <span>Адрес</span>
                    <b>
                      {text(application.address)}
                    </b>
                  </div>

                  <div>
                    <span>
                      Корпоративная почта
                    </span>

                    <b>
                      {text(
                        application.organization_email
                      )}
                    </b>
                  </div>
                </div>
              </div>

              <div className="section">
                <h3>Администратор организации</h3>

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
                    <span>
                      Почта администратора организации
                    </span>

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
                <h3>Документы</h3>

                {details?.documents?.length >
                0 ? (
                  <div className="docList">
                    {details.documents.map(
                      (document, index) => (
                        <a
                          key={
                            document.id ||
                            document.file_url ||
                            index
                          }
                          href={
                            document.file_url ||
                            document.url
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          {text(
                            document.document_name ||
                              document.document_type ||
                              document.file_name ||
                              "Документ"
                          )}
                        </a>
                      )
                    )}
                  </div>
                ) : (
                  <p className="muted">
                    Документы не найдены.
                  </p>
                )}
              </div>

              <div className="section">
                <h3>
                  Решение технической поддержки
                </h3>

                <textarea
                  value={comment}
                  onChange={(event) =>
                    setComment(event.target.value)
                  }
                  placeholder="Комментарий для организации"
                />

                <div className="actions">
                  <button
                    type="button"
                    className="process"
                    disabled={actionLoading}
                    onClick={() =>
                      changeStatus("in_progress")
                    }
                  >
                    В процесс
                  </button>

                  <button
                    type="button"
                    className="approve"
                    disabled={actionLoading}
                    onClick={() =>
                      changeStatus(
                        "waiting_first_login"
                      )
                    }
                  >
                    Одобрить заявку
                  </button>

                  <button
                    type="button"
                    className="reject"
                    disabled={actionLoading}
                    onClick={() =>
                      changeStatus("rejected")
                    }
                  >
                    Отклонить
                  </button>
                </div>
              </div>

              {showAccessBlocks && (
                <div className="section accessSection">
                  <h3>
                    Доступ администратора организации
                  </h3>

                  <p className="muted">
                    Укажите логин и одноразовый пароль для администратора организации. После первого входа пользователь должен установить новый пароль.
                  </p>

                  {accessForms.chief?.email ? (
                    <div className="accessBox">
                      <h4>
                        Доступ администратора организации
                      </h4>

                      <div className="infoGrid">
                        <div>
                          <span>ФИО</span>
                          <b>
                            {text(
                              accessForms.chief
                                .fullName
                            )}
                          </b>
                        </div>

                        <div>
                          <span>Почта</span>
                          <b>
                            {text(
                              accessForms.chief.email
                            )}
                          </b>
                        </div>
                      </div>

                      <div className="accessFormGrid">
                        <input
                          value={
                            accessForms.chief
                              .login
                          }
                          onChange={(event) =>
                            updateChiefAccess(
                              "login",
                              event.target.value
                            )
                          }
                          placeholder="Логин администратора организации"
                        />

                        <input
                          value={
                            accessForms.chief
                              .tempPassword
                          }
                          onChange={(event) =>
                            updateChiefAccess(
                              "tempPassword",
                              event.target.value
                            )
                          }
                          placeholder="Одноразовый пароль"
                        />

                        <button
                          type="button"
                          className="miniBtn"
                          onClick={() =>
                            updateChiefAccess(
                              "tempPassword",
                              generateTempCode()
                            )
                          }
                        >
                          Сгенерировать
                        </button>

                        <button
                          type="button"
                          className="approve"
                          disabled={
                            sendingAccess ===
                            "chief"
                          }
                          onClick={() =>
                            sendAccess("chief")
                          }
                        >
                          {sendingAccess ===
                          "chief"
                            ? "Отправка..."
                            : "Отправить"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          )}
        </aside>
      </section>
    </main>
  );
}