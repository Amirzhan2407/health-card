import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../api/adminApi";

const ACTION_LABELS = {
  admin_login_success: "Вход в систему",
  admin_login_failed: "Неудачная попытка входа",
  admin_created: "Создал администратора",
  admin_updated: "Изменил администратора",
  admin_blocked: "Заблокировал администратора",
  admin_unblocked: "Разблокировал администратора",

  application_status_changed: "Изменил статус заявки",
  application_assigned: "Назначил заявку",
  application_created: "Создана заявка",
  application_approved: "Одобрил заявку",
  application_rejected: "Отклонил заявку",

  organization_created: "Создал организацию",
  organization_updated: "Изменил данные организации",
  organization_blocked: "Заблокировал организацию",

  channel_message_sent: "Отправил сообщение в канал",
};

const ACTION_GROUPS = [
  { value: "all", label: "Все действия" },
  { value: "auth", label: "Авторизация" },
  { value: "applications", label: "Заявки" },
  { value: "organizations", label: "Организации" },
  { value: "admins", label: "Админы" },
  { value: "channels", label: "Каналы" },
];

function safeText(value, empty = "—") {
  if (value === null || value === undefined || value === "") return empty;

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return empty;
    }
  }

  return String(value);
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
    return "—";
  }
}

function getActionLabel(action) {
  return ACTION_LABELS[action] || action || "Действие";
}

function getAdminName(log) {
  return (
    log.admin_full_name ||
    log.admin_name ||
    log.admin_username ||
    log.username ||
    log.email ||
    log.admin_email ||
    log.admin_id ||
    "Система"
  );
}

function getActionGroup(action, entityType) {
  const value = `${action || ""} ${entityType || ""}`.toLowerCase();

  if (value.includes("login") || value.includes("auth")) return "auth";
  if (value.includes("application")) return "applications";
  if (value.includes("organization")) return "organizations";
  if (value.includes("admin")) return "admins";
  if (value.includes("channel")) return "channels";

  return "other";
}

function getReadableDetails(log) {
  if (log.details) return safeText(log.details);

  const data = log.new_data || log.old_data;

  if (!data) return "Подробности не указаны.";

  if (typeof data === "string") return data;

  if (data.username) return `Пользователь: ${data.username}`;
  if (data.organization_name) return `Организация: ${data.organization_name}`;
  if (data.application_number) return `Заявка: ${data.application_number}`;
  if (data.status) return `Статус: ${data.status}`;

  return safeText(data);
}

