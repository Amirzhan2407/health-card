import { useEffect, useMemo, useState } from "react";

const API_URL =
  (import.meta.env.VITE_API_URL || "https://health-card.onrender.com").replace(
    /\/$/,
    ""
  );

const STATUS_FILTERS = [
  { value: "all", label: "Все" },
  { value: "new", label: "Новые" },
  { value: "assigned", label: "Назначенные" },
  { value: "in_progress", label: "В процессе" },
  { value: "needs_fix", label: "Требуют исправления" },
  { value: "resent", label: "Отправлены повторно" },
  { value: "waiting_eds", label: "Ожидают ЭЦП" },
  { value: "approved", label: "Одобрены" },
  { value: "rejected", label: "Отклонены" },
];

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

const APPLICATION_TYPE_LABELS = {
  new_organization: "Подключение новой организации",
  change_chief_doctor: "Изменение главного врача",
  change_organization_data: "Изменение данных организации",
};

const ORGANIZATION_TYPE_LABELS = {
  state_polyclinic: "Государственная поликлиника",
  state_hospital: "Государственная больница",
  private_clinic: "Частная клиника",
  gov_polyclinic: "Государственная поликлиника",
  gov_hospital: "Государственная больница",
};

function getAdminData() {
  try {
    return JSON.parse(localStorage.getItem("adminData") || "null");
  } catch {
    return null;
  }
}

function getToken() {
  const adminData = getAdminData();

  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    adminData?.token ||
    ""
  );
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || "—";
}

function applicationTypeLabel(type) {
  return APPLICATION_TYPE_LABELS[type] || type || "Подключение организации";
}

function organizationTypeLabel(type, fallback) {
  return fallback || ORGANIZATION_TYPE_LABELS[type] || type || "—";
}

function normalizeList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.applications)) return result.applications;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.rows)) return result.rows;

  return [];
}

function normalizeDetails(result, fallbackApplication) {
  if (result?.application) {
    return {
      application: result.application,
      documents: result.documents || [],
      history: result.history || [],
    };
  }

  if (result?.data?.application) {
    return {
      application: result.data.application,
      documents: result.data.documents || [],
      history: result.data.history || [],
    };
  }

  return {
    application: result?.data || result || fallbackApplication,
    documents: result?.documents || result?.data?.documents || [],
    history: result?.history || result?.data?.history || [],
  };
}

