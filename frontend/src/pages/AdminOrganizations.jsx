import { useEffect, useMemo, useState } from "react";
import "../styles/adminLayout.css";

const API_URL = "https://health-card.onrender.com";

const statusOptions = [
  { value: "all", label: "Все" },
  { value: "new", label: "Новые" },
  { value: "assigned", label: "Назначенные" },
  { value: "in_progress", label: "В процессе" },
  { value: "needs_fix", label: "Требуют исправления" },
  { value: "resubmitted", label: "Отправлены повторно" },
  { value: "waiting_eds", label: "Ожидают ЭЦП" },
  { value: "approved", label: "Одобрены" },
  { value: "rejected", label: "Отклонены" },
];

const changeStatusOptions = [
  { value: "in_progress", label: "В процессе проверки" },
  { value: "needs_fix", label: "Требует исправления" },
  { value: "waiting_eds", label: "Ожидает ЭЦП главного врача" },
  { value: "approved", label: "Одобрена" },
  { value: "rejected", label: "Отклонена" },
];

function typeLabel(type) {
  if (type === "gov_polyclinics") return "Государственная поликлиника";
  if (type === "gov_hospitals") return "Государственная больница";
  if (type === "private_clinics") return "Частная клиника";
  return "Не указано";
}

function statusLabel(status) {
  if (status === "new") return "Новая заявка";
  if (status === "assigned") return "Назначена";
  if (status === "in_progress") return "В процессе";
  if (status === "needs_fix") return "Требует исправления";
  if (status === "resubmitted") return "Отправлена повторно";
  if (status === "waiting_eds") return "Ожидает ЭЦП";
  if (status === "approved") return "Одобрена";
  if (status === "rejected") return "Отклонена";
  return "Неизвестно";
}

function statusClass(status) {
  if (status === "approved") return "active";
  if (status === "rejected") return "blocked";
  if (status === "needs_fix") return "warning";
  if (status === "waiting_eds") return "info";
  return "neutral";
}

function formatDate(date) {
  if (!date) return "—";

  return new Date(date).toLocaleString("ru-RU");
}

function documentTypeLabel(type) {
  if (type === "medical_license") return "Лицензия";
  if (type === "registration_document") return "Регистрация организации";
  if (type === "chief_doctor_order") return "Назначение главного врача";
  if (type === "other") return "Дополнительный документ";
  return "Документ";
}

