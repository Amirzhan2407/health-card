import { useEffect, useState } from "react";
import { adminRequest, getAdminData } from "../api/adminApi";

const CHANNEL_LABELS = {
  state_polyclinic: "Канал государственных поликлиник",
  state_hospital: "Канал государственных больниц",
  private_clinic: "Канал частных клиник",
};

export default function AdminChannels() {
  const adminData = getAdminData();

  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");

  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function loadChannels() {
    setLoading(true);
    setError("");

    try {
      const result = await adminRequest("/api/admin-channels");
      const list = result.channels || [];

      setChannels(list);

      if (list.length > 0 && !activeChannel) {
        setActiveChannel(list[0]);
        await loadMessages(list[0].category);
      }
    } catch (err) {
      setChannels([]);
      setError(err.message || "Не удалось загрузить каналы.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(category) {
    if (!category) return;

    setMessagesLoading(true);
    setError("");

    try {
      const result = await adminRequest(
        `/api/admin-channels/${category}/messages`
      );

      setMessages(result.messages || []);
    } catch (err) {
      setMessages([]);
      setError(err.message || "Не удалось загрузить сообщения.");
    } finally {
      setMessagesLoading(false);
    }
  }

  async function sendMessage() {
    if (!activeChannel?.category) {
      setError("Сначала выберите канал.");
      return;
    }

    if (!messageText.trim()) {
      setError("Сообщение не может быть пустым.");
      return;
    }

    setSending(true);
    setError("");

    try {
      await adminRequest(`/api/admin-channels/${activeChannel.category}/messages`, {
        method: "POST",
        body: JSON.stringify({
          message: messageText,
        }),
      });

      setMessageText("");
      await loadMessages(activeChannel.category);
    } catch (err) {
      setError(err.message || "Не удалось отправить сообщение.");
    } finally {
      setSending(false);
    }
  }

  function selectChannel(channel) {
    setActiveChannel(channel);
    loadMessages(channel.category);
  }

  function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleString("ru-RU");
  }

  function senderName(item) {
    return (
      item.sender_name ||
      item.admin_name ||
      item.sender_full_name ||
      item.sender_admin_name ||
      item.sender_admin_id ||
      "Админ"
    );
  }

  useEffect(() => {
    loadChannels();
  }, []);

  return (
    <main className="channelsPage">
      <section className="channelsHead">
        <div>
          <h1>Каналы</h1>
          <p>
            Общие каналы для главного админа и обычных админов по категориям
            организаций.
          </p>
        </div>

        <button type="button" onClick={loadChannels} disabled={loading}>
          {loading ? "Загрузка..." : "Обновить"}
        </button>
      </section>

      {error ? <div className="channelsError">{error}</div> : null}

      <section className="channelsGrid">
        <aside className="channelsList">
          <h2>Список каналов</h2>

          {channels.length === 0 ? (
            <p className="emptyText">Каналы пока не найдены.</p>
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

        <section className="chatCard">
          {!activeChannel ? (
            <div className="chatEmpty">
              <h2>Канал не выбран</h2>
              <p>Выберите канал слева.</p>
            </div>
          ) : (
            <>
              <div className="chatTop">
                <div>
                  <h2>
                    {activeChannel.title ||
                      CHANNEL_LABELS[activeChannel.category] ||
                      "Канал"}
                  </h2>
                  <p>{activeChannel.description || "Общий чат админов"}</p>
                </div>

                <button
                  type="button"
                  onClick={() => loadMessages(activeChannel.category)}
                  disabled={messagesLoading}
                >
                  {messagesLoading ? "..." : "Обновить"}
                </button>
              </div>

              <div className="messagesBox">
                {messagesLoading ? (
                  <p className="emptyText">Загрузка сообщений...</p>
                ) : messages.length === 0 ? (
                  <p className="emptyText">Сообщений пока нет.</p>
                ) : (
                  messages.map((item) => {
                    const isMine = item.sender_admin_id === adminData?.id;

                    return (
                      <div
                        key={item.id || item.created_at}
                        className={isMine ? "messageItem mine" : "messageItem"}
                      >
                        <div className="messageMeta">
                          <strong>{isMine ? "Вы" : senderName(item)}</strong>
                          <span>{formatDate(item.created_at)}</span>
                        </div>

                        <p>{item.message}</p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="sendBox">
                <textarea
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="Напишите сообщение в канал..."
                />

                <button type="button" onClick={sendMessage} disabled={sending}>
                  {sending ? "Отправка..." : "Отправить"}
                </button>
              </div>
            </>
          )}
        </section>
      </section>

      <style>{`
        .channelsPage {
          min-height: 100vh;
          padding: 40px;
          color: #fff;
        }

        .channelsHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
        }

        .channelsHead h1 {
          margin: 0 0 10px;
          font-size: 42px;
          font-weight: 950;
        }

        .channelsHead p {
          margin: 0;
          color: #9fb2c8;
          line-height: 1.6;
        }

        .channelsHead button,
        .chatTop button,
        .sendBox button {
          border: 0;
          border-radius: 14px;
          background: #10f3df;
          color: #06202e;
          padding: 12px 18px;
          font-weight: 950;
          cursor: pointer;
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

        .channelsGrid {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          gap: 22px;
          align-items: start;
        }

        .channelsList,
        .chatCard {
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 26px;
          padding: 20px;
        }

        .channelsList h2 {
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

        .channelsList strong {
          display: block;
          margin-bottom: 6px;
        }

        .channelsList span,
        .chatTop p,
        .emptyText {
          color: #9fb2c8;
        }

        .chatTop {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 18px;
        }

        .chatTop h2 {
          margin: 0 0 6px;
        }

        .chatTop p {
          margin: 0;
        }

        .messagesBox {
          height: 500px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-right: 8px;
          margin-bottom: 16px;
        }

        .messageItem {
          max-width: 78%;
          background: rgba(2, 6, 23, 0.42);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 18px;
          padding: 14px;
        }

        .messageItem.mine {
          align-self: flex-end;
          background: rgba(16, 243, 223, 0.12);
          border-color: rgba(16, 243, 223, 0.25);
        }

        .messageMeta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }

        .messageMeta span {
          color: #64748b;
          font-size: 12px;
        }

        .messageItem p {
          margin: 0;
          color: #dbeafe;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .sendBox {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
        }

        .sendBox textarea {
          min-height: 74px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(2, 6, 23, 0.5);
          color: #fff;
          border-radius: 16px;
          padding: 14px;
          resize: vertical;
          outline: none;
        }

        .chatEmpty {
          min-height: 420px;
          display: grid;
          place-content: center;
          text-align: center;
          color: #9fb2c8;
        }

        @media (max-width: 1000px) {
          .channelsGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .channelsPage {
            padding: 20px 14px;
          }

          .channelsHead,
          .chatTop {
            display: block;
          }

          .channelsHead h1 {
            font-size: 32px;
          }

          .channelsHead button,
          .chatTop button {
            margin-top: 16px;
          }

          .sendBox {
            grid-template-columns: 1fr;
          }

          .messageItem {
            max-width: 100%;
          }
        }
      `}</style>
    </main>
  );
}