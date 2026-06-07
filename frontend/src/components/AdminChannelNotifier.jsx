import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { adminRequest, getAdminData } from "../api/adminApi";

function shortText(value, limit = 90) {
  const text = String(value || "").trim();

  if (text.length <= limit) return text;

  return `${text.slice(0, limit)}...`;
}

function channelName(channel) {
  return channel?.title || channel?.category || "Канал";
}

function senderName(message) {
  return message?.sender_label || "Администратор";
}

export default function AdminChannelNotifier() {
  const navigate = useNavigate();
  const location = useLocation();

  const [toasts, setToasts] = useState([]);

  const channelsRef = useRef([]);
  const knownMessageIdsRef = useRef(new Set());
  const firstLoadDoneRef = useRef(false);
  const checkingRef = useRef(false);

  const adminData = getAdminData();

  function removeToast(id) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }

  function showToast({ channel, message }) {
    const id = `${message.id || message.created_at}-${Date.now()}`;

    const toast = {
      id,
      channelTitle: channelName(channel),
      sender: senderName(message),
      message: shortText(message.message),
    };

    setToasts((prev) => [toast, ...prev].slice(0, 4));

    setTimeout(() => {
      removeToast(id);
    }, 6000);
  }

  async function loadChannelsOnce() {
    if (channelsRef.current.length > 0) return;

    const result = await adminRequest("/api/admin-channels");
    channelsRef.current = result.channels || [];
  }

  async function checkMessages() {
    if (checkingRef.current) return;

    checkingRef.current = true;

    try {
      await loadChannelsOnce();

      const channels = channelsRef.current;

      for (const channel of channels) {
        if (!channel?.category) continue;

        const result = await adminRequest(
          `/api/admin-channels/${channel.category}/messages`
        );

        const messages = result.messages || [];

        for (const message of messages) {
          const messageId = String(message.id || message.created_at || "");

          if (!messageId) continue;

          const alreadyKnown = knownMessageIdsRef.current.has(messageId);

          if (!alreadyKnown) {
            knownMessageIdsRef.current.add(messageId);

            const isMyMessage = message.sender_admin_id === adminData?.id;
            const isChannelsPage = location.pathname.includes(
              "/admin-panel/channels"
            );

            if (firstLoadDoneRef.current && !isMyMessage && !isChannelsPage) {
              showToast({
                channel,
                message,
              });
            }
          }
        }
      }

      firstLoadDoneRef.current = true;
    } catch {
      // специально молчим, чтобы уведомления не ломали админку
    } finally {
      checkingRef.current = false;
    }
  }

  useEffect(() => {
    checkMessages();

    const intervalId = setInterval(() => {
      checkMessages();
    }, 1000);

    return () => clearInterval(intervalId);
  }, [location.pathname]);

  if (toasts.length === 0) return null;

  return (
    <div className="adminToastStack">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className="adminToast"
          onClick={() => {
            removeToast(toast.id);
            navigate("/admin-panel/channels");
          }}
        >
          <div className="adminToastIcon">💬</div>

          <div className="adminToastBody">
            <strong>Новое сообщение</strong>
            <span>{toast.channelTitle}</span>
            <b>{toast.sender}</b>
            <p>{toast.message}</p>
          </div>

          <span
            className="adminToastClose"
            onClick={(event) => {
              event.stopPropagation();
              removeToast(toast.id);
            }}
          >
            ×
          </span>
        </button>
      ))}
    </div>
  );
}