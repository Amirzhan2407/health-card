import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiNotificationLine,
  RiRefreshLine,
  RiSearchLine,
} from "react-icons/ri";

import api from "../../api/api";
import { useLanguage } from "../../i18n/LanguageContext";

const TEXTS = {
  ru: {
    pageTitle: "Уведомления администратора",
    pageSubtitle:
      "Ответы технической поддержки и системные события вашей клиники.",

    refresh: "Обновить",
    refreshing: "Обновление...",
    readAll: "Прочитать всё",
    processing: "Обработка...",

    total: "Всего уведомлений",
    unread: "Непрочитанных",

    searchPlaceholder: "Поиск уведомлений",
    allNotifications: "Все уведомления",
    unreadNotifications: "Непрочитанные",
    readNotifications: "Прочитанные",

    loading: "Загрузка уведомлений...",
    emptyTitle: "Уведомлений нет",
    emptyText: "Новые уведомления появятся здесь.",

    defaultTitle: "Уведомление",
    emptyMessage: "Текст уведомления отсутствует.",
    newBadge: "Новое",
    unknownDate: "Дата не указана",

    loadError: "Не удалось загрузить уведомления.",
    markReadError:
      "Не удалось отметить уведомление как прочитанное.",
    markAllError:
      "Не удалось отметить все уведомления как прочитанные.",
    markAllSuccess:
      "Все уведомления отмечены как прочитанные.",
  },

  kk: {
    pageTitle: "Әкімші хабарландырулары",
    pageSubtitle:
      "Техникалық қолдау жауаптары және клиниканың жүйелік оқиғалары.",

    refresh: "Жаңарту",
    refreshing: "Жаңартылуда...",
    readAll: "Барлығын оқу",
    processing: "Өңделуде...",

    total: "Барлық хабарландыру",
    unread: "Оқылмаған",

    searchPlaceholder: "Хабарландыруларды іздеу",
    allNotifications: "Барлық хабарландыру",
    unreadNotifications: "Оқылмаған",
    readNotifications: "Оқылған",

    loading: "Хабарландырулар жүктелуде...",
    emptyTitle: "Хабарландырулар жоқ",
    emptyText: "Жаңа хабарландырулар осында пайда болады.",

    defaultTitle: "Хабарландыру",
    emptyMessage: "Хабарландыру мәтіні жоқ.",
    newBadge: "Жаңа",
    unknownDate: "Күні көрсетілмеген",

    loadError: "Хабарландыруларды жүктеу мүмкін болмады.",
    markReadError:
      "Хабарландыруды оқылған деп белгілеу мүмкін болмады.",
    markAllError:
      "Барлық хабарландыруды оқылған деп белгілеу мүмкін болмады.",
    markAllSuccess:
      "Барлық хабарландыру оқылған деп белгіленді.",
  },
};

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function extractNotifications(response) {
  const body = response?.data;

  if (Array.isArray(body)) {
    return body;
  }

  if (Array.isArray(body?.data)) {
    return body.data;
  }

  if (Array.isArray(body?.notifications)) {
    return body.notifications;
  }

  if (Array.isArray(body?.items)) {
    return body.items;
  }

  return [];
}

function normalizeNotificationLink(link) {
  const normalized = String(link || "").trim();

  if (!normalized.startsWith("/")) {
    return "";
  }

  const linkMap = {
    "/organization-admin/support":
      "/org-admin/support",

    "/org-admin/conversations":
      "/org-admin/support",

    "/organization-admin/notifications":
      "/org-admin/notifications",

    "/organization-admin/doctors":
      "/org-admin",

    "/org-admin/doctors":
      "/org-admin",

    "/organization-admin/schedules":
      "/org-admin/schedules",

    "/organization-admin/departments":
      "/org-admin/departments",
  };

  return linkMap[normalized] || normalized;
}

