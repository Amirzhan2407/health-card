import { useEffect, useState } from "react";
import { adminRequest } from "../api/adminApi";

const STATUS_LABELS = {
  new: "Новая",
  assigned: "Назначена",
  in_progress: "В процессе",
  needs_fix: "Требует исправления",
  resent: "Отправлена повторно",
  waiting_eds: "Ожидает ЭЦП",
  approved: "Одобрена",
  rejected: "Отклонена",
};

const TYPE_LABELS = {
  new_organization: "Подключение новой организации",
  change_chief_doctor: "Изменение главного врача",
  change_organization_data: "Изменение данных организации",
};

const CATEGORY_LABELS = {
  state_polyclinic: "Гос. поликлиника",
  state_hospital: "Гос. больница",
  private_clinic: "Частная клиника",

  gov_polyclinic: "Гос. поликлиника",
  gov_polyclinics: "Гос. поликлиника",

  gov_hospital: "Гос. больница",
  gov_hospitals: "Гос. больница",

  private_clinics: "Частная клиника",
};

const STATUS_FILTERS = [
  ["all", "Все"],
  ["new", "Новые"],
  ["assigned", "Назначенные"],
  ["in_progress", "В процессе"],
  ["needs_fix", "Требуют исправления"],
  ["resent", "Отправлены повторно"],
  ["waiting_eds", "Ожидают ЭЦП"],
  ["approved", "Одобрены"],
  ["rejected", "Отклонены"],
];

function text(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU");
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

  async function openApplication(application) {
    setSelected(application);
    setDetails(null);
    setComment(application.review_comment || "");
    setDetailsLoading(true);
    setError("");

    try {
      const result = await adminRequest(
        `/api/organization-applications/${application.id}`
      );

      setDetails(result);
      setComment(result.application?.review_comment || "");
    } catch (err) {
      setDetails({
        application,
        documents: [],
        history: [],
      });
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

  useEffect(() => {
    loadApplications("all");
  }, []);

  const application = details?.application || selected;

  return (
    <main className="adminContentPage">
      <section className="adminPageHead">
        <div>
          <h1>Заявления организаций</h1>
          <p>Проверка заявок на подключение и изменение данных организации.</p>
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
                  <span>{TYPE_LABELS[item.application_type] || text(item.application_type)}</span>
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
                    <button className="miniBtn" onClick={() => openApplication(item)}>
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
                  <p>{TYPE_LABELS[application.application_type] || text(application.application_type)}</p>
                </div>
                <b className={`pill ${application.status || ""}`}>
                  {STATUS_LABELS[application.status] || text(application.status)}
                </b>
              </div>

              <div className="section">
                <h3>Организация</h3>
                <div className="infoGrid">
                  <div><span>Название</span><b>{text(application.organization_name)}</b></div>
                  <div><span>Категория</span><b>{application.organization_type_label || CATEGORY_LABELS[application.organization_type] || text(application.organization_type)}</b></div>
                  <div><span>БИН</span><b>{text(application.bin)}</b></div>
                  <div><span>Город</span><b>{text(application.city)}</b></div>
                  <div><span>Адрес</span><b>{text(application.address)}</b></div>
                  <div><span>Email</span><b>{text(application.sender_email)}</b></div>
                </div>
              </div>

              <div className="section">
                <h3>Главный врач</h3>
                <div className="infoGrid">
                  <div>
                    <span>Предыдущий</span>
                    <b>{text(application.previous_chief_doctor_full_name)}</b>
                  </div>
                  <div>
                    <span>Новый</span>
                    <b>
                      {text(
                        application.new_chief_doctor_full_name ||
                          application.chief_doctor_full_name
                      )}
                    </b>
                  </div>
                </div>
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
                        {text(doc.document_name || doc.document_type || "Документ")}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Документы не найдены.</p>
                )}
              </div>

              <div className="section">
                <h3>Решение</h3>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Комментарий для организации"
                />

                <div className="actions">
                  <button className="process" onClick={() => changeStatus("in_progress")}>
                    В процесс
                  </button>
                  <button className="approve" onClick={() => changeStatus("approved")}>
                    Одобрить
                  </button>
                  <button className="reject" onClick={() => changeStatus("rejected")}>
                    Отклонить
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}