export default function AdminOrganizations() {
  const adminData = JSON.parse(localStorage.getItem("adminData") || "null");
  const token = adminData?.token;
  const isSuperAdmin = adminData?.role === "super_admin";

  const [applications, setApplications] = useState([]);
  const [supportAdmins, setSupportAdmins] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("all");
  const [selectedApplication, setSelectedApplication] = useState(null);

  const [assignAdminId, setAssignAdminId] = useState("");
  const [newStatus, setNewStatus] = useState("in_progress");
  const [reviewComment, setReviewComment] = useState("");
  const [saving, setSaving] = useState(false);

  const loadApplications = async () => {
    try {
      setError("");

      const response = await fetch(
        `${API_URL}/api/organization-applications/admin`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Ошибка получения заявлений.");
      }

      setApplications(data.applications || []);

      if (selectedApplication) {
        const fresh = (data.applications || []).find(
          (item) => item.id === selectedApplication.id
        );

        if (fresh) {
          setSelectedApplication(fresh);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Ошибка получения заявлений.");
    } finally {
      setLoading(false);
    }
  };

  const loadSupportAdmins = async () => {
    if (!isSuperAdmin) return;

    try {
      const response = await fetch(
        `${API_URL}/api/organization-applications/support-admins`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Ошибка получения админов.");
      }

      setSupportAdmins(data.admins || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadApplications();
    loadSupportAdmins();

    const interval = setInterval(() => {
      loadApplications();
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredApplications = useMemo(() => {
    if (filter === "all") return applications;

    return applications.filter((item) => item.status === filter);
  }, [applications, filter]);

  const availableAdminsForSelected = useMemo(() => {
    if (!selectedApplication) return [];

    return supportAdmins.filter(
      (admin) => admin.category === selectedApplication.organization_type
    );
  }, [supportAdmins, selectedApplication]);

  const openApplication = (application) => {
    setSelectedApplication(application);
    setAssignAdminId(application.assigned_admin_id || "");
    setNewStatus(
      application.status === "new" || application.status === "assigned"
        ? "in_progress"
        : application.status
    );
    setReviewComment(application.review_comment || "");
  };

  const closeModal = () => {
    setSelectedApplication(null);
    setAssignAdminId("");
    setNewStatus("in_progress");
    setReviewComment("");
  };

  const assignAdmin = async () => {
    if (!selectedApplication) return;

    if (!assignAdminId) {
      alert("Выберите ответственного админа");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/api/organization-applications/${selectedApplication.id}/assign`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            assignedAdminId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось назначить админа.");
      }

      await loadApplications();

      alert("Ответственный админ назначен");
    } catch (err) {
      console.error(err);
      alert(err.message || "Ошибка назначения админа.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (!selectedApplication) return;

    if (
      (newStatus === "needs_fix" || newStatus === "rejected") &&
      !reviewComment.trim()
    ) {
      alert("Для отклонения или исправления обязательно напишите комментарий");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/api/organization-applications/${selectedApplication.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: newStatus,
            reviewComment: reviewComment.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось изменить статус.");
      }

      await loadApplications();

      alert("Статус заявления обновлён");
    } catch (err) {
      console.error(err);
      alert(err.message || "Ошибка изменения статуса.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adminPage">
      <div className="adminPageHeader">
        <div>
          <h1>Заявления организаций</h1>
          <p>
            Проверка заявлений на подключение медицинских организаций к системе.
          </p>
        </div>
      </div>

      <div className="adminTabs">
        {statusOptions.map((item) => (
          <button
            key={item.value}
            type="button"
            className={filter === item.value ? "active" : ""}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <div className="adminErrorBox">{error}</div>}

      <div className="adminTableCard">
        {loading ? (
          <div className="adminLoadingText">Загрузка заявлений...</div>
        ) : (
          <div className="adminTable adminApplicationsTable">
            <div className="adminTableHead">
              <span>№ заявки</span>
              <span>Организация</span>
              <span>Тип</span>
              <span>БИН</span>
              <span>Город</span>
              <span>Ответственный</span>
              <span>Статус</span>
              <span>Действие</span>
            </div>

            {filteredApplications.length === 0 ? (
              <div className="adminEmptyRow">Заявлений пока нет</div>
            ) : (
              filteredApplications.map((application) => (
                <div className="adminTableRow" key={application.id}>
                  <span className="strongText">
                    {application.application_number || "—"}
                  </span>

                  <span>{application.organization_name}</span>

                  <span>{typeLabel(application.organization_type)}</span>

                  <span>{application.bin}</span>

                  <span>{application.city}</span>

                  <span>
                    {application.assigned_admin?.full_name || "Не назначен"}
                  </span>

                  <span>
                    <b
                      className={`statusPill ${statusClass(
                        application.status
                      )}`}
                    >
                      {statusLabel(application.status)}
                    </b>
                  </span>

                  <span>
                    <button
                      className="adminSmallBtn"
                      type="button"
                      onClick={() => openApplication(application)}
                    >
                      Открыть
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {selectedApplication && (
        <div className="adminModalOverlay" onClick={closeModal}>
          <div
            className="adminModal adminApplicationModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="adminModalTitle">
              Заявление {selectedApplication.application_number}
            </div>

            <div className="adminApplicationGrid">
              <section className="adminApplicationSection">
                <h3>Данные для главного админа</h3>

                <div className="adminInfoList">
                  <div>
                    <span>Название организации</span>
                    <b>{selectedApplication.organization_name}</b>
                  </div>

                  <div>
                    <span>Тип организации</span>
                    <b>{typeLabel(selectedApplication.organization_type)}</b>
                  </div>

                  <div>
                    <span>Статус</span>
                    <b>{statusLabel(selectedApplication.status)}</b>
                  </div>

                  <div>
                    <span>Дата подачи</span>
                    <b>{formatDate(selectedApplication.created_at)}</b>
                  </div>

                  <div>
                    <span>Ответственный админ</span>
                    <b>
                      {selectedApplication.assigned_admin?.full_name ||
                        "Не назначен"}
                    </b>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="adminAssignBox">
                    <label>Назначить ответственного</label>

                    <select
                      value={assignAdminId}
                      onChange={(e) => setAssignAdminId(e.target.value)}
                    >
                      <option value="">Выберите админа</option>

                      {availableAdminsForSelected.map((admin) => (
                        <option value={admin.id} key={admin.id}>
                          {admin.full_name} / {admin.username}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="adminSaveBtn"
                      onClick={assignAdmin}
                      disabled={saving}
                    >
                      {saving ? "Сохранение..." : "Назначить"}
                    </button>
                  </div>
                )}
              </section>

              <section className="adminApplicationSection">
                <h3>Данные для проверки</h3>

                <div className="adminInfoList">
                  <div>
                    <span>БИН</span>
                    <b>{selectedApplication.bin}</b>
                  </div>

                  <div>
                    <span>Город</span>
                    <b>{selectedApplication.city}</b>
                  </div>

                  <div>
                    <span>Адрес</span>
                    <b>{selectedApplication.address}</b>
                  </div>

                  <div>
                    <span>ФИО главного врача</span>
                    <b>{selectedApplication.chief_doctor_full_name}</b>
                  </div>

                  <div>
                    <span>ФИО отправителя</span>
                    <b>{selectedApplication.sender_full_name}</b>
                  </div>

                  <div>
                    <span>Телефон</span>
                    <b>{selectedApplication.sender_phone || "Не указан"}</b>
                  </div>

                  <div>
                    <span>Email</span>
                    <b>{selectedApplication.sender_email || "Не указан"}</b>
                  </div>
                </div>
              </section>
            </div>

            <section className="adminApplicationSection">
              <h3>Документы</h3>

              {selectedApplication.documents?.length > 0 ? (
                <div className="adminDocumentsList">
                  {selectedApplication.documents.map((doc) => (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      key={doc.id}
                    >
                      <span>{documentTypeLabel(doc.document_type)}</span>
                      <b>{doc.document_name}</b>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="adminEmptyText">Документы не найдены</div>
              )}
            </section>

            <section className="adminApplicationSection">
              <h3>Комментарий организации</h3>

              <div className="adminCommentBox">
                {selectedApplication.comment || "Комментарий не указан"}
              </div>
            </section>

            <section className="adminApplicationSection">
              <h3>Проверка заявления</h3>

              <div className="adminCheckGrid">
                <div className="adminField">
                  <label>Новый статус</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    {changeStatusOptions.map((item) => (
                      <option value={item.value} key={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="adminField wide">
                  <label>Комментарий проверки</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Например: не хватает лицензии или БИН не совпадает с документами"
                  />
                </div>
              </div>
            </section>

            <div className="adminModalActions">
              <button
                className="adminCancelBtn"
                type="button"
                onClick={closeModal}
              >
                Закрыть
              </button>

              <button
                className="adminSaveBtn"
                type="button"
                onClick={changeStatus}
                disabled={saving}
              >
                {saving ? "Сохранение..." : "Сохранить статус"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}