export default function AdminApplications() {
  const [adminData] = useState(() => getAdminData());

  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);

  const [activeStatus, setActiveStatus] = useState("all");
  const [reviewComment, setReviewComment] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [error, setError] = useState("");

  const token = useMemo(() => getToken(), []);

  async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        result?.message ||
        result?.error ||
        `Ошибка запроса ${response.status}: ${path}`;

      const err = new Error(message);
      err.status = response.status;
      err.path = path;
      throw err;
    }

    return result;
  }

  async function requestFirst(paths, options = {}) {
    let lastError = null;

    for (const path of paths) {
      try {
        return await request(path, options);
      } catch (err) {
        lastError = err;

        if (err.status !== 404) {
          throw err;
        }
      }
    }

    throw lastError || new Error("Не удалось выполнить запрос.");
  }

  function buildListPaths(status) {
    const safeStatus = status || "all";
    const query =
      safeStatus !== "all" ? `?status=${encodeURIComponent(safeStatus)}` : "";

    return [
      `/api/organization-applications/admin${query}`,
      `/api/organization-applications${query}`,
    ];
  }

  function buildDetailsPaths(id) {
    return [
      `/api/organization-applications/admin/${id}`,
      `/api/organization-applications/${id}`,
    ];
  }

  function buildStatusPaths(id) {
    return [
      `/api/organization-applications/${id}/status`,
      `/api/organization-applications/admin/${id}/status`,
      `/api/organization-applications/${id}`,
    ];
  }

  async function loadApplications(status = activeStatus) {
    setIsLoading(true);
    setError("");

    try {
      const result = await requestFirst(buildListPaths(status));
      const list = normalizeList(result);

      setApplications(list);
    } catch (err) {
      setApplications([]);
      setError(
        err.message ||
          "Не удалось загрузить заявления. Проверь backend route organization-applications."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function openApplication(application) {
    if (!application?.id) {
      setError("У заявки нет ID.");
      return;
    }

    setSelectedApplication(application);
    setSelectedDetails(null);
    setReviewComment(application.review_comment || "");
    setIsDetailsLoading(true);
    setError("");

    try {
      const result = await requestFirst(buildDetailsPaths(application.id));
      const details = normalizeDetails(result, application);

      setSelectedDetails(details);
      setReviewComment(details.application?.review_comment || "");
    } catch (err) {
      setSelectedDetails({
        application,
        documents: [],
        history: [],
      });

      setError(
        err.message ||
          "Детальная карточка заявки не загрузилась. Показываю данные из списка."
      );
    } finally {
      setIsDetailsLoading(false);
    }
  }

  async function changeStatus(nextStatus) {
    const applicationId =
      selectedDetails?.application?.id || selectedApplication?.id;

    if (!applicationId) {
      setError("Сначала выберите заявку.");
      return;
    }

    if (nextStatus === "rejected" && !reviewComment.trim()) {
      setError("При отклонении заявки нужно указать причину.");
      return;
    }

    setIsActionLoading(true);
    setError("");

    try {
      await requestFirst(buildStatusPaths(applicationId), {
        method: "PATCH",
        body: JSON.stringify({
          status: nextStatus,
          reviewComment,
          comment: reviewComment,
          adminId: adminData?.id || null,
        }),
      });

      await loadApplications(activeStatus);

      const updatedApplication = {
        ...(selectedDetails?.application || selectedApplication),
        status: nextStatus,
        review_comment: reviewComment,
      };

      await openApplication(updatedApplication);
    } catch (err) {
      setError(err.message || "Не удалось изменить статус заявки.");
    } finally {
      setIsActionLoading(false);
    }
  }

  function handleFilter(status) {
    const safeStatus = status || "all";
    setActiveStatus(safeStatus);
    loadApplications(safeStatus);
  }

  useEffect(() => {
    loadApplications("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detailsApplication =
    selectedDetails?.application || selectedApplication || null;

  return (
    <main className="adminApplicationsPage">
      <section className="applicationsHead">
        <div>
          <h1>Заявления организаций</h1>
          <p>
            Проверка заявок на подключение медицинских организаций и изменение
            данных организации.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadApplications(activeStatus)}
          disabled={isLoading}
        >
          {isLoading ? "Загрузка..." : "Обновить"}
        </button>
      </section>

      <section className="statusTabs">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={activeStatus === item.value ? "active" : ""}
            onClick={() => handleFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </section>

      {error ? <div className="adminError">{error}</div> : null}

      <section className="applicationsGrid">
        <div className="applicationsCard">
          <div className="tableTitle">
            <h2>Список заявок</h2>
            <span>{applications.length} шт.</span>
          </div>

          <div className="applicationsTable">
            <div className="applicationRow applicationRowHead">
              <span>№ заявки</span>
              <span>Организация</span>
              <span>Тип</span>
              <span>Категория</span>
              <span>БИН</span>
              <span>Город</span>
              <span>Статус</span>
              <span>Действие</span>
            </div>

            {isLoading ? (
              <div className="emptyRow">Загрузка заявок...</div>
            ) : applications.length === 0 ? (
              <div className="emptyRow">
                Заявлений пока нет. Если в Supabase заявки есть, значит backend
                route пока отдаёт 404.
              </div>
            ) : (
              applications.map((item) => (
                <div
                  className="applicationRow"
                  key={item.id || item.application_number}
                >
                  <span>
                    <b>{item.application_number || "—"}</b>
                    <small>{formatDate(item.created_at)}</small>
                  </span>

                  <span>{item.organization_name || "—"}</span>

                  <span>{applicationTypeLabel(item.application_type)}</span>

                  <span>
                    {organizationTypeLabel(
                      item.organization_type,
                      item.organization_type_label
                    )}
                  </span>

                  <span>{item.bin || "—"}</span>
                  <span>{item.city || "—"}</span>

                  <span>
                    <b className={`statusPill status-${item.status || "none"}`}>
                      {statusLabel(item.status)}
                    </b>
                  </span>

                  <span>
                    <button
                      type="button"
                      className="openBtn"
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

        <aside className="detailsCard">
          {!detailsApplication ? (
            <div className="detailsEmpty">
              <h2>Выберите заявку</h2>
              <p>Нажмите “Открыть”, чтобы посмотреть данные и документы.</p>
            </div>
          ) : isDetailsLoading ? (
            <div className="detailsEmpty">
              <h2>Загрузка...</h2>
              <p>Получаем карточку заявки.</p>
            </div>
          ) : (
            <>
              <div className="detailsHeader">
                <div>
                  <h2>{detailsApplication.application_number || "Заявка"}</h2>
                  <p>{applicationTypeLabel(detailsApplication.application_type)}</p>
                </div>

                <b className={`statusPill status-${detailsApplication.status || "none"}`}>
                  {statusLabel(detailsApplication.status)}
                </b>
              </div>

              <div className="detailsSection">
                <h3>Организация</h3>

                <div className="infoGrid">
                  <div>
                    <span>Название</span>
                    <b>{detailsApplication.organization_name || "—"}</b>
                  </div>

                  <div>
                    <span>Категория</span>
                    <b>
                      {organizationTypeLabel(
                        detailsApplication.organization_type,
                        detailsApplication.organization_type_label
                      )}
                    </b>
                  </div>

                  <div>
                    <span>БИН</span>
                    <b>{detailsApplication.bin || "—"}</b>
                  </div>

                  <div>
                    <span>Город</span>
                    <b>{detailsApplication.city || "—"}</b>
                  </div>

                  <div>
                    <span>Адрес</span>
                    <b>{detailsApplication.address || "—"}</b>
                  </div>

                  <div>
                    <span>Email для ответа</span>
                    <b>{detailsApplication.sender_email || "—"}</b>
                  </div>

                  <div>
                    <span>Телефон</span>
                    <b>{detailsApplication.sender_phone || "—"}</b>
                  </div>
                </div>
              </div>

              <div className="detailsSection">
                <h3>Главный врач</h3>

                {detailsApplication.application_type === "change_chief_doctor" ||
                detailsApplication.previous_chief_doctor_full_name ||
                detailsApplication.new_chief_doctor_full_name ? (
                  <div className="doctorChange">
                    <div>
                      <span>Предыдущий</span>
                      <b>
                        {detailsApplication.previous_chief_doctor_full_name ||
                          "—"}
                      </b>
                    </div>

                    <strong>→</strong>

                    <div>
                      <span>Новый</span>
                      <b>{detailsApplication.new_chief_doctor_full_name || "—"}</b>
                      <small>
                        {detailsApplication.new_chief_doctor_phone || ""}
                        {detailsApplication.new_chief_doctor_email
                          ? ` · ${detailsApplication.new_chief_doctor_email}`
                          : ""}
                      </small>
                    </div>
                  </div>
                ) : (
                  <div className="infoGrid">
                    <div>
                      <span>ФИО</span>
                      <b>{detailsApplication.chief_doctor_full_name || "—"}</b>
                    </div>
                  </div>
                )}
              </div>

              <div className="detailsSection">
                <h3>Комментарий организации</h3>
                <p className="commentBox">
                  {detailsApplication.comment || "Комментарий не указан."}
                </p>
              </div>

              <div className="detailsSection">
                <h3>Документы</h3>

                {selectedDetails?.documents?.length ? (
                  <div className="docsList">
                    {selectedDetails.documents.map((doc) => (
                      <a
                        key={doc.id || doc.file_url || doc.document_name}
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span>{doc.document_name || "Документ"}</span>
                        <small>{doc.document_type || "файл"}</small>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Документы не найдены.</p>
                )}
              </div>

              <div className="detailsSection">
                <h3>Решение по заявке</h3>

                <textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="Комментарий для организации. При отклонении укажите причину."
                />

                <div className="decisionBtns">
                  <button
                    type="button"
                    className="processBtn"
                    onClick={() => changeStatus("in_progress")}
                    disabled={isActionLoading}
                  >
                    В процесс
                  </button>

                  <button
                    type="button"
                    className="approveBtn"
                    onClick={() => changeStatus("approved")}
                    disabled={isActionLoading}
                  >
                    Одобрить
                  </button>

                  <button
                    type="button"
                    className="rejectBtn"
                    onClick={() => changeStatus("rejected")}
                    disabled={isActionLoading}
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      </section>

      <style>{`
        .adminApplicationsPage {
          min-height: 100vh;
          padding: 40px;
          color: #fff;
        }

        .applicationsHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
        }

        .applicationsHead h1 {
          margin: 0 0 10px;
          font-size: 42px;
          line-height: 1.05;
          font-weight: 950;
        }

        .applicationsHead p {
          margin: 0;
          color: #9fb2c8;
          line-height: 1.6;
        }

        .applicationsHead button {
          border: 0;
          border-radius: 14px;
          background: #10f3df;
          color: #06202e;
          padding: 12px 18px;
          font-weight: 950;
          cursor: pointer;
        }

        .statusTabs {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
        }

        .statusTabs button {
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(15, 23, 42, 0.72);
          color: #dbeafe;
          border-radius: 999px;
          padding: 12px 18px;
          font-weight: 900;
          cursor: pointer;
        }

        .statusTabs button.active {
          background: #10f3df;
          color: #06202e;
          border-color: #10f3df;
        }

        .adminError {
          margin-bottom: 18px;
          border: 1px solid rgba(248, 113, 113, 0.4);
          background: rgba(127, 29, 29, 0.38);
          color: #fecaca;
          padding: 16px 18px;
          border-radius: 16px;
          font-weight: 800;
          line-height: 1.5;
        }

        .applicationsGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(390px, 0.75fr);
          gap: 22px;
          align-items: start;
        }

        .applicationsCard,
        .detailsCard {
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 26px;
          padding: 20px;
        }

        .tableTitle {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .tableTitle h2 {
          margin: 0;
          font-size: 20px;
        }

        .tableTitle span {
          color: #22d3ee;
          font-weight: 950;
        }

        .applicationsTable {
          overflow-x: auto;
        }

        .applicationRow {
          min-width: 1120px;
          display: grid;
          grid-template-columns: 150px 210px 210px 190px 110px 120px 140px 110px;
          gap: 14px;
          align-items: center;
          padding: 15px 16px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          color: #dbeafe;
        }

        .applicationRowHead {
          background: rgba(30, 41, 59, 0.72);
          border-radius: 16px;
          color: #9fb2c8;
          font-weight: 950;
        }

        .applicationRow small {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
        }

        .emptyRow {
          padding: 28px 16px;
          color: #9fb2c8;
          font-weight: 800;
          line-height: 1.5;
        }

        .openBtn {
          border: 0;
          border-radius: 13px;
          background: #10f3df;
          color: #06202e;
          font-weight: 950;
          padding: 10px 14px;
          cursor: pointer;
        }

        .statusPill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 950;
          background: rgba(34, 211, 238, 0.13);
          color: #67e8f9;
          white-space: nowrap;
        }

        .status-approved {
          background: rgba(34, 197, 94, 0.16);
          color: #86efac;
        }

        .status-rejected {
          background: rgba(239, 68, 68, 0.16);
          color: #fecaca;
        }

        .status-in_progress {
          background: rgba(245, 158, 11, 0.16);
          color: #fde68a;
        }

        .detailsCard {
          position: sticky;
          top: 22px;
          max-height: calc(100vh - 44px);
          overflow-y: auto;
        }

        .detailsEmpty {
          min-height: 260px;
          display: grid;
          place-content: center;
          text-align: center;
          color: #9fb2c8;
        }

        .detailsEmpty h2 {
          margin: 0 0 10px;
          color: #fff;
        }

        .detailsHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 18px;
        }

        .detailsHeader h2 {
          margin: 0 0 6px;
        }

        .detailsHeader p {
          margin: 0;
          color: #9fb2c8;
        }

        .detailsSection {
          border-top: 1px solid rgba(148, 163, 184, 0.12);
          padding-top: 18px;
          margin-top: 18px;
        }

        .detailsSection h3 {
          margin: 0 0 14px;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .infoGrid div,
        .doctorChange div {
          background: rgba(2, 6, 23, 0.34);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 16px;
          padding: 13px;
        }

        .infoGrid span,
        .doctorChange span {
          display: block;
          color: #8aa0b8;
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .infoGrid b,
        .doctorChange b {
          overflow-wrap: anywhere;
        }

        .doctorChange {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 10px;
          align-items: center;
        }

        .doctorChange > strong {
          color: #22d3ee;
          font-size: 22px;
        }

        .doctorChange small {
          display: block;
          margin-top: 6px;
          color: #9fb2c8;
        }

        .commentBox {
          background: rgba(2, 6, 23, 0.34);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 16px;
          padding: 14px;
          color: #dbeafe;
          line-height: 1.6;
        }

        .docsList {
          display: grid;
          gap: 10px;
        }

        .docsList a {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: #dbeafe;
          text-decoration: none;
          background: rgba(2, 6, 23, 0.34);
          border-radius: 14px;
          padding: 12px;
        }

        .docsList small,
        .muted {
          color: #8aa0b8;
        }

        .detailsSection textarea {
          width: 100%;
          min-height: 110px;
          resize: vertical;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(2, 6, 23, 0.5);
          color: #ffffff;
          border-radius: 15px;
          padding: 13px;
          outline: none;
        }

        .decisionBtns {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          margin-top: 12px;
        }

        .decisionBtns button {
          border: 0;
          border-radius: 15px;
          padding: 13px 12px;
          color: #ffffff;
          font-weight: 950;
          cursor: pointer;
        }

        .processBtn {
          background: #f59e0b;
        }

        .approveBtn {
          background: #16a34a;
        }

        .rejectBtn {
          background: #dc2626;
        }

        @media (max-width: 1200px) {
          .applicationsGrid {
            grid-template-columns: 1fr;
          }

          .detailsCard {
            position: static;
            max-height: none;
          }
        }

        @media (max-width: 760px) {
          .adminApplicationsPage {
            padding: 20px 14px;
          }

          .applicationsHead {
            display: block;
          }

          .applicationsHead h1 {
            font-size: 32px;
          }

          .applicationsHead button {
            margin-top: 16px;
          }

          .applicationsCard,
          .detailsCard {
            padding: 14px;
            border-radius: 20px;
          }

          .infoGrid,
          .doctorChange,
          .decisionBtns {
            grid-template-columns: 1fr;
          }

          .doctorChange > strong {
            text-align: center;
            transform: rotate(90deg);
          }
        }
      `}</style>
    </main>
  );
}