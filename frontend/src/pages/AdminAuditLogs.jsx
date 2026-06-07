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

const STATUS_LABELS = {
  new: "Новая",
  assigned: "Назначена",
  in_progress: "В процессе",
  needs_fix: "Требует исправления",
  resent: "Отправлена повторно",
  waiting_eds: "Ожидает ЭЦП",
  approved: "Одобрена",
  rejected: "Отклонена",
  active: "Открыта",
  blocked: "Заблокирована",
};

const ENTITY_LABELS = {
  organization_application: "Заявка",
  organization: "Организация",
  admin: "Администратор",
  admin_channel: "Канал",
};

const GROUPS = [
  { value: "all", label: "Все" },
  { value: "auth", label: "Входы" },
  { value: "applications", label: "Заявки" },
  { value: "organizations", label: "Организации" },
  { value: "admins", label: "Админы" },
  { value: "channels", label: "Каналы" },
];

function safeText(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;

  if (typeof value === "object") {
    return fallback;
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

function actionLabel(action) {
  return ACTION_LABELS[action] || action || "Действие";
}

function entityLabel(entityType) {
  return ENTITY_LABELS[entityType] || entityType || "Событие";
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || "—";
}

function groupByAction(action = "", entityType = "") {
  const value = `${action} ${entityType}`.toLowerCase();

  if (value.includes("login") || value.includes("auth")) return "auth";
  if (value.includes("application")) return "applications";
  if (value.includes("organization")) return "organizations";
  if (value.includes("admin")) return "admins";
  if (value.includes("channel")) return "channels";

  return "other";
}

function getAdminName(log) {
  return (
    log.admin_full_name ||
    log.admin_name ||
    log.admin_username ||
    log.username ||
    log.email ||
    log.admin_email ||
    "Администратор"
  );
}

function getOldData(log) {
  if (log.old_data && typeof log.old_data === "object") return log.old_data;
  return {};
}

function getNewData(log) {
  if (log.new_data && typeof log.new_data === "object") return log.new_data;
  return {};
}

function getObjectName(log) {
  const oldData = getOldData(log);
  const newData = getNewData(log);

  return (
    newData.application_number ||
    oldData.application_number ||
    newData.organization_name ||
    oldData.organization_name ||
    newData.title ||
    oldData.title ||
    safeText(log.title, "")
  );
}

function getReadableDetails(log) {
  const oldData = getOldData(log);
  const newData = getNewData(log);

  if (log.action === "admin_login_success") {
    const username = newData.username || oldData.username || log.username;
    return username
      ? `Администратор вошёл в систему. Логин: ${username}`
      : "Администратор вошёл в систему.";
  }

  if (log.action === "admin_login_failed") {
    const username = newData.username || oldData.username || log.username;
    return username
      ? `Неудачная попытка входа. Логин: ${username}`
      : "Неудачная попытка входа.";
  }

  if (log.action === "application_status_changed") {
    const oldStatus = oldData.status || log.old_status;
    const newStatus = newData.status || log.new_status;

    if (oldStatus || newStatus) {
      return `${statusLabel(oldStatus)} → ${statusLabel(newStatus)}`;
    }

    if (log.details) {
      return safeText(log.details);
    }

    return "Статус заявки был изменён.";
  }

  if (log.action === "application_assigned") {
    return "Заявка назначена ответственному администратору.";
  }

  if (log.action === "organization_updated") {
    const name = newData.organization_name || oldData.organization_name;
    return name
      ? `Изменены данные организации: ${name}`
      : "Изменены данные организации.";
  }

  if (log.action === "channel_message_sent") {
    return "Администратор отправил сообщение в канал.";
  }

  if (log.details) {
    return safeText(log.details);
  }

  return "Действие выполнено.";
}

function getShortEntity(log) {
  const oldData = getOldData(log);
  const newData = getNewData(log);

  if (log.entity_type === "organization_application") {
    return (
      newData.application_number ||
      oldData.application_number ||
      "Заявка"
    );
  }

  if (log.entity_type === "organization") {
    return (
      newData.organization_name ||
      oldData.organization_name ||
      "Организация"
    );
  }

  if (log.entity_type === "admin") {
    return (
      newData.full_name ||
      oldData.full_name ||
      newData.username ||
      oldData.username ||
      "Администратор"
    );
  }

  if (log.entity_type === "admin_channel") {
    return newData.title || oldData.title || "Канал";
  }

  return getObjectName(log) || entityLabel(log.entity_type);
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
      const currentGroup = groupByAction(log.action, log.entity_type);

      if (group !== "all" && currentGroup !== group) {
        return false;
      }

      if (!q) return true;

      const oldData = getOldData(log);
      const newData = getNewData(log);

      const source = [
        getAdminName(log),
        actionLabel(log.action),
        getReadableDetails(log),
        getShortEntity(log),
        oldData.application_number,
        newData.application_number,
        oldData.organization_name,
        newData.organization_name,
        oldData.username,
        newData.username,
      ]
        .filter(Boolean)
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
            Понятная история действий: входы, заявки, организации, админы и
            сообщения.
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
          placeholder="Поиск по админу, заявке, организации..."
        />

        <select value={group} onChange={(event) => setGroup(event.target.value)}>
          {GROUPS.map((item) => (
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

        <div className="auditTable">
          <div className="auditRow auditRowHead">
            <span>Админ</span>
            <span>Действие</span>
            <span>Объект</span>
            <span>Подробности</span>
            <span>Дата</span>
          </div>

          {loading ? (
            <div className="auditEmpty">Загрузка журнала...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="auditEmpty">Записей пока нет.</div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id || `${log.action}-${log.created_at}-${log.entity_id}`}
                className="auditRow"
              >
                <span>
                  <b>{safeText(getAdminName(log))}</b>
                </span>

                <span>
                  <strong className={`actionBadge ${groupByAction(log.action, log.entity_type)}`}>
                    {actionLabel(log.action)}
                  </strong>
                </span>

                <span>
                  <b>{safeText(getShortEntity(log))}</b>
                  <small>{entityLabel(log.entity_type)}</small>
                </span>

                <span>{getReadableDetails(log)}</span>

                <span>
                  <time>{formatDate(log.created_at)}</time>
                </span>
              </div>
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

        .auditTable {
          overflow-x: auto;
        }

        .auditRow {
          min-width: 1050px;
          display: grid;
          grid-template-columns: 210px 220px 220px minmax(260px, 1fr) 150px;
          gap: 14px;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          color: #dbeafe;
        }

        .auditRowHead {
          background: rgba(30, 41, 59, 0.72);
          border-radius: 16px;
          color: #9fb2c8;
          font-weight: 950;
        }

        .auditRow span {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .auditRow small {
          display: block;
          color: #8aa0b8;
          margin-top: 4px;
          font-size: 12px;
        }

        .auditRow time {
          color: #9fb2c8;
          font-size: 13px;
        }

        .actionBadge {
          display: inline-flex;
          border-radius: 999px;
          padding: 8px 11px;
          font-size: 12px;
          font-weight: 950;
          background: rgba(34, 211, 238, 0.13);
          color: #67e8f9;
        }

        .actionBadge.auth {
          background: rgba(59, 130, 246, 0.16);
          color: #bfdbfe;
        }

        .actionBadge.applications {
          background: rgba(245, 158, 11, 0.16);
          color: #fde68a;
        }

        .actionBadge.organizations {
          background: rgba(34, 197, 94, 0.16);
          color: #86efac;
        }

        .actionBadge.admins {
          background: rgba(168, 85, 247, 0.16);
          color: #e9d5ff;
        }

        .actionBadge.channels {
          background: rgba(20, 184, 166, 0.16);
          color: #99f6e4;
        }

        .auditEmpty {
          padding: 28px 16px;
          color: #9fb2c8;
          font-weight: 800;
        }

        @media (max-width: 900px) {
          .auditStats,
          .auditFilters {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .auditPage {
            padding: 20px 14px;
          }

          .auditHead {
            display: block;
          }

          .auditHead h1 {
            font-size: 32px;
          }

          .auditHead button {
            margin-top: 16px;
          }

          .auditRow,
          .auditRowHead {
            min-width: 0;
            grid-template-columns: 1fr;
          }

          .auditRowHead {
            display: none;
          }

          .auditRow {
            background: rgba(2, 6, 23, 0.34);
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-radius: 18px;
            margin-bottom: 12px;
          }
        }
      `}</style>
    </main>
  );
}