export default function OrgAdminNotifications() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const currentLanguage = String(
    language || "ru"
  )
    .trim()
    .toLowerCase();

  const isKazakh = [
    "kk",
    "kz",
    "kaz",
    "kk-kz",
    "kz-kz",
  ].includes(currentLanguage);

  const text = isKazakh
    ? TEXTS.kk
    : TEXTS.ru;

  const dateLocale = isKazakh
    ? "kk-KZ"
    : "ru-RU";

  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [actionId, setActionId] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const formatDateTime = useCallback(
    (value) => {
      if (!value) {
        return text.unknownDate;
      }

      const date = new Date(value);

      if (
        Number.isNaN(date.getTime())
      ) {
        return text.unknownDate;
      }

      return date.toLocaleString(
        dateLocale,
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    },
    [dateLocale, text.unknownDate]
  );

  const loadNotifications = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }

      setErrorMessage("");

      try {
        const response = await api.get(
          "/notifications"
        );

        setNotifications(
          extractNotifications(response)
        );
      } catch (error) {
        if (showLoader) {
          setNotifications([]);
        }

        setErrorMessage(
          isKazakh
            ? text.loadError
            : getErrorMessage(
                error,
                text.loadError
              )
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [isKazakh, text.loadError]
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const intervalId =
      window.setInterval(() => {
        loadNotifications(false);
      }, 30000);

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification?.is_read &&
          !notification?.read_at
      ).length,
    [notifications]
  );

  const filteredNotifications =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      return notifications.filter(
        (notification) => {
          const isRead = Boolean(
            notification?.is_read ||
              notification?.read_at
          );

          if (
            filter === "unread" &&
            isRead
          ) {
            return false;
          }

          if (
            filter === "read" &&
            !isRead
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            notification?.title,
            notification?.message,
            notification?.text,
            notification?.type,
          ].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [
      notifications,
      search,
      filter,
    ]);

  async function markAsRead(
    notificationId
  ) {
    if (
      !notificationId ||
      actionId
    ) {
      return false;
    }

    const notification =
      notifications.find(
        (item) =>
          item.id === notificationId
      );

    const alreadyRead = Boolean(
      notification?.is_read ||
        notification?.read_at
    );

    if (alreadyRead) {
      return true;
    }

    setActionId(notificationId);
    setErrorMessage("");

    try {
      await api.patch(
        `/notifications/${notificationId}/read`
      );

      const readAt =
        new Date().toISOString();

      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                is_read: true,
                read_at:
                  item.read_at ||
                  readAt,
              }
            : item
        )
      );

      return true;
    } catch (error) {
      setErrorMessage(
        isKazakh
          ? text.markReadError
          : getErrorMessage(
              error,
              text.markReadError
            )
      );

      return false;
    } finally {
      setActionId("");
    }
  }

  async function markAllAsRead() {
    if (
      unreadCount === 0 ||
      actionId
    ) {
      return;
    }

    setActionId("all");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.patch(
        "/notifications/read-all"
      );

      const readAt =
        new Date().toISOString();

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
          read_at:
            item.read_at ||
            readAt,
        }))
      );

      setSuccessMessage(
        text.markAllSuccess
      );
    } catch (error) {
      setErrorMessage(
        isKazakh
          ? text.markAllError
          : getErrorMessage(
              error,
              text.markAllError
            )
      );
    } finally {
      setActionId("");
    }
  }

  async function openNotification(
    notification
  ) {
    const wasMarked =
      await markAsRead(
        notification?.id
      );

    if (!wasMarked) {
      return;
    }

    const relatedPath =
      normalizeNotificationLink(
        notification?.link ||
          notification?.related_url ||
          notification?.action_url
      );

    if (relatedPath) {
      navigate(relatedPath);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            {text.pageTitle}
          </h1>

          <p style={styles.subtitle}>
            {text.pageSubtitle}
          </p>
        </div>

        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={
              unreadCount === 0 ||
              actionId === "all"
            }
            style={{
              ...styles.readAllButton,
              ...(unreadCount === 0 ||
              actionId === "all"
                ? styles.disabledButton
                : {}),
            }}
          >
            <RiCheckboxCircleLine />

            {actionId === "all"
              ? text.processing
              : text.readAll}
          </button>

          <button
            type="button"
            onClick={() =>
              loadNotifications(true)
            }
            disabled={loading}
            style={{
              ...styles.refreshButton,
              ...(loading
                ? styles.disabledButton
                : {}),
            }}
          >
            <RiRefreshLine />

            {loading
              ? text.refreshing
              : text.refresh}
          </button>
        </div>
      </div>

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>
            {notifications.length}
          </span>

          <span style={styles.statLabel}>
            {text.total}
          </span>
        </div>

        <div style={styles.statCard}>
          <span style={styles.unreadValue}>
            {unreadCount}
          </span>

          <span style={styles.statLabel}>
            {text.unread}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div style={styles.errorAlert}>
          <RiCloseCircleLine />
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div style={styles.successAlert}>
          <RiCheckboxCircleLine />
          {successMessage}
        </div>
      )}

      <div style={styles.filters}>
        <div style={styles.searchBox}>
          <RiSearchLine />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder={
              text.searchPlaceholder
            }
            style={styles.searchInput}
          />
        </div>

        <select
          value={filter}
          onChange={(event) =>
            setFilter(
              event.target.value
            )
          }
          style={styles.filterSelect}
        >
          <option value="all">
            {text.allNotifications}
          </option>

          <option value="unread">
            {text.unreadNotifications}
          </option>

          <option value="read">
            {text.readNotifications}
          </option>
        </select>
      </div>

      <div style={styles.card}>
        {loading ? (
          <div style={styles.emptyState}>
            {text.loading}
          </div>
        ) : filteredNotifications.length ===
          0 ? (
          <div style={styles.emptyState}>
            <RiNotificationLine
              style={styles.emptyIcon}
            />

            <strong>
              {text.emptyTitle}
            </strong>

            <span>
              {text.emptyText}
            </span>
          </div>
        ) : (
          <div style={styles.list}>
            {filteredNotifications.map(
              (notification) => {
                const isRead = Boolean(
                  notification?.is_read ||
                    notification?.read_at
                );

                const isProcessing =
                  actionId ===
                  notification.id;

                return (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() =>
                      openNotification(
                        notification
                      )
                    }
                    disabled={isProcessing}
                    style={{
                      ...styles.item,
                      ...(isRead
                        ? styles.readItem
                        : styles.unreadItem),
                      ...(isProcessing
                        ? styles.disabledButton
                        : {}),
                    }}
                  >
                    <div
                      style={{
                        ...styles.iconBox,
                        ...(isRead
                          ? styles.readIconBox
                          : styles.unreadIconBox),
                      }}
                    >
                      <RiNotificationLine />
                    </div>

                    <div style={styles.content}>
                      <div
                        style={
                          styles.itemHeader
                        }
                      >
                        <h2
                          style={{
                            ...styles.itemTitle,
                            color: isRead
                              ? "#94a3b8"
                              : "#ffffff",
                          }}
                        >
                          {notification?.title ||
                            text.defaultTitle}
                        </h2>

                        {!isRead && (
                          <span
                            style={
                              styles.unreadBadge
                            }
                          >
                            {text.newBadge}
                          </span>
                        )}
                      </div>

                      <p
                        style={
                          styles.message
                        }
                      >
                        {notification?.message ||
                          notification?.text ||
                          text.emptyMessage}
                      </p>

                      <div
                        style={
                          styles.itemFooter
                        }
                      >
                        <span>
                          {formatDateTime(
                            notification?.created_at
                          )}
                        </span>

                        {notification?.type && (
                          <span
                            style={
                              styles.typeBadge
                            }
                          >
                            {notification.type}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "36px",
    color: "#ffffff",
    fontFamily:
      "'Outfit', 'Inter', sans-serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "24px",
  },

  title: {
    margin: "0 0 7px",
    fontSize: "32px",
    fontWeight: 800,
  },

  subtitle: {
    margin: 0,
    color: "#94a3b8",
  },

  headerActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "11px 15px",
    borderRadius: "11px",
    border:
      "1px solid rgba(99,102,241,0.35)",
    background:
      "rgba(99,102,241,0.15)",
    color: "#c7d2fe",
    cursor: "pointer",
    fontWeight: 700,
  },

  readAllButton: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "11px 15px",
    borderRadius: "11px",
    border:
      "1px solid rgba(16,185,129,0.32)",
    background:
      "rgba(16,185,129,0.13)",
    color: "#6ee7b7",
    cursor: "pointer",
    fontWeight: 700,
  },

  stats: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },

  statCard: {
    minWidth: "180px",
    padding: "16px 18px",
    borderRadius: "14px",
    background:
      "rgba(30,41,59,0.45)",
    border:
      "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
  },

  statValue: {
    fontSize: "26px",
    fontWeight: 800,
  },

  unreadValue: {
    fontSize: "26px",
    fontWeight: 800,
    color: "#818cf8",
  },

  statLabel: {
    marginTop: "3px",
    color: "#94a3b8",
    fontSize: "13px",
  },

  filters: {
    display: "grid",
    gridTemplateColumns:
      "minmax(200px, 1fr) minmax(170px, 230px)",
    gap: "12px",
    marginBottom: "18px",
  },

  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "0 13px",
    borderRadius: "12px",
    background:
      "rgba(15,23,42,0.55)",
    border:
      "1px solid rgba(255,255,255,0.09)",
    color: "#64748b",
  },

  searchInput: {
    width: "100%",
    padding: "12px 0",
    border: "none",
    background: "transparent",
    color: "#ffffff",
    outline: "none",
  },

  filterSelect: {
    padding: "12px",
    borderRadius: "12px",
    border:
      "1px solid rgba(255,255,255,0.09)",
    background: "#111827",
    color: "#ffffff",
    outline: "none",
  },

  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
    padding: "12px 14px",
    borderRadius: "11px",
    background:
      "rgba(239,68,68,0.13)",
    border:
      "1px solid rgba(239,68,68,0.3)",
    color: "#fca5a5",
  },

  successAlert: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
    padding: "12px 14px",
    borderRadius: "11px",
    background:
      "rgba(16,185,129,0.13)",
    border:
      "1px solid rgba(16,185,129,0.3)",
    color: "#6ee7b7",
  },

  card: {
    padding: "16px",
    borderRadius: "18px",
    background:
      "rgba(30,41,59,0.43)",
    border:
      "1px solid rgba(255,255,255,0.06)",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  item: {
    width: "100%",
    padding: "15px",
    borderRadius: "13px",
    color: "#ffffff",
    display: "flex",
    alignItems: "flex-start",
    gap: "13px",
    cursor: "pointer",
    textAlign: "left",
  },

  unreadItem: {
    background:
      "rgba(99,102,241,0.11)",
    border:
      "1px solid rgba(99,102,241,0.25)",
  },

  readItem: {
    background:
      "rgba(0,0,0,0.14)",
    border:
      "1px solid rgba(255,255,255,0.04)",
  },

  iconBox: {
    minWidth: "39px",
    height: "39px",
    borderRadius: "11px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },

  unreadIconBox: {
    background:
      "rgba(99,102,241,0.18)",
    color: "#818cf8",
  },

  readIconBox: {
    background:
      "rgba(100,116,139,0.12)",
    color: "#64748b",
  },

  content: {
    minWidth: 0,
    flex: 1,
  },

  itemHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },

  itemTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 750,
  },

  unreadBadge: {
    padding: "4px 8px",
    borderRadius: "999px",
    background: "#4f46e5",
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: 700,
  },

  message: {
    margin: "7px 0 10px",
    color: "#94a3b8",
    fontSize: "14px",
    lineHeight: 1.5,
    overflowWrap: "anywhere",
  },

  itemFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "11px",
  },

  typeBadge: {
    padding: "3px 7px",
    borderRadius: "999px",
    background:
      "rgba(255,255,255,0.05)",
  },

  emptyState: {
    minHeight: "260px",
    padding: "30px",
    color: "#64748b",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "38px",
    color: "#475569",
  },

  disabledButton: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
};
