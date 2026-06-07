import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../api/adminApi";

const ACTION_LABELS = {
  application_status_changed: "Изменил статус заявки",
  application_assigned: "Назначил заявку",
  organization_updated: "Изменил данные организации",
  channel_message_sent: "Отправил сообщение в канал",
  admin_created: "Создал администратора",
  admin_updated: "Изменил администратора",
  admin_blocked: "Заблокировал администратора",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU");
}

function getActionLabel(action) {
  return ACTION_LABELS[action] || action || "Действие";
}

function getAdminName(log) {
  return (
    log.admin_full_name ||
    log.admin_name ||
    log.admin_username ||
    log.admin_email ||
    log.admin_id ||
    "Админ"
  );
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [activeAction, setActiveAction] = useState("all");
  const [search, setSearch] = useState("");

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
      setError(err.message || "Не удалось загрузить журнал.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const actions = useMemo(() => {
    const unique = Array.from(new Set(logs.map((log) => log.action).filter(Boolean)));

    return [
      { value: "all", label: "Все" },
      ...unique.map((action) => ({
        value: action,
        label: getActionLabel(action),
      })),
    ];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const text = search.trim().toLowerCase();

    return logs.filter((log) => {
      const byAction = activeAction === "all" || log.action === activeAction;

      if (!byAction) return false;

      if (!text) return true;

      const source = [
        log.action,
        log.title,
        log.details,
        log.entity_type,
        log.entity_id,
        getAdminName(log),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return source.includes(text);
    });
  }, [logs, activeAction, search]);

  return (
    <main className="logsPage">
      <section className="logsHead">
        <div>
          <h1>Журнал действий</h1>
          <p>
            История действий главного администратора, обычных админов и системы.
          </p>
        </div>

        <button type="button" onClick={loadLogs} disabled={loading}>
          {loading ? "Загрузка..." : "Обновить"}
        </button>
      </section>

      {error ? <div className="logsError">{error}</div> : null}

      <section className="logsFilters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по журналу..."
        />

        <select
          value={activeAction}
          onChange={(event) => setActiveAction(event.target.value)}
        >
          {actions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </section>

      <section className="logsCard">
        <div className="logsTitle">
          <h2>События</h2>
          <span>{filteredLogs.length} шт.</span>
        </div>

        <div className="logsList">
          {loading ? (
            <div className="emptyLog">Загрузка журнала...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="emptyLog">Записей пока нет.</div>
          ) : (
            filteredLogs.map((log) => (
              <article key={log.id || `${log.action}-${log.created_at}`} className="logItem">
                <div className="logTop">
                  <div>
                    <strong>{getAdminName(log)}</strong>
                    <span>{getActionLabel(log.action)}</span>
                  </div>

                  <time>{formatDate(log.created_at)}</time>
                </div>

                <h3>{log.title || getActionLabel(log.action)}</h3>

                {log.details ? <p>{log.details}</p> : null}

                <div className="logMeta">
                  <span>{log.entity_type || "—"}</span>
                  <span>{log.entity_id || "—"}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <style>{`
        .logsPage {
          min-height: 100vh;
          padding: 40px;
          color: #fff;
        }

        .logsHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
        }

        .logsHead h1 {
          margin: 0 0 10px;
          font-size: 42px;
          font-weight: 950;
        }

        .logsHead p {
          margin: 0;
          color: #9fb2c8;
          line-height: 1.6;
        }

        .logsHead button {
          border: 0;
          border-radius: 14px;
          background: #10f3df;
          color: #06202e;
          padding: 12px 18px;
          font-weight: 950;
          cursor: pointer;
        }

        .logsError {
          margin-bottom: 18px;
          padding: 16px;
          border-radius: 16px;
          color: #fecaca;
          background: rgba(127, 29, 29, 0.38);
          border: 1px solid rgba(248, 113, 113, 0.4);
          font-weight: 800;
        }

        .logsFilters {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 14px;
          margin-bottom: 20px;
        }

        .logsFilters input,
        .logsFilters select {
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(15, 23, 42, 0.72);
          color: #fff;
          border-radius: 16px;
          padding: 14px;
          outline: none;
        }

        .logsCard {
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 26px;
          padding: 20px;
        }

        .logsTitle {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 16px;
        }

        .logsTitle h2 {
          margin: 0;
        }

        .logsTitle span {
          color: #22d3ee;
          font-weight: 950;
        }

        .logsList {
          display: grid;
          gap: 12px;
        }

        .logItem {
          background: rgba(2, 6, 23, 0.34);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 18px;
          padding: 16px;
        }

        .logTop {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 12px;
        }

        .logTop strong {
          display: block;
          margin-bottom: 4px;
        }

        .logTop span {
          color: #22d3ee;
          font-size: 13px;
          font-weight: 900;
        }

        .logTop time {
          color: #64748b;
          font-size: 13px;
          white-space: nowrap;
        }

        .logItem h3 {
          margin: 0 0 8px;
          font-size: 17px;
        }

        .logItem p {
          margin: 0 0 12px;
          color: #cbd5e1;
          line-height: 1.6;
        }

        .logMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .logMeta span {
          border-radius: 999px;
          padding: 6px 10px;
          background: rgba(15, 23, 42, 0.72);
          color: #9fb2c8;
          font-size: 12px;
          font-weight: 800;
        }

        .emptyLog {
          padding: 28px 16px;
          color: #9fb2c8;
          font-weight: 800;
        }

        @media (max-width: 760px) {
          .logsPage {
            padding: 20px 14px;
          }

          .logsHead {
            display: block;
          }

          .logsHead h1 {
            font-size: 32px;
          }

          .logsHead button {
            margin-top: 16px;
          }

          .logsFilters {
            grid-template-columns: 1fr;
          }

          .logTop {
            display: block;
          }

          .logTop time {
            display: block;
            margin-top: 8px;
          }
        }
      `}</style>
    </main>
  );
}