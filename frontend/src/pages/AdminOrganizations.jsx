import { useEffect, useState, useRef } from "react";
import { adminRequest } from "../api/adminApi";
import "../styles/adminLayout.css";

const STATUS_LABELS = {
  new: "Новая",
  assigned: "Назначена",
  in_progress: "В процессе",
  needs_fix: "Требует исправлений",
  resent: "Отправлена повторно",
  waiting_eds: "Ожидает ЭЦП",
  waiting_first_login: "Одобрена (ожидает вход)",
  approved: "Одобрена (активна)",
  rejected: "Отклонена",
};

const STATUS_COLORS = {
  new: "#3b82f6",
  assigned: "#6366f1",
  in_progress: "#f59e0b",
  needs_fix: "#ef4444",
  resent: "#8b5cf6",
  waiting_eds: "#ec4899",
  waiting_first_login: "#10b981",
  approved: "#10b981",
  rejected: "#6b7280",
};

const ORG_TYPES = [
  { value: "state_polyclinic", label: "Государственная поликлиника" },
  { value: "state_hospital", label: "Государственная больница" },
  { value: "private_clinic", label: "Частная клиника" },
];

export default function AdminOrganizations() {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [editingOrg, setEditingOrg] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Chat states
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const activeOrgRef = useRef(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  // Periodic chat update
  useEffect(() => {
    const interval = setInterval(() => {
      const activeOrg = activeOrgRef.current;
      if (activeOrg) {
        loadChatMessages(activeOrg.id, true);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  async function loadOrganizations() {
    setLoading(true);
    setError("");
    try {
      const result = await adminRequest("/api/organizations");
      setOrganizations(result.organizations || []);
    } catch (err) {
      setError(err.message || "Не удалось загрузить список организаций.");
    } finally {
      setLoading(false);
    }
  }

  async function loadChatMessages(orgId, silent = false) {
    if (!silent) setChatLoading(true);
    try {
      const result = await adminRequest(`/api/admin-channels/organization/${orgId}/messages`);
      setMessages(result.messages || []);
    } catch (err) {
      console.warn("Error loading chat messages:", err);
    } finally {
      if (!silent) setChatLoading(false);
    }
  }

  function handleSelectOrg(org) {
    setSelectedOrg(org);
    activeOrgRef.current = org;
    setMessages([]);
    loadChatMessages(org.id);
  }

  function handleCloseDetails() {
    setSelectedOrg(null);
    activeOrgRef.current = null;
    setMessages([]);
  }

  function handleStartEdit(org) {
    setEditingOrg(org);
    setEditForm({ ...org });
    setMessage("");
    setError("");
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await adminRequest(`/api/organizations/${editingOrg.id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });

      if (result.success) {
        setMessage("Данные организации успешно обновлены.");
        // If changed email, notify credentials reset
        if (
          editForm.chief_doctor_email !== editingOrg.chief_doctor_email ||
          editForm.organization_email !== editingOrg.organization_email
        ) {
          setMessage(
            "Данные сохранены. На измененные адреса почты высланы новые временные пароли."
          );
        }

        // Update list
        setOrganizations((prev) =>
          prev.map((o) => (o.id === editingOrg.id ? result.organization : o))
        );
        setSelectedOrg(result.organization);
        activeOrgRef.current = result.organization;
        setEditingOrg(null);
      }
    } catch (err) {
      setError(err.message || "Не удалось обновить организацию.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendReply(e) {
    e.preventDefault();
    if (!newMsg.trim() || !selectedOrg) return;

    const currentText = newMsg.trim();
    setNewMsg("");

    try {
      await adminRequest(`/api/admin-channels/organization/${selectedOrg.id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          message: currentText,
        }),
      });
      loadChatMessages(selectedOrg.id, true);
    } catch (err) {
      setNewMsg(currentText);
      setError(err.message || "Не удалось отправить сообщение.");
    }
  }

  // Filter organizations
  const filteredOrgs = organizations.filter((org) => {
    const q = search.toLowerCase();
    const matchesSearch =
      org.organization_name.toLowerCase().includes(q) ||
      org.bin.includes(q) ||
      (org.city && org.city.toLowerCase().includes(q));

    const matchesStatus = statusFilter === "all" || org.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <main className="adminContentPage">
      <section className="adminPageHead">
        <div>
          <h1>Организации</h1>
          <p>Управление зарегистрированными медицинскими организациями системы.</p>
        </div>

        <button type="button" onClick={loadOrganizations} className="adminBtn">
          Обновить
        </button>
      </section>

      {error && <div className="adminError">{error}</div>}
      {message && <div className="adminSuccess">{message}</div>}

      <div className="orgs-layout-grid">
        {/* LEFT COLUMN: LIST */}
        <section className="adminCard listCard">
          <div className="filter-row-inline">
            <input
              type="text"
              placeholder="Поиск по названию, БИН или городу..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="adminSearchInput"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="adminFilterSelect"
            >
              <option value="all">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="table-responsive">
            <table className="adminTable">
              <thead>
                <tr>
                  <th>Название организации</th>
                  <th>БИН</th>
                  <th>Город</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.length > 0 ? (
                  filteredOrgs.map((org) => (
                    <tr
                      key={org.id}
                      onClick={() => handleSelectOrg(org)}
                      className={`selectable-row ${
                        selectedOrg?.id === org.id ? "selected-row" : ""
                      }`}
                    >
                      <td>
                        <b>{org.organization_name}</b>
                      </td>
                      <td>{org.bin}</td>
                      <td>{org.city || "—"}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{ background: STATUS_COLORS[org.status] }}
                        >
                          {STATUS_LABELS[org.status] || org.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="action-link-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(org);
                          }}
                        >
                          Редактировать
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center">
                      Организации не найдены.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* RIGHT COLUMN: DETAILS AND SUPPORT CHAT */}
        {selectedOrg && (
          <section className="adminCard detailsCard">
            <div className="detailsHeader">
              <h3>{selectedOrg.organization_name}</h3>
              <button
                type="button"
                className="closeDetailsBtn"
                onClick={handleCloseDetails}
              >
                ×
              </button>
            </div>

            <div className="detailsContentScroll">
              <table className="detailsTable">
                <tbody>
                  <tr>
                    <td>БИН:</td>
                    <td><b>{selectedOrg.bin}</b></td>
                  </tr>
                  <tr>
                    <td>Город:</td>
                    <td>{selectedOrg.city || "—"}</td>
                  </tr>
                  <tr>
                    <td>Адрес:</td>
                    <td>{selectedOrg.address || "—"}</td>
                  </tr>
                  <tr>
                    <td>Главный врач:</td>
                    <td>{selectedOrg.chief_doctor_full_name || "—"}</td>
                  </tr>
                  <tr>
                    <td>Почта главврача:</td>
                    <td>{selectedOrg.chief_doctor_email || "—"}</td>
                  </tr>
                  <tr>
                    <td>Телефон главврача:</td>
                    <td>{selectedOrg.chief_doctor_phone || "—"}</td>
                  </tr>
                  <tr>
                    <td>Email организации:</td>
                    <td>{selectedOrg.organization_email || "—"}</td>
                  </tr>
                  <tr>
                    <td>Телефон организации:</td>
                    <td>{selectedOrg.organization_phone || "—"}</td>
                  </tr>
                  <tr>
                    <td>Статус:</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ background: STATUS_COLORS[selectedOrg.status] }}
                      >
                        {STATUS_LABELS[selectedOrg.status] || selectedOrg.status}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <button
                type="button"
                className="adminBtn editBtn"
                onClick={() => handleStartEdit(selectedOrg)}
              >
                Редактировать карточку
              </button>

              <hr className="detailsHr" />

              {/* Chat Correspondence */}
              <div className="adminChatSection">
                <h4>Чат поддержки с организацией</h4>
                <div className="adminChatMessages">
                  {chatLoading ? (
                    <p className="muted">Загрузка переписки...</p>
                  ) : messages.length === 0 ? (
                    <p className="muted">Нет сообщений. Напишите первое сообщение клинике.</p>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = !!msg.sender_admin_id;
                      const renderMsgText = (textStr) => {
                        const linkRegex = /\[Документ: (.+?)\]\((.+?)\)/g;
                        const parts = [];
                        let lastIndex = 0;
                        let match;
                        while ((match = linkRegex.exec(textStr)) !== null) {
                          if (match.index > lastIndex) {
                            parts.push(textStr.slice(lastIndex, match.index));
                          }
                          parts.push(
                            <a
                              key={match[2]}
                              href={match[2]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="chat-doc-link-admin"
                            >
                              📎 {match[1]} (скачать)
                            </a>
                          );
                          lastIndex = linkRegex.lastIndex;
                        }
                        if (lastIndex < textStr.length) {
                          parts.push(textStr.slice(lastIndex));
                        }
                        return parts.length > 0 ? parts : textStr;
                      };

                      return (
                        <div
                          key={msg.id}
                          className={`adminMsgItem ${isOwn ? "own" : "partner"}`}
                        >
                          <div className="msgMeta">
                            <b>{msg.sender_full_name}</b>
                            <small>
                              {new Date(msg.created_at).toLocaleString("ru-RU")}
                            </small>
                          </div>
                          <p>{renderMsgText(msg.message)}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendReply} className="adminChatSendForm">
                  <input
                    type="text"
                    placeholder="Напишите ответ администратору клиники..."
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    required
                  />
                  <button type="submit">Ответить</button>
                </form>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingOrg && (
        <div className="adminModalOverlay" onClick={() => setEditingOrg(null)}>
          <div className="adminModalCard" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>Редактирование организации</h3>
              <button
                type="button"
                className="closeModalBtn"
                onClick={() => setEditingOrg(null)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="adminEditForm">
              <label>
                Название медицинской организации
                <input
                  type="text"
                  value={editForm.organization_name || ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      organization_name: e.target.value,
                    }))
                  }
                  required
                />
              </label>

              <div className="formRow">
                <label>
                  Тип организации
                  <select
                    value={editForm.organization_type || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        organization_type: e.target.value,
                        organization_type_label:
                          ORG_TYPES.find((t) => t.value === e.target.value)
                            ?.label || e.target.value,
                      }))
                    }
                    required
                  >
                    {ORG_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  БИН
                  <input
                    type="text"
                    maxLength={12}
                    value={editForm.bin || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        bin: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    required
                  />
                </label>
              </div>

              <div className="formRow">
                <label>
                  Город
                  <input
                    type="text"
                    value={editForm.city || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  Адрес
                  <input
                    type="text"
                    value={editForm.address || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="formSection">
                <h4>Сведения о главном враче</h4>
                <label>
                  ФИО Главврача
                  <input
                    type="text"
                    value={editForm.chief_doctor_full_name || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        chief_doctor_full_name: e.target.value,
                      }))
                    }
                  />
                </label>

                <div className="formRow">
                  <label>
                    Почта Главврача (смена сбросит пароль!)
                    <input
                      type="email"
                      value={editForm.chief_doctor_email || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          chief_doctor_email: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Телефон главврача
                    <input
                      type="text"
                      value={editForm.chief_doctor_phone || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          chief_doctor_phone: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="formSection">
                <h4>Контакты организации (Администратора)</h4>
                <div className="formRow">
                  <label>
                    Почта Администратора (смена сбросит пароль!)
                    <input
                      type="email"
                      value={editForm.organization_email || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          organization_email: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Телефон организации
                    <input
                      type="text"
                      value={editForm.organization_phone || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          organization_phone: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="formRow">
                <label>
                  Статус
                  <select
                    value={editForm.status || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="formInfoNote">
                ⚠️ <b>Внимание:</b> При изменении адресов почты система автоматически сгенерирует новые учетные данные (логин и временный пароль) и отправит их на новый email.
              </div>

              <div className="modalButtonsRow">
                <button
                  type="button"
                  className="adminBtn cancelBtn"
                  onClick={() => setEditingOrg(null)}
                >
                  Отмена
                </button>
                <button type="submit" className="adminBtn saveBtn">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .orgs-layout-grid {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 24px;
          margin-top: 20px;
          align-items: start;
        }
        @media (max-width: 1000px) {
          .orgs-layout-grid {
            grid-template-columns: 1fr;
          }
        }
        .filter-row-inline {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        .adminSearchInput {
          flex: 1;
          background: rgba(2,6,23,.34);
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 12px;
          padding: 10px 14px;
          color: #fff;
          font-weight: 700;
          outline: none;
        }
        .adminFilterSelect {
          background: rgba(2,6,23,.34);
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 12px;
          padding: 10px;
          color: #fff;
          font-weight: 700;
          outline: none;
        }
        .status-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          color: #fff;
          padding: 4px 10px;
          border-radius: 20px;
        }
        .selectable-row {
          cursor: pointer;
          transition: background 0.15s;
        }
        .selectable-row:hover {
          background: rgba(255,255,255,0.03) !important;
        }
        .selected-row {
          background: rgba(16,243,223,0.08) !important;
          border-left: 3px solid #10f3df;
        }
        .action-link-btn {
          background: none;
          border: none;
          color: #10f3df;
          font-weight: 800;
          cursor: pointer;
        }
        .action-link-btn:hover {
          text-decoration: underline;
        }
        .detailsHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(148,163,184,.14);
          padding-bottom: 12px;
        }
        .detailsHeader h3 {
          margin: 0;
        }
        .closeDetailsBtn {
          background: none;
          border: none;
          color: #9fb2c8;
          font-size: 24px;
          cursor: pointer;
        }
        .detailsTable {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .detailsTable td {
          padding: 8px 0;
          font-size: 14px;
          border-bottom: 1px solid rgba(148,163,184,.06);
        }
        .detailsTable td:first-child {
          color: #9fb2c8;
          width: 160px;
          font-weight: 800;
        }
        .detailsTable td:last-child {
          color: #fff;
          font-weight: 700;
        }
        .detailsHr {
          border: 0;
          height: 1px;
          background: rgba(148,163,184,.14);
          margin: 24px 0;
        }
        .editBtn {
          width: 100%;
        }
        
        /* Support Chat in Admin */
        .adminChatSection h4 {
          margin: 0 0 14px;
          font-size: 16px;
        }
        .adminChatMessages {
          background: rgba(2,6,23,.3);
          border: 1px solid rgba(148,163,184,.1);
          border-radius: 16px;
          padding: 16px;
          height: 300px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 14px;
        }
        .adminMsgItem {
          max-width: 80%;
          padding: 10px 14px;
          border-radius: 16px;
          line-height: 1.4;
          font-size: 13px;
        }
        .adminMsgItem.own {
          align-self: flex-end;
          background: #4f46e5;
          color: #fff;
          border-bottom-right-radius: 2px;
        }
        .adminMsgItem.partner {
          align-self: flex-start;
          background: rgba(255,255,255,0.06);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.04);
          border-bottom-left-radius: 2px;
        }
        .msgMeta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 4px;
          font-size: 11px;
        }
        .adminMsgItem.own .msgMeta b { color: #c7d2fe; }
        .adminMsgItem.partner .msgMeta b { color: #10f3df; }
        .msgMeta small { color: #9fb2c8; }
        .adminMsgItem p {
          margin: 0;
          font-weight: 700;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .chat-doc-link-admin {
          display: inline-flex;
          align-items: center;
          margin-top: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 2px 8px;
          font-size: 11px;
          color: #10f3df;
          text-decoration: none;
          font-weight: 850;
        }
        .chat-doc-link-admin:hover {
          background: rgba(16, 243, 223, 0.15);
        }
        .adminChatSendForm {
          display: flex;
          gap: 8px;
        }
        .adminChatSendForm input {
          flex: 1;
          background: rgba(2,6,23,.34);
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 12px;
          padding: 10px 14px;
          color: #fff;
          font-weight: 700;
          outline: none;
        }
        .adminChatSendForm button {
          background: #10f3df;
          border: none;
          border-radius: 12px;
          color: #06202e;
          font-weight: 950;
          padding: 10px 20px;
          cursor: pointer;
        }
        .adminChatSendForm button:hover {
          background: #0dd4c2;
        }

        /* EDIT MODAL */
        .adminModalOverlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(2,6,23,0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .adminModalCard {
          background: #09121f;
          border: 1px solid rgba(148,163,184,.14);
          border-radius: 28px;
          width: 100%;
          max-width: 680px;
          padding: 28px;
          max-height: 90vh;
          overflow-y: auto;
          color: #fff;
        }
        .modalHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid rgba(148,163,184,.14);
          padding-bottom: 12px;
        }
        .modalHeader h3 { margin: 0; }
        .closeModalBtn {
          background: none;
          border: none;
          color: #9fb2c8;
          font-size: 24px;
          cursor: pointer;
        }
        .adminEditForm {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .adminEditForm label {
          display: flex;
          flex-direction: column;
          font-size: 12px;
          color: #9fb2c8;
          font-weight: 800;
          gap: 6px;
        }
        .adminEditForm input,
        .adminEditForm select {
          background: rgba(2,6,23,.5);
          border: 1px solid rgba(148,163,184,.14);
          border-radius: 12px;
          padding: 10px 14px;
          color: #fff;
          font-weight: 700;
          outline: none;
          font-size: 14px;
        }
        .adminEditForm input:focus,
        .adminEditForm select:focus {
          border-color: #10f3df;
        }
        .formRow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 500px) {
          .formRow {
            grid-template-columns: 1fr;
          }
        }
        .formSection {
          border: 1px dashed rgba(148,163,184,.14);
          border-radius: 16px;
          padding: 16px;
          margin-top: 8px;
        }
        .formSection h4 {
          margin: 0 0 12px;
          font-size: 14px;
          color: #10f3df;
        }
        .formInfoNote {
          background: rgba(245,158,11,0.06);
          border: 1px solid rgba(245,158,11,0.15);
          color: #fbbf24;
          padding: 12px;
          border-radius: 12px;
          font-size: 12px;
          line-height: 1.4;
        }
        .modalButtonsRow {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 14px;
        }
        .cancelBtn {
          background: transparent !important;
          border: 1px solid rgba(148,163,184,.2) !important;
          color: #9fb2c8 !important;
        }
        .cancelBtn:hover {
          border-color: #9fb2c8 !important;
        }
        .saveBtn {
          background: #00b85a !important;
          color: #fff !important;
        }
        .saveBtn:hover {
          background: #009e4c !important;
        }
      `}</style>
    </main>
  );
}