function getEntityLabel(log) {
  const entityType = log.entity_type;

  if (entityType === "organization_application") return "Заявка";
  if (entityType === "organization") return "Организация";
  if (entityType === "admin") return "Админ";
  if (entityType === "admin_channel") return "Канал";

  return entityType || "Событие";
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadLogs() {
    setLoading(true);
    setError("");

    try {
      const result = await adminRequest("/api/audit-logs");
      setLogs(result.logs || []);
    } catch (err) {
      setLogs([]);
      setError(err.message || "Не удалось загрузить журнал действий.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return logs.filter((log) => {
      const logGroup = getActionGroup(log.action, log.entity_type);

      if (group !== "all" && logGroup !== group) {
        return false;
      }

      if (!q) return true;

      const source = [
        getAdminName(log),
        getActionLabel(log.action),
        log.action,
        log.title,
        log.details,
        log.entity_type,
        log.entity_id,
        safeText(log.old_data, ""),
        safeText(log.new_data, ""),
      ]
        .join(" ")
        .toLowerCase();

      return source.includes(q);
    });
  }, [logs, search, group]);

  return (
    <main className="auditPage">
      <section className="auditHead">
        <div>
          <h1>Журнал действий</h1>
          <p>
            История входов, изменений заявок, организаций, админов и сообщений в
            каналах.
          </p>
        </div>

        <button type="button" onClick={loadLogs} disabled={loading}>
          {loading ? "Загрузка..." : "Обновить"}
        </button>
      </section>

      {error ? <div className="auditError">{error}</div> : null}

      <section className="auditStats">
        <div>
          <span>Всего событий</span>
          <b>{logs.length}</b>
        </div>

        <div>
          <span>Показано</span>
          <b>{filteredLogs.length}</b>
        </div>

        <div>
          <span>Последнее событие</span>
          <b>{logs[0]?.created_at ? formatDate(logs[0].created_at) : "—"}</b>
        </div>
      </section>

      <section className="auditFilters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по админу, заявке, организации или действию..."
        />

        <select
          value={group}
          onChange={(event) => setGroup(event.target.value)}
        >
          {ACTION_GROUPS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </section>

      <section className="auditCard">
        <div className="auditCardTop">
          <h2>События</h2>
          <span>{filteredLogs.length} шт.</span>
        </div>

        <div className="auditList">
          {loading ? (
            <div className="auditEmpty">Загрузка журнала...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="auditEmpty">Записей пока нет.</div>
          ) : (
            filteredLogs.map((log) => (
              <article
                key={log.id || `${log.action}-${log.created_at}-${log.entity_id}`}
                className="auditItem"
              >
                <div className="auditItemTop">
                  <div>
                    <strong>{safeText(getAdminName(log))}</strong>
                    <span>{getActionLabel(log.action)}</span>
                  </div>

                  <time>{formatDate(log.created_at)}</time>
                </div>

                <div className="auditInfo">
                  <div>
                    <small>Действие</small>
                    <b>{getActionLabel(log.action)}</b>
                  </div>

                  <div>
                    <small>Объект</small>
                    <b>{getEntityLabel(log)}</b>
                  </div>

                  <div>
                    <small>ID объекта</small>
                    <b>{safeText(log.entity_id)}</b>
                  </div>
                </div>

                <div className="auditDetails">
                  <small>Подробности</small>
                  <p>{getReadableDetails(log)}</p>
                </div>

                {(log.old_data || log.new_data) && (
                  <details className="auditRaw">
                    <summary>Показать технические данные</summary>

                    {log.old_data ? (
                      <>
                        <b>Было:</b>
                        <pre>{safeText(log.old_data)}</pre>
                      </>
                    ) : null}

                    {log.new_data ? (
                      <>
                        <b>Стало:</b>
                        <pre>{safeText(log.new_data)}</pre>
                      </>
                    ) : null}
                  </details>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      <style>{`
        .auditPage {
          min-height: 100vh;
          padding: 40px;
          color: #ffffff;
        }

        .auditHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
        }

        .auditHead h1 {
          margin: 0 0 10px;
          font-size: 42px;
          line-height: 1.05;
          font-weight: 950;
        }

        .auditHead p {
          margin: 0;
          color: #9fb2c8;
          line-height: 1.6;
        }

        .auditHead button {
          border: 0;
          border-radius: 14px;
          background: #10f3df;
          color: #06202e;
          padding: 12px 18px;
          font-weight: 950;
          cursor: pointer;
        }

        .auditError {
          margin-bottom: 18px;
          border: 1px solid rgba(248, 113, 113, 0.4);
          background: rgba(127, 29, 29, 0.38);
          color: #fecaca;
          padding: 16px;
          border-radius: 16px;
          font-weight: 800;
        }

        .auditStats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .auditStats div {
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 20px;
          padding: 16px;
        }

        .auditStats span {
          display: block;
          color: #9fb2c8;
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .auditStats b {
          font-size: 20px;
          color: #10f3df;
        }

        .auditFilters {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 260px;
          gap: 14px;
          margin-bottom: 20px;
        }

        .auditFilters input,
        .auditFilters select {
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(15, 23, 42, 0.72);
          color: #ffffff;
          border-radius: 16px;
          padding: 14px;
          outline: none;
        }

        .auditCard {
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 26px;
          padding: 20px;
        }

        .auditCardTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .auditCardTop h2 {
          margin: 0;
        }

        .auditCardTop span {
          color: #22d3ee;
          font-weight: 950;
        }

        .auditList {
          display: grid;
          gap: 14px;
        }

        .auditItem {
          background: rgba(2, 6, 23, 0.34);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 20px;
          padding: 18px;
        }

        .auditItemTop {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .auditItemTop strong {
          display: block;
          margin-bottom: 5px;
          font-size: 16px;
        }

        .auditItemTop span {
          color: #10f3df;
          font-weight: 950;
          font-size: 13px;
        }

        .auditItemTop time {
          color: #8aa0b8;
          font-size: 13px;
          white-space: nowrap;
        }

        .auditInfo {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 14px;
        }

        .auditInfo div {
          background: rgba(15, 23, 42, 0.72);
          border-radius: 14px;
          padding: 12px;
          min-width: 0;
        }

        .auditInfo small,
        .auditDetails small {
          display: block;
          color: #8aa0b8;
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .auditInfo b {
          overflow-wrap: anywhere;
        }

        .auditDetails {
          background: rgba(15, 23, 42, 0.48);
          border-radius: 14px;
          padding: 12px;
        }

        .auditDetails p {
          margin: 0;
          color: #dbeafe;
          line-height: 1.6;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .auditRaw {
          margin-top: 12px;
          color: #9fb2c8;
        }

        .auditRaw summary {
          cursor: pointer;
          color: #22d3ee;
          font-weight: 900;
        }

        .auditRaw pre {
          max-height: 220px;
          overflow: auto;
          background: rgba(2, 6, 23, 0.8);
          border-radius: 12px;
          padding: 12px;
          color: #cbd5e1;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .auditEmpty {
          padding: 28px 16px;
          color: #9fb2c8;
          font-weight: 800;
        }

        @media (max-width: 900px) {
          .auditStats,
          .auditInfo,
          .auditFilters {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .auditPage {
            padding: 20px 14px;
          }

          .auditHead,
          .auditItemTop {
            display: block;
          }

          .auditHead h1 {
            font-size: 32px;
          }

          .auditHead button {
            margin-top: 16px;
          }

          .auditItemTop time {
            display: block;
            margin-top: 8px;
          }
        }
      `}</style>
    </main>
  );
}