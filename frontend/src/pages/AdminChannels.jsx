import { useEffect, useMemo, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "https://health-card.onrender.com";

const CHANNEL_LABELS = {
  state_polyclinic: "Канал государственных поликлиник",
  state_hospital: "Канал государственных больниц",
  private_clinic: "Канал частных клиник",
};

function getToken() {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

export default function AdminChannels() {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = useMemo(() => getToken(), []);

  async function apiFetch(path, options = {}) {
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
      throw new Error(
        result?.message || result?.error || `Ошибка запроса: ${response.status}`
      );
    }

    return result;
  }

  async function loadChannels() {
    setError("");

    try {
      const result = await apiFetch("/api/admin-channels");
      const list = result.channels || result.data || [];
      setChannels(Array.isArray(list) ? list : []);

      if (!activeChannel && list?.length) {
        setActiveChannel(list[0]);
        loadMessages(list[0].category);
      }
    } catch (err) {
      setError(err.message || "Не удалось загрузить каналы.");
    }
  }

  async function loadMessages(category) {
    if (!category) return;

    setError("");

    try {
      const result = await apiFetch(`/api/admin-channels/${category}/messages`);
      setMessages(result.messages || []);
    } catch (err) {
      setError(err.message || "Не удалось загрузить сообщения.");
      setMessages([]);
    }
  }

  async function sendMessage() {
    if (!activeChannel?.category || !message.trim()) return;

    setError("");

    try {
      await apiFetch(`/api/admin-channels/${activeChannel.category}/messages`, {
        method: "POST",
        body: JSON.stringify({
          message,
        }),
      });

      setMessage("");
      await loadMessages(activeChannel.category);
    } catch (err) {
      setError(err.message || "Не удалось отправить сообщение.");
    }
  }

  function selectChannel(channel) {
    setActiveChannel(channel);
    loadMessages(channel.category);
  }

  useEffect(() => {
    loadChannels();
  }, []);

  return (
    <main className="adminChannelsPage">
      <div className="channelsHead">
        <h1>Каналы</h1>
        <p>
          Общие каналы для главного админа и обычных админов по категориям
          организаций.
        </p>
      </div>

      {error ? <div className="channelsError">{error}</div> : null}

      <section className="channelsLayout">
        <aside className="channelsList">
          <h2>Список каналов</h2>

          {channels.length === 0 ? (
            <p className="emptyText">Каналы не найдены</p>
          ) : (
            channels.map((channel) => (
              <button
                key={channel.id || channel.category}
                type="button"
                className={
                  activeChannel?.category === channel.category ? "active" : ""
                }
                onClick={() => selectChannel(channel)}
              >
                <strong>
                  {channel.title ||
                    CHANNEL_LABELS[channel.category] ||
                    channel.category}
                </strong>
                <span>{channel.description || "Общий канал"}</span>
              </button>
            ))
          )}
        </aside>

        <section className="channelChat">
          {!activeChannel ? (
            <div className="chatPlaceholder">
              <h2>Выберите канал</h2>
              <p>После выбора канала здесь появятся сообщения.</p>
            </div>
          ) : (
            <>
              <div className="chatHeader">
                <h2>
                  {activeChannel.title ||
                    CHANNEL_LABELS[activeChannel.category] ||
                    "Канал"}
                </h2>
                <button
                  type="button"
                  onClick={() => loadMessages(activeChannel.category)}
                >
                  Обновить
                </button>
              </div>

              <div className="messagesBox">
                {messages.length === 0 ? (
                  <p className="emptyText">Сообщений пока нет</p>
                ) : (
                  messages.map((item) => (
                    <div key={item.id || item.created_at} className="messageItem">
                      <strong>{item.sender_admin_id || "Админ"}</strong>
                      <p>{item.message}</p>
                      <small>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString("ru-RU")
                          : ""}
                      </small>
                    </div>
                  ))
                )}
              </div>

              <div className="sendBox">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Напишите сообщение в канал..."
                />

                <button type="button" onClick={sendMessage}>
                  Отправить
                </button>
              </div>
            </>
          )}
        </section>
      </section>

      <style>{`
        .adminChannelsPage {
          min-height: 100vh;
          padding: 40px;
          color: #fff;
        }

        .channelsHead h1 {
          margin: 0 0 10px;
          font-size: 42px;
          font-weight: 950;
        }

        .channelsHead p {
          margin: 0 0 24px;
          color: #9fb2c8;
        }

        .channelsError {
          margin-bottom: 18px;
          padding: 16px;
          border-radius: 16px;
          color: #fecaca;
          background: rgba(127, 29, 29, 0.38);
          border: 1px solid rgba(248, 113, 113, 0.4);
          font-weight: 800;
        }

        .channelsLayout {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 22px;
        }

        .channelsList,
        .channelChat {
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 26px;
          padding: 20px;
        }

        .channelsList h2,
        .chatHeader h2 {
          margin: 0 0 16px;
        }

        .channelsList {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .channelsList button {
          text-align: left;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(2, 6, 23, 0.34);
          color: #fff;
          border-radius: 18px;
          padding: 16px;
          cursor: pointer;
        }

        .channelsList button.active {
          border-color: #10f3df;
          background: rgba(16, 243, 223, 0.12);
        }

        .channelsList button strong {
          display: block;
          margin-bottom: 6px;
        }

        .channelsList button span {
          color: #9fb2c8;
          font-size: 13px;
        }

        .chatHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .chatHeader button,
        .sendBox button {
          border: 0;
          border-radius: 14px;
          background: #10f3df;
          color: #06202e;
          font-weight: 950;
          padding: 12px 16px;
          cursor: pointer;
        }

        .messagesBox {
          height: 460px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-right: 8px;
          margin-bottom: 16px;
        }

        .messageItem {
          background: rgba(2, 6, 23, 0.34);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 16px;
          padding: 14px;
        }

        .messageItem p {
          margin: 8px 0;
          color: #dbeafe;
          line-height: 1.5;
        }

        .messageItem small,
        .emptyText {
          color: #8aa0b8;
        }

        .sendBox {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
        }

        .sendBox textarea {
          min-height: 70px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(2, 6, 23, 0.5);
          color: #fff;
          border-radius: 16px;
          padding: 14px;
          resize: vertical;
          outline: none;
        }

        .chatPlaceholder {
          min-height: 420px;
          display: grid;
          place-content: center;
          text-align: center;
          color: #9fb2c8;
        }

        @media (max-width: 900px) {
          .adminChannelsPage {
            padding: 20px 14px;
          }

          .channelsLayout {
            grid-template-columns: 1fr;
          }

          .sendBox {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}