import { useEffect, useRef, useState } from "react";
import { adminRequest } from "../api/adminApi";

function text(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatDate(value) {
  if (!value) return "";

  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSenderLabel(item) {
  return item.sender_label || "Неизвестный админ";
}

function getMessagesSignature(list) {
  return (list || [])
    .map((item) => `${item.id || item.created_at}:${item.message}`)
    .join("|");
}

export default function AdminChannels() {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesBoxRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeChannelRef = useRef(null);
  const messagesSignatureRef = useRef("");

  function isNearBottom() {
    const box = messagesBoxRef.current;
    if (!box) return true;

    const distanceFromBottom = box.scrollHeight - box.scrollTop - box.clientHeight;
    return distanceFromBottom < 120;
  }

  function scrollToBottom(behavior = "smooth") {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 80);
  }

  async function loadChannels() {
    setError("");

    try {
      const result = await adminRequest("/api/admin-channels");
      const list = result?.channels || [];

      setChannels(list);

      if (list.length > 0 && !activeChannelRef.current) {
        activeChannelRef.current = list[0];
        setActiveChannel(list[0]);
        await loadMessages(list[0].category, {
          withLoading: true,
          forceScrollBottom: true,
          silentAutoRefresh: false,
        });
      }
    } catch (err) {
      setError(err.message || "Не удалось загрузить каналы.");
    }
  }

  async function loadMessages(
    category,
    {
      withLoading = false,
      forceScrollBottom = false,
      silentAutoRefresh = false,
    } = {}
  ) {
    if (!category) return;

    const box = messagesBoxRef.current;
    const previousScrollTop = box?.scrollTop || 0;
    const previousScrollHeight = box?.scrollHeight || 0;
    const wasNearBottom = isNearBottom();

    if (withLoading) {
      setLoadingMessages(true);
    }

    setError("");

    try {
      const result = await adminRequest(
        `/api/admin-channels/${category}/messages`
      );

      const nextMessages = result?.messages || [];
      const nextSignature = getMessagesSignature(nextMessages);

      if (nextSignature === messagesSignatureRef.current) {
        return;
      }

      messagesSignatureRef.current = nextSignature;

      setMessages(nextMessages);

      setTimeout(() => {
        const currentBox = messagesBoxRef.current;
        if (!currentBox) return;

        if (forceScrollBottom) {
          scrollToBottom("auto");
          return;
        }

        if (silentAutoRefresh) {
          const newScrollHeight = currentBox.scrollHeight;
          const heightDiff = newScrollHeight - previousScrollHeight;

          currentBox.scrollTop = previousScrollTop + heightDiff;
          return;
        }

        if (wasNearBottom) {
          scrollToBottom("smooth");
        }
      }, 50);
    } catch (err) {
      setError(err.message || "Не удалось загрузить сообщения.");
    } finally {
      if (withLoading) {
        setLoadingMessages(false);
      }
    }
  }

  async function sendMessage() {
    if (!activeChannel?.category || !message.trim() || sending) return;

    const currentText = message.trim();

    setSending(true);
    setError("");

    try {
      setMessage("");

      await adminRequest(`/api/admin-channels/${activeChannel.category}/messages`, {
        method: "POST",
        body: JSON.stringify({
          message: currentText,
        }),
      });

      await loadMessages(activeChannel.category, {
        forceScrollBottom: true,
      });
    } catch (err) {
      setMessage(currentText);
      setError(err.message || "Не удалось отправить сообщение.");
    } finally {
      setSending(false);
    }
  }

  function selectChannel(channel) {
    activeChannelRef.current = channel;
    setActiveChannel(channel);
    setMessages([]);
    messagesSignatureRef.current = "";

    loadMessages(channel.category, {
      withLoading: true,
      forceScrollBottom: true,
    });
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const channel = activeChannelRef.current;

      if (channel?.category) {
        loadMessages(channel.category, {
          silentAutoRefresh: true,
        });
      }
    }, 1000);

    return () => clearInterval(intervalId);
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
                className={
                  activeChannel?.category === channel.category ? "active" : ""
                }
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

                <div className="chatStatus">
                  <span>Автообновление: 1 секунда</span>

                  <button
                    type="button"
                    className="miniBtn"
                    onClick={() =>
                      loadMessages(activeChannel.category, {
                        withLoading: true,
                        forceScrollBottom: true,
                      })
                    }
                  >
                    Обновить сейчас
                  </button>
                </div>
              </div>

              <div className="messagesBox" ref={messagesBoxRef}>
                {loadingMessages ? (
                  <p className="muted">Загрузка сообщений...</p>
                ) : messages.length === 0 ? (
                  <p className="muted">Сообщений пока нет</p>
                ) : (
                  messages.map((item) => (
                    <div
                      key={item.id || item.created_at}
                      className="messageItem"
                    >
                      <div className="messageHeader">
                        <b>{getSenderLabel(item)}</b>
                        <small>{formatDate(item.created_at)}</small>
                      </div>

                      <p>{text(item.message)}</p>
                    </div>
                  ))
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="sendBox">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Напишите сообщение..."
                />

                <button type="button" onClick={sendMessage} disabled={sending}>
                  {sending ? "Отправка..." : "Отправить"}
                </button>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}