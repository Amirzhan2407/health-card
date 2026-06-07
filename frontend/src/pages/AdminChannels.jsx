import { useEffect, useState } from "react";
import { adminRequest, getAdminData } from "../api/adminApi";

function text(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("ru-RU");
}

export default function AdminChannels() {
  const adminData = getAdminData();

  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadChannels() {
    setError("");

    try {
      const result = await adminRequest("/api/admin-channels");
      const list = result.channels || [];
      setChannels(list);

      if (list.length > 0) {
        setActiveChannel(list[0]);
        await loadMessages(list[0].category);
      }
    } catch (err) {
      setError(err.message || "Не удалось загрузить каналы.");
    }
  }

  async function loadMessages(category) {
    if (!category) return;

    setError("");

    try {
      const result = await adminRequest(`/api/admin-channels/${category}/messages`);
      setMessages(result.messages || []);
    } catch (err) {
      setMessages([]);
      setError(err.message || "Не удалось загрузить сообщения.");
    }
  }

  async function sendMessage() {
    if (!activeChannel?.category || !message.trim()) return;

    setError("");

    try {
      await adminRequest(`/api/admin-channels/${activeChannel.category}/messages`, {
        method: "POST",
        body: JSON.stringify({ message }),
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
    <main className="adminContentPage">
      <section className="adminPageHead">
        <div>
          <h1>Каналы</h1>
          <p>Общие каналы для общения админов по категориям организаций.</p>
        </div>

        <button type="button" onClick={loadChannels}>
          Обновить
        </button>
      </section>

      {error ? <div className="adminError">{error}</div> : null}

      <section className="channelGrid">
        <aside className="adminCard channelList">
          <h2>Каналы</h2>

          {channels.length === 0 ? (
            <p className="muted">Каналов пока нет</p>
          ) : (
            channels.map((channel) => (
              <button
                key={channel.id || channel.category}
                type="button"
                className={activeChannel?.category === channel.category ? "active" : ""}
                onClick={() => selectChannel(channel)}
              >
                <b>{text(channel.title || channel.category)}</b>
                <span>{text(channel.description)}</span>
              </button>
            ))
          )}
        </aside>

        <section className="adminCard chatBox">
          {!activeChannel ? (
            <div className="emptyDetails">
              <h2>Канал не выбран</h2>
              <p>Выберите канал слева.</p>
            </div>
          ) : (
            <>
              <div className="detailsTop">
                <div>
                  <h2>{text(activeChannel.title)}</h2>
                  <p>{text(activeChannel.description)}</p>
                </div>

                <button type="button" className="miniBtn" onClick={() => loadMessages(activeChannel.category)}>
                  Обновить
                </button>
              </div>

              <div className="messagesBox">
                {messages.length === 0 ? (
                  <p className="muted">Сообщений пока нет</p>
                ) : (
                  messages.map((item) => {
                    const isMine = item.sender_admin_id === adminData?.id;

                    return (
                      <div
                        key={item.id || item.created_at}
                        className={isMine ? "messageItem mine" : "messageItem"}
                      >
                        <div>
                          <b>{isMine ? "Вы" : text(item.sender_admin_id || "Админ")}</b>
                          <small>{formatDate(item.created_at)}</small>
                        </div>
                        <p>{text(item.message)}</p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="sendBox">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Напишите сообщение..."
                />
                <button type="button" onClick={sendMessage}>
                  Отправить
                </button>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}