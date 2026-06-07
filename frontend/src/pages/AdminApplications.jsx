import { useEffect, useMemo, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "https://health-card.onrender.com";

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

function getToken() {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

function getCurrentAdmin() {
  const keys = ["admin", "currentAdmin", "adminUser", "user"];

  for (const key of keys) {
    try {
      const value = localStorage.getItem(key);
      if (value) return JSON.parse(value);
    } catch {
      continue;
    }
  }

  return null;
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

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || "—";
}

function getApplicationTypeLabel(type) {
  return APPLICATION_TYPE_LABELS[type] || type || "Подключение организации";
}

function getOrganizationTypeLabel(type, fallback) {
  return fallback || ORGANIZATION_TYPE_LABELS[type] || type || "—";
}

function normalizeList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.applications)) return result.applications;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.items)) return result.items;
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
    documents: result?.documents || [],
    history: result?.history || [],
  };
}

export default function AdminApplications() {
  const [currentAdmin] = useState(() => getCurrentAdmin());

  const [applications, setApplications] = useState([]);
  const [supportAdmins, setSupportAdmins] = useState([]);

  const [activeStatus, setActiveStatus] = useState("all");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);

  const [reviewComment, setReviewComment] = useState("");
  const [assignedAdminId, setAssignedAdminId] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [error, setError] = useState("");

  const token = useMemo(() => getToken(), []);

  async function apiFetch(path, options = {}) {
    const headers = {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        result?.message ||
          result?.error ||
          `Ошибка запроса. Код: ${response.status}`
      );
    }

    return result;
  }

  async function loadApplications(status = "all") {
    setIsLoading(true);
    setError("");

    try {
      const safeStatus = status || "all";

      const query =
        safeStatus !== "all"
          ? `?status=${encodeURIComponent(safeStatus)}`
          : "";

      const result = await apiFetch(`/api/organization-applications${query}`);
      setApplications(normalizeList(result));
    } catch (err) {
      setError(err.message || "Не удалось загрузить заявки.");
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSupportAdmins() {
    try {
      const result = await apiFetch(
        "/api/organization-applications/support-admins"
      );

      const list =
        result?.admins ||
        result?.supportAdmins ||
        result?.data ||
        result ||
        [];

      setSupportAdmins(Array.isArray(list) ? list : []);
    } catch {
      setSupportAdmins([]);
    }
  }

  async function openApplication(application) {
    setSelectedApplication(application);
    setSelectedDetails(null);
    setReviewComment(application?.review_comment || "");
    setAssignedAdminId(application?.assigned_admin_id || "");
    setIsDetailsLoading(true);
    setError("");

    try {
      const result = await apiFetch(
        `/api/organization-applications/${application.id}`
      );

      const details = normalizeDetails(result, application);

      setSelectedDetails(details);
      setReviewComment(details.application?.review_comment || "");
      setAssignedAdminId(details.application?.assigned_admin_id || "");
    } catch (err) {
      setSelectedDetails({
        application,
        documents: [],
        history: [],
      });

      setError(err.message || "Не удалось открыть заявку.");
    } finally {
      setIsDetailsLoading(false);
    }
  }

  async function changeStatus(status) {
    const applicationId =
      selectedDetails?.application?.id || selectedApplication?.id;

    if (!applicationId) return;

    if (status === "rejected" && !reviewComment.trim()) {
      setError("При отклонении заявки нужно указать причину.");
      return;
    }

    setIsActionLoading(true);
    setError("");

    try {
      await apiFetch(`/api/organization-applications/${applicationId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          reviewComment,
          comment: reviewComment,
        }),
      });

      await loadApplications(activeStatus);

      await openApplication({
        ...(selectedDetails?.application || selectedApplication),
        status,
        review_comment: reviewComment,
      });
    } catch (err) {
      setError(err.message || "Не удалось изменить статус заявки.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function assignAdmin() {
    const applicationId =
      selectedDetails?.application?.id || selectedApplication?.id;

    if (!applicationId) return;

    if (!assignedAdminId) {
      setError("Выберите администратора.");
      return;
    }

    setIsActionLoading(true);
    setError("");

    try {
      await apiFetch(`/api/organization-applications/${applicationId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({
          assignedAdminId,
          adminId: assignedAdminId,
          comment: "Заявка назначена ответственному администратору.",
        }),
      });

      await loadApplications(activeStatus);

      await openApplication({
        ...(selectedDetails?.application || selectedApplication),
        assigned_admin_id: assignedAdminId,
        status: "in_progress",
      });
    } catch (err) {
      setError(err.message || "Не удалось назначить администратора.");
    } finally {
      setIsActionLoading(false);
    }
  }

  function changeFilter(status) {
    const safeStatus = status || "all";
    setActiveStatus(safeStatus);
    loadApplications(safeStatus);
  }

  useEffect(() => {
    loadApplications("all");
    loadSupportAdmins();
  }, []);

  const detailsApplication =
    selectedDetails?.application || selectedApplication || null;

  return (
    <main className="admin-applications-page">
      <section className="admin-page-head">
        <div>
          <h1>Заявления организаций</h1>
          <p>
            Проверка заявок на подключение медицинских организаций и изменение
            данных организации.
          </p>
        </div>
      </section>

      <section className="status-tabs">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={activeStatus === item.value ? "active" : ""}
            onClick={() => changeFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </section>

      {error ? <div className="admin-error">{error}</div> : null}

      <section className="applications-layout">
        <div className="applications-card">
          <div className="table-head">
            <h2>Список заявок</h2>
            <button
              type="button"
              className="small-button"
              onClick={() => loadApplications(activeStatus)}
              disabled={isLoading}
            >
              {isLoading ? "Загрузка..." : "Обновить"}
            </button>
          </div>

          <div className="applications-table">
            <div className="applications-row applications-row-head">
              <span>№ заявки</span>
              <span>Организация</span>
              <span>Тип заявки</span>
              <span>Категория</span>
              <span>БИН</span>
              <span>Город</span>
              <span>Статус</span>
              <span>Действие</span>
            </div>

            {isLoading ? (
              <div className="empty-row">Загрузка заявок...</div>
            ) : applications.length === 0 ? (
              <div className="empty-row">Заявлений пока нет</div>
            ) : (
              applications.map((application) => (
                <div
                  key={application.id || application.application_number}
                  className="applications-row"
                >
                  <span>
                    <strong>{application.application_number || "—"}</strong>
                    <small>{formatDate(application.created_at)}</small>
                  </span>

                  <span>{application.organization_name || "—"}</span>

                  <span>
                    {getApplicationTypeLabel(application.application_type)}
                  </span>

                  <span>
                    {getOrganizationTypeLabel(
                      application.organization_type,
                      application.organization_type_label
                    )}
                  </span>

                  <span>{application.bin || "—"}</span>
                  <span>{application.city || "—"}</span>

                  <span>
                    <b className="status-pill">
                      {getStatusLabel(application.status)}
                    </b>
                  </span>

                  <span>
                    <button
                      type="button"
                      className="open-button"
                      onClick={() => openApplication(application)}
                    >
                      Открыть
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="application-details">
          {!detailsApplication ? (
            <div className="details-placeholder">
              <h2>Выберите заявку</h2>
              <p>
                Нажмите “Открыть”, чтобы посмотреть данные организации,
                документы и изменить статус.
              </p>
            </div>
          ) : isDetailsLoading ? (
            <div className="details-placeholder">
              <h2>Загрузка...</h2>
              <p>Получаем данные заявки.</p>
            </div>
          ) : (
            <>
              <div className="details-header">
                <div>
                  <h2>{detailsApplication.application_number || "Заявка"}</h2>
                  <p>{getApplicationTypeLabel(detailsApplication.application_type)}</p>
                </div>

                <b className="status-pill">
                  {getStatusLabel(detailsApplication.status)}
                </b>
              </div>

              <div className="details-section">
                <h3>Данные организации</h3>

                <div className="info-grid">
                  <div>
                    <span>Организация</span>
                    <strong>{detailsApplication.organization_name || "—"}</strong>
                  </div>

                  <div>
                    <span>Категория</span>
                    <strong>
                      {getOrganizationTypeLabel(
                        detailsApplication.organization_type,
                        detailsApplication.organization_type_label
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>БИН</span>
                    <strong>{detailsApplication.bin || "—"}</strong>
                  </div>

                  <div>
                    <span>Город</span>
                    <strong>{detailsApplication.city || "—"}</strong>
                  </div>

                  <div>
                    <span>Адрес</span>
                    <strong>{detailsApplication.address || "—"}</strong>
                  </div>

                  <div>
                    <span>Email для ответа</span>
                    <strong>{detailsApplication.sender_email || "—"}</strong>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>Главный врач</h3>

                {detailsApplication.application_type ===
                "change_chief_doctor" ? (
                  <div className="doctor-change">
                    <div>
                      <span>Предыдущий главный врач</span>
                      <strong>
                        {detailsApplication.previous_chief_doctor_full_name ||
                          "—"}
                      </strong>
                    </div>

                    <div className="arrow-change">→</div>

                    <div>
                      <span>Новый главный врач</span>
                      <strong>
                        {detailsApplication.new_chief_doctor_full_name || "—"}
                      </strong>
                      <small>
                        {detailsApplication.new_chief_doctor_phone || ""}
                        {detailsApplication.new_chief_doctor_email
                          ? ` · ${detailsApplication.new_chief_doctor_email}`
                          : ""}
                      </small>
                    </div>
                  </div>
                ) : (
                  <div className="info-grid">
                    <div>
                      <span>ФИО главного врача</span>
                      <strong>
                        {detailsApplication.chief_doctor_full_name || "—"}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="details-section">
                <h3>Комментарий организации</h3>
                <p className="comment-box">
                  {detailsApplication.comment || "Комментарий не указан."}
                </p>
              </div>

              <div className="details-section">
                <h3>Документы</h3>

                {selectedDetails?.documents?.length ? (
                  <div className="documents-list">
                    {selectedDetails.documents.map((doc) => (
                      <a
                        key={doc.id || doc.file_url || doc.document_name}
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="document-link"
                      >
                        <span>{doc.document_name || "Документ"}</span>
                        <small>{doc.document_type || "файл"}</small>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="muted-text">Документы не найдены.</p>
                )}
              </div>

              {currentAdmin?.role === "super_admin" ? (
                <div className="details-section">
                  <h3>Назначить ответственного</h3>

                  <div className="assign-row">
                    <select
                      value={assignedAdminId}
                      onChange={(event) =>
                        setAssignedAdminId(event.target.value)
                      }
                    >
                      <option value="">Выберите администратора</option>

                      {supportAdmins.map((admin) => (
                        <option key={admin.id} value={admin.id}>
                          {admin.full_name ||
                            admin.name ||
                            admin.username ||
                            admin.email ||
                            "Администратор"}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={assignAdmin}
                      disabled={isActionLoading}
                    >
                      Назначить
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="details-section">
                <h3>Решение по заявке</h3>

                <textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="Комментарий для организации. При отклонении обязательно укажите причину."
                />

                <div className="decision-actions">
                  <button
                    type="button"
                    className="progress-button"
                    onClick={() => changeStatus("in_progress")}
                    disabled={isActionLoading}
                  >
                    В процесс
                  </button>

                  <button
                    type="button"
                    className="approve-button"
                    onClick={() => changeStatus("approved")}
                    disabled={isActionLoading}
                  >
                    Одобрить
                  </button>

                  <button
                    type="button"
                    className="reject-button"
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
        .admin-applications-page {
          min-height: 100vh;
          padding: 40px;
          color: #fff;
        }

        .admin-page-head {
          margin-bottom: 24px;
        }

        .admin-page-head h1 {
          margin: 0 0 10px;
          font-size: 42px;
          font-weight: 950;
        }

        .admin-page-head p {
          margin: 0;
          color: #9fb2c8;
        }

        .status-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
        }

        .status-tabs button {
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(15, 23, 42, 0.72);
          color: #dbeafe;
          border-radius: 999px;
          padding: 12px 18px;
          font-weight: 900;
          cursor: pointer;
        }

        .status-tabs button.active {
          background: #10f3df;
          color: #06202e;
          border-color: #10f3df;
        }

        .admin-error {
          margin-bottom: 18px;
          border: 1px solid rgba(248, 113, 113, 0.4);
          background: rgba(127, 29, 29, 0.38);
          color: #fecaca;
          padding: 16px 18px;
          border-radius: 16px;
          font-weight: 800;
        }

        .applications-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(380px, 0.75fr);
          gap: 22px;
          align-items: start;
        }

        .applications-card,
        .application-details {
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 26px;
          padding: 20px;
        }

        .table-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .table-head h2 {
          margin: 0;
        }

        .small-button,
        .open-button {
          border: 0;
          border-radius: 13px;
          background: #10f3df;
          color: #06202e;
          font-weight: 950;
          padding: 10px 14px;
          cursor: pointer;
        }

        .applications-table {
          overflow-x: auto;
        }

        .applications-row {
          min-width: 1120px;
          display: grid;
          grid-template-columns: 150px 220px 210px 190px 110px 130px 140px 110px;
          gap: 14px;
          align-items: center;
          padding: 15px 16px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          color: #dbeafe;
        }

        .applications-row-head {
          background: rgba(30, 41, 59, 0.72);
          border-radius: 16px;
          color: #9fb2c8;
          font-weight: 950;
        }

        .applications-row small {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
        }

        .empty-row {
          padding: 28px 16px;
          color: #9fb2c8;
          font-weight: 800;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 950;
          background: rgba(34, 211, 238, 0.13);
          color: #67e8f9;
        }

        .application-details {
          position: sticky;
          top: 22px;
          max-height: calc(100vh - 44px);
          overflow-y: auto;
        }

        .details-placeholder {
          min-height: 240px;
          display: grid;
          place-content: center;
          text-align: center;
          color: #9fb2c8;
        }

        .details-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .details-header h2 {
          margin: 0;
        }

        .details-header p {
          margin: 6px 0 0;
          color: #9fb2c8;
        }

        .details-section {
          border-top: 1px solid rgba(148, 163, 184, 0.12);
          padding-top: 18px;
          margin-top: 18px;
        }

        .details-section h3 {
          margin: 0 0 14px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .info-grid div,
        .doctor-change div:not(.arrow-change) {
          background: rgba(2, 6, 23, 0.34);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 16px;
          padding: 13px;
        }

        .info-grid span,
        .doctor-change span {
          display: block;
          color: #8aa0b8;
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .doctor-change {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 10px;
          align-items: center;
        }

        .arrow-change {
          color: #22d3ee;
          font-weight: 950;
          font-size: 22px;
        }

        .comment-box {
          background: rgba(2, 6, 23, 0.34);
          border-radius: 16px;
          padding: 14px;
          color: #dbeafe;
        }

        .documents-list {
          display: grid;
          gap: 10px;
        }

        .document-link {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          text-decoration: none;
          color: #dbeafe;
          background: rgba(2, 6, 23, 0.34);
          border-radius: 14px;
          padding: 12px;
        }

        .document-link small {
          color: #22d3ee;
        }

        .muted-text {
          color: #8aa0b8;
        }

        .assign-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
        }

        .assign-row select,
        .details-section textarea {
          width: 100%;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(2, 6, 23, 0.5);
          color: #ffffff;
          border-radius: 15px;
          padding: 13px;
          outline: none;
        }

        .assign-row button {
          border: 0;
          border-radius: 15px;
          padding: 0 16px;
          background: #22c55e;
          color: #ffffff;
          font-weight: 950;
          cursor: pointer;
        }

        .details-section textarea {
          min-height: 110px;
          resize: vertical;
        }

        .decision-actions {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          margin-top: 12px;
        }

        .decision-actions button {
          border: 0;
          border-radius: 15px;
          padding: 13px 12px;
          color: #ffffff;
          font-weight: 950;
          cursor: pointer;
        }

        .progress-button { background: #f59e0b; }
        .approve-button { background: #16a34a; }
        .reject-button { background: #dc2626; }

        @media (max-width: 1200px) {
          .applications-layout {
            grid-template-columns: 1fr;
          }

          .application-details {
            position: static;
            max-height: none;
          }
        }

        @media (max-width: 760px) {
          .admin-applications-page {
            padding: 20px 14px;
          }

          .admin-page-head h1 {
            font-size: 32px;
          }

          .applications-card,
          .application-details {
            padding: 14px;
            border-radius: 20px;
          }

          .info-grid,
          .doctor-change,
          .assign-row,
          .decision-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}