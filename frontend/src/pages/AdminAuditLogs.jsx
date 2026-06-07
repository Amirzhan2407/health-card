import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../api/adminApi";

function text(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU");
}

const ACTION_LABELS = {
  application_status_changed: "Изменил статус заявки",
  application_assigned: "Назначил заявку",
  organization_updated: "Изменил организацию",
  channel_message_sent: "Сообщение в канал",
};

function actionLabel(action) {
  return ACTION_LABELS[action] || text(action);
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function loadLogs() {
    setError("");

    try {
      const result = await adminRequest("/api/audit-logs");
      setLogs(result.logs || []);
    } catch (err) {
      setLogs([]);
      setError(err.message || "Не удалось загрузить журнал.");
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return logs;

    return logs.filter((log) => {
      const source = [
        log.action,
        log.title,
        log.details,
        log.entity_type,
        log.entity_id,
        log.admin_id,
      ]
        .map(text)
        .join(" ")
        .toLowerCase();

      return source.includes(q);
    });
  }, [logs, search]);

  return (
    <main className="adminContentPage">
      <section className="adminPageHead">
        <div>
          <h1>Журнал действий</h1>
          <p>История действий главного админа и обычных админов.</p>
        </div>

        <button type="button" onClick={loadLogs}>
          Обновить
        </button>
      </section>

      {error ? <div className="adminError">{error}</div> : null}

      <section className="adminCard">
        <div className="cardTop">
          <h2>События</h2>
          <span>{filteredLogs.length} шт.</span>
        </div>

        <input
          className="adminSearch"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по журналу..."
        />

        <div className="logList">
          {filteredLogs.length === 0 ? (
            <div className="emptyRow">Записей пока нет</div>
          ) : (
            filteredLogs.map((log) => (
              <article key={log.id || `${log.action}-${log.created_at}`} className="logItem">
                <div className="logTop">
                  <div>
                    <b>{text(log.admin_full_name || log.admin_id || "Админ")}</b>
                    <span>{actionLabel(log.action)}</span>
                  </div>

                  <time>{formatDate(log.created_at)}</time>
                </div>

                <h3>{text(log.title || actionLabel(log.action))}</h3>

                {log.details ? <p>{text(log.details)}</p> : null}

                <div className="logMeta">
                  <span>{text(log.entity_type)}</span>
                  <span>{text(log.entity_id)}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}