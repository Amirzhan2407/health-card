
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  RiAttachment2,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiFileLine,
  RiLoader4Line,
  RiQuestionAnswerLine,
  RiRefreshLine,
  RiSearchLine,
  RiSendPlane2Line,
} from "react-icons/ri";

import api from "../../api/api";

const STATUS_OPTIONS = [
  {
    value: "open",
    label: "Открыто",
  },
  {
    value: "in_progress",
    label: "В работе",
  },
  {
    value: "resolved",
    label: "Решено",
  },
  {
    value: "closed",
    label: "Закрыто",
  },
];

const STATUS_LABELS = {
  open: "Открыто",
  in_progress: "В работе",
  resolved: "Решено",
  closed: "Закрыто",
};

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function extractConversationList(response) {
  const body = response?.data;

  if (Array.isArray(body)) {
    return body;
  }

  if (Array.isArray(body?.data)) {
    return body.data;
  }

  if (Array.isArray(body?.conversations)) {
    return body.conversations;
  }

  if (Array.isArray(body?.items)) {
    return body.items;
  }

  return [];
}

function extractConversation(response) {
  const body = response?.data;

  return (
    body?.data?.conversation ||
    body?.conversation ||
    body?.data ||
    body ||
    null
  );
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOrganizationName(ticket) {
  return (
    ticket?.organization?.name ||
    ticket?.organization_name ||
    ticket?.clinic_name ||
    "Медицинская организация"
  );
}

function getMessages(ticket) {
  if (Array.isArray(ticket?.messages)) {
    return ticket.messages;
  }

  if (Array.isArray(ticket?.support_messages)) {
    return ticket.support_messages;
  }

  return [];
}

function getSenderRole(message) {
  return (
    message?.sender?.role ||
    message?.sender_role ||
    message?.role ||
    ""
  );
}

function getSenderName(message) {
  return (
    message?.sender?.fullName ||
    message?.sender?.full_name ||
    message?.sender_name ||
    (getSenderRole(message) === "support"
      ? "Техническая поддержка"
      : "Представитель организации")
  );
}

function getMessageText(message) {
  return (
    message?.message_text ||
    message?.messageText ||
    message?.text ||
    ""
  );
}

function getAttachmentUrl(message) {
  return (
    message?.attachment_url ||
    message?.attachmentUrl ||
    message?.file_url ||
    ""
  );
}

function getAttachmentName(message) {
  return (
    message?.attachment_name ||
    message?.attachmentName ||
    message?.file_name ||
    "Открыть вложение"
  );
}

export default function Conversations() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] =
    useState(null);

  const [reply, setReply] = useState("");
  const [attachment, setAttachment] =
    useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [loadingTickets, setLoadingTickets] =
    useState(true);

  const [loadingDialog, setLoadingDialog] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [changingStatus, setChangingStatus] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    setErrorMessage("");

    try {
      const response = await api.get(
        "/support/conversations"
      );

      setTickets(
        extractConversationList(response)
      );
    } catch (error) {
      setTickets([]);

      setErrorMessage(
        getErrorMessage(
          error,
          "Не удалось загрузить обращения."
        )
      );
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [selectedTicket]);

  const filteredTickets = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return tickets.filter((ticket) => {
      const ticketStatus =
        ticket?.status || "open";

      if (
        statusFilter !== "all" &&
        ticketStatus !== statusFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableValues = [
        ticket?.subject,
        getOrganizationName(ticket),
        ticket?.organization?.bin,
        ticket?.organization_bin,
        ticket?.created_by?.full_name,
        ticket?.created_by_name,
      ];

      return searchableValues.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [tickets, search, statusFilter]);

  const openCount = useMemo(
    () =>
      tickets.filter((ticket) =>
        ["open", "in_progress"].includes(
          ticket?.status
        )
      ).length,
    [tickets]
  );

  async function openTicket(ticket) {
    if (!ticket?.id) {
      return;
    }

    setLoadingDialog(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await api.get(
        `/support/conversations/${ticket.id}`
      );

      const conversation =
        extractConversation(response);

      setSelectedTicket({
        ...ticket,
        ...conversation,
        messages:
          conversation?.messages ||
          conversation?.support_messages ||
          [],
      });

      try {
        await api.patch(
          `/support/conversations/${ticket.id}/read`
        );
      } catch {
        // Отметка прочтения не должна мешать открытию диалога.
      }

      setTickets((currentTickets) =>
        currentTickets.map((currentTicket) =>
          currentTicket.id === ticket.id
            ? {
                ...currentTicket,
                unread_count: 0,
              }
            : currentTicket
        )
      );
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Не удалось открыть обращение."
        )
      );
    } finally {
      setLoadingDialog(false);
    }
  }

  async function reloadSelectedTicket() {
    if (!selectedTicket?.id) {
      return;
    }

    const response = await api.get(
      `/support/conversations/${selectedTicket.id}`
    );

    const conversation =
      extractConversation(response);

    setSelectedTicket((current) => ({
      ...current,
      ...conversation,
      messages:
        conversation?.messages ||
        conversation?.support_messages ||
        [],
    }));
  }

  async function handleSendReply(event) {
    event.preventDefault();

    if (
      sending ||
      !selectedTicket?.id ||
      (!reply.trim() && !attachment)
    ) {
      return;
    }

    setSending(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (attachment) {
        const formData = new FormData();

        formData.append(
          "messageText",
          reply.trim()
        );

        formData.append(
          "attachment",
          attachment
        );

        await api.post(
          `/support/conversations/${selectedTicket.id}/messages`,
          formData
        );
      } else {
        await api.post(
          `/support/conversations/${selectedTicket.id}/messages`,
          {
            messageText: reply.trim(),
          }
        );
      }

      setReply("");
      setAttachment(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await Promise.all([
        reloadSelectedTicket(),
        loadTickets(),
      ]);

      setSuccessMessage(
        "Сообщение отправлено."
      );
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Не удалось отправить сообщение."
        )
      );
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(
    nextStatus
  ) {
    if (
      changingStatus ||
      !selectedTicket?.id ||
      nextStatus === selectedTicket.status
    ) {
      return;
    }

    setChangingStatus(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.patch(
        `/support/conversations/${selectedTicket.id}/status`,
        {
          status: nextStatus,
        }
      );

      setSelectedTicket((current) => ({
        ...current,
        status: nextStatus,
      }));

      setTickets((currentTickets) =>
        currentTickets.map((ticket) =>
          ticket.id === selectedTicket.id
            ? {
                ...ticket,
                status: nextStatus,
              }
            : ticket
        )
      );

      setSuccessMessage(
        `Статус изменён: ${
          STATUS_LABELS[nextStatus]
        }.`
      );
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Не удалось изменить статус обращения."
        )
      );
    } finally {
      setChangingStatus(false);
    }
  }

  function handleAttachmentChange(event) {
    const selectedFile =
      event.target.files?.[0] || null;

    if (
      selectedFile &&
      selectedFile.size >
        10 * 1024 * 1024
    ) {
      setErrorMessage(
        "Размер вложения не должен превышать 10 МБ."
      );

      event.target.value = "";
      return;
    }

    setErrorMessage("");
    setAttachment(selectedFile);
  }

  const messages = getMessages(
    selectedTicket
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Обращения в техподдержку
          </h1>

          <p style={styles.subtitle}>
            Переписка с администраторами медицинских организаций.
          </p>
        </div>

        <button
          type="button"
          onClick={loadTickets}
          disabled={loadingTickets}
          style={{
            ...styles.refreshButton,
            ...(loadingTickets
              ? styles.disabledButton
              : {}),
          }}
        >
          <RiRefreshLine />
          Обновить
        </button>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <strong style={styles.statValue}>
            {tickets.length}
          </strong>
          <span style={styles.statLabel}>
            Всего обращений
          </span>
        </div>

        <div style={styles.statCard}>
          <strong style={styles.statValue}>
            {openCount}
          </strong>
          <span style={styles.statLabel}>
            Требуют обработки
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

      <div style={styles.workspace}>
        <aside style={styles.ticketPanel}>
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
                placeholder="Поиск обращений"
                style={styles.searchInput}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              style={styles.filterSelect}
            >
              <option value="all">
                Все статусы
              </option>

              {STATUS_OPTIONS.map(
                (status) => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                )
              )}
            </select>
          </div>

          <div style={styles.ticketList}>
            {loadingTickets ? (
              <div style={styles.emptyState}>
                <RiLoader4Line
                  style={styles.emptyIcon}
                />
                Загрузка обращений...
              </div>
            ) : filteredTickets.length ===
              0 ? (
              <div style={styles.emptyState}>
                <RiQuestionAnswerLine
                  style={styles.emptyIcon}
                />

                <strong>
                  Обращений нет
                </strong>

                <span>
                  Новые обращения появятся здесь.
                </span>
              </div>
            ) : (
              filteredTickets.map(
                (ticket) => {
                  const isSelected =
                    selectedTicket?.id ===
                    ticket.id;

                  const unreadCount =
                    Number(
                      ticket?.unread_count ||
                        0
                    );

                  return (
                    <button
                      type="button"
                      key={ticket.id}
                      onClick={() =>
                        openTicket(ticket)
                      }
                      style={{
                        ...styles.ticketItem,
                        ...(isSelected
                          ? styles.activeTicket
                          : {}),
                      }}
                    >
                      <div
                        style={
                          styles.ticketIcon
                        }
                      >
                        <RiQuestionAnswerLine />
                      </div>

                      <div
                        style={
                          styles.ticketContent
                        }
                      >
                        <div
                          style={
                            styles.ticketTop
                          }
                        >
                          <strong
                            style={
                              styles.ticketSubject
                            }
                          >
                            {ticket?.subject ||
                              "Без темы"}
                          </strong>

                          {unreadCount >
                            0 && (
                            <span
                              style={
                                styles.unreadBadge
                              }
                            >
                              {unreadCount}
                            </span>
                          )}
                        </div>

                        <span
                          style={
                            styles.organizationName
                          }
                        >
                          {getOrganizationName(
                            ticket
                          )}
                        </span>

                        <div
                          style={
                            styles.ticketBottom
                          }
                        >
                          <span
                            style={
                              styles[
                                `status_${ticket?.status}`
                              ] ||
                              styles.status_open
                            }
                          >
                            {STATUS_LABELS[
                              ticket?.status
                            ] ||
                              ticket?.status ||
                              "Открыто"}
                          </span>

                          <span
                            style={
                              styles.ticketDate
                            }
                          >
                            {formatDateTime(
                              ticket?.updated_at ||
                                ticket?.created_at
                            )}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                }
              )
            )}
          </div>
        </aside>

        <section style={styles.dialogPanel}>
          {!selectedTicket ? (
            <div style={styles.dialogEmpty}>
              <RiQuestionAnswerLine
                style={styles.dialogEmptyIcon}
              />

              <h2>
                Выберите обращение
              </h2>

              <p>
                Откройте обращение слева, чтобы увидеть историю переписки.
              </p>
            </div>
          ) : loadingDialog ? (
            <div style={styles.dialogEmpty}>
              Загрузка переписки...
            </div>
          ) : (
            <>
              <div style={styles.dialogHeader}>
                <div>
                  <h2 style={styles.dialogTitle}>
                    {selectedTicket.subject ||
                      "Без темы"}
                  </h2>

                  <p
                    style={
                      styles.dialogOrganization
                    }
                  >
                    {getOrganizationName(
                      selectedTicket
                    )}
                  </p>
                </div>

                <select
                  value={
                    selectedTicket.status ||
                    "open"
                  }
                  disabled={changingStatus}
                  onChange={(event) =>
                    handleStatusChange(
                      event.target.value
                    )
                  }
                  style={styles.statusSelect}
                >
                  {STATUS_OPTIONS.map(
                    (status) => (
                      <option
                        key={status.value}
                        value={status.value}
                      >
                        {status.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div style={styles.messagesBox}>
                {messages.length === 0 ? (
                  <div
                    style={
                      styles.messagesEmpty
                    }
                  >
                    Сообщений пока нет.
                  </div>
                ) : (
                  messages.map(
                    (message, index) => {
                      const isSupport =
                        getSenderRole(
                          message
                        ) === "support";

                      const attachmentUrl =
                        getAttachmentUrl(
                          message
                        );

                      return (
                        <div
                          key={
                            message?.id ||
                            `${index}-${message?.created_at}`
                          }
                          style={{
                            ...styles.messageRow,
                            justifyContent:
                              isSupport
                                ? "flex-end"
                                : "flex-start",
                          }}
                        >
                          <div
                            style={{
                              ...styles.messageBubble,
                              ...(isSupport
                                ? styles.supportBubble
                                : styles.organizationBubble),
                            }}
                          >
                            <div
                              style={
                                styles.messageMeta
                              }
                            >
                              <strong>
                                {getSenderName(
                                  message
                                )}
                              </strong>

                              <span>
                                {formatDateTime(
                                  message?.created_at
                                )}
                              </span>
                            </div>

                            {getMessageText(
                              message
                            ) && (
                              <p
                                style={
                                  styles.messageText
                                }
                              >
                                {getMessageText(
                                  message
                                )}
                              </p>
                            )}

                            {attachmentUrl && (
                              <a
                                href={
                                  attachmentUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                                style={
                                  styles.attachmentLink
                                }
                              >
                                <RiFileLine />
                                {getAttachmentName(
                                  message
                                )}
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )
                )}

                <div
                  ref={messagesEndRef}
                />
              </div>

              <form
                onSubmit={handleSendReply}
                style={styles.replyForm}
              >
                {attachment && (
                  <div
                    style={
                      styles.selectedFile
                    }
                  >
                    <RiAttachment2 />

                    <span>
                      {attachment.name}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setAttachment(
                          null
                        );

                        if (
                          fileInputRef.current
                        ) {
                          fileInputRef.current.value =
                            "";
                        }
                      }}
                      style={
                        styles.removeFileButton
                      }
                    >
                      ×
                    </button>
                  </div>
                )}

                <textarea
                  value={reply}
                  onChange={(event) =>
                    setReply(
                      event.target.value
                    )
                  }
                  placeholder="Введите ответ..."
                  rows={3}
                  disabled={
                    sending ||
                    selectedTicket.status ===
                      "closed"
                  }
                  style={styles.replyInput}
                />

                <div style={styles.replyActions}>
                  <label
                    style={
                      styles.attachButton
                    }
                  >
                    <RiAttachment2 />
                    Прикрепить файл

                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={
                        handleAttachmentChange
                      }
                      accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
                      style={{
                        display: "none",
                      }}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={
                      sending ||
                      (!reply.trim() &&
                        !attachment) ||
                      selectedTicket.status ===
                        "closed"
                    }
                    style={{
                      ...styles.sendButton,
                      ...(sending ||
                      (!reply.trim() &&
                        !attachment) ||
                      selectedTicket.status ===
                        "closed"
                        ? styles.disabledButton
                        : {}),
                    }}
                  >
                    <RiSendPlane2Line />

                    {sending
                      ? "Отправка..."
                      : "Отправить"}
                  </button>
                </div>

                {selectedTicket.status ===
                  "closed" && (
                  <div
                    style={
                      styles.closedMessage
                    }
                  >
                    Обращение закрыто. Измените статус, чтобы продолжить переписку.
                  </div>
                )}
              </form>
            </>
          )}
        </section>
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

  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "11px 16px",
    borderRadius: "11px",
    border:
      "1px solid rgba(99,102,241,0.35)",
    background:
      "rgba(99,102,241,0.15)",
    color: "#c7d2fe",
    fontWeight: 700,
    cursor: "pointer",
  },

  statsRow: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },

  statCard: {
    minWidth: "170px",
    padding: "15px 18px",
    borderRadius: "14px",
    background:
      "rgba(30,41,59,0.45)",
    border:
      "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },

  statValue: {
    fontSize: "24px",
  },

  statLabel: {
    color: "#94a3b8",
    fontSize: "13px",
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

  workspace: {
    display: "grid",
    gridTemplateColumns:
      "minmax(290px, 380px) minmax(0, 1fr)",
    gap: "20px",
    minHeight: "620px",
  },

  ticketPanel: {
    background:
      "rgba(30,41,59,0.43)",
    border:
      "1px solid rgba(255,255,255,0.06)",
    borderRadius: "18px",
    overflow: "hidden",
  },

  filters: {
    padding: "15px",
    borderBottom:
      "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 12px",
    borderRadius: "11px",
    background:
      "rgba(0,0,0,0.2)",
    border:
      "1px solid rgba(255,255,255,0.08)",
    color: "#64748b",
  },

  searchInput: {
    width: "100%",
    padding: "11px 0",
    border: "none",
    background: "transparent",
    outline: "none",
    color: "#ffffff",
  },

  filterSelect: {
    width: "100%",
    padding: "11px 12px",
    borderRadius: "11px",
    border:
      "1px solid rgba(255,255,255,0.08)",
    background: "#111827",
    color: "#ffffff",
    outline: "none",
  },

  ticketList: {
    maxHeight: "560px",
    overflowY: "auto",
    padding: "10px",
  },

  ticketItem: {
    width: "100%",
    marginBottom: "8px",
    padding: "13px",
    border: "1px solid transparent",
    borderRadius: "13px",
    background:
      "rgba(0,0,0,0.15)",
    color: "#ffffff",
    cursor: "pointer",
    display: "flex",
    gap: "11px",
    textAlign: "left",
  },

  activeTicket: {
    background:
      "rgba(99,102,241,0.15)",
    border:
      "1px solid rgba(99,102,241,0.5)",
  },

  ticketIcon: {
    minWidth: "36px",
    height: "36px",
    borderRadius: "10px",
    background:
      "rgba(99,102,241,0.15)",
    color: "#818cf8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },

  ticketContent: {
    minWidth: 0,
    flex: 1,
  },

  ticketTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: "7px",
  },

  ticketSubject: {
    flex: 1,
    fontSize: "14px",
    overflowWrap: "anywhere",
  },

  unreadBadge: {
    minWidth: "20px",
    height: "20px",
    padding: "0 5px",
    borderRadius: "999px",
    background: "#ef4444",
    color: "#ffffff",
    fontSize: "11px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  organizationName: {
    display: "block",
    marginTop: "5px",
    color: "#94a3b8",
    fontSize: "12px",
  },

  ticketBottom: {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
    marginTop: "9px",
  },

  ticketDate: {
    color: "#64748b",
    fontSize: "10px",
  },

  status_open: {
    color: "#fbbf24",
    fontSize: "11px",
    fontWeight: 700,
  },

  status_in_progress: {
    color: "#60a5fa",
    fontSize: "11px",
    fontWeight: 700,
  },

  status_resolved: {
    color: "#34d399",
    fontSize: "11px",
    fontWeight: 700,
  },

  status_closed: {
    color: "#94a3b8",
    fontSize: "11px",
    fontWeight: 700,
  },

  dialogPanel: {
    minWidth: 0,
    background:
      "rgba(30,41,59,0.43)",
    border:
      "1px solid rgba(255,255,255,0.06)",
    borderRadius: "18px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  dialogEmpty: {
    flex: 1,
    minHeight: "600px",
    padding: "30px",
    color: "#64748b",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },

  dialogEmptyIcon: {
    fontSize: "48px",
    color: "#475569",
  },

  dialogHeader: {
    padding: "18px 20px",
    borderBottom:
      "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
  },

  dialogTitle: {
    margin: "0 0 4px",
    fontSize: "20px",
  },

  dialogOrganization: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "13px",
  },

  statusSelect: {
    padding: "9px 12px",
    borderRadius: "10px",
    border:
      "1px solid rgba(255,255,255,0.1)",
    background: "#111827",
    color: "#ffffff",
  },

  messagesBox: {
    flex: 1,
    minHeight: "400px",
    maxHeight: "520px",
    overflowY: "auto",
    padding: "20px",
  },

  messagesEmpty: {
    color: "#64748b",
    textAlign: "center",
    paddingTop: "100px",
  },

  messageRow: {
    display: "flex",
    marginBottom: "13px",
  },

  messageBubble: {
    maxWidth: "78%",
    padding: "12px 14px",
    borderRadius: "14px",
  },

  supportBubble: {
    background: "#4f46e5",
    borderBottomRightRadius: "3px",
  },

  organizationBubble: {
    background:
      "rgba(255,255,255,0.08)",
    borderBottomLeftRadius: "3px",
  },

  messageMeta: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    color: "#cbd5e1",
    fontSize: "10px",
  },

  messageText: {
    margin: "7px 0 0",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },

  attachmentLink: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "10px",
    color: "#ffffff",
    textDecoration: "underline",
    fontSize: "13px",
  },

  replyForm: {
    padding: "15px",
    borderTop:
      "1px solid rgba(255,255,255,0.06)",
  },

  selectedFile: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    marginBottom: "9px",
    padding: "9px 11px",
    borderRadius: "9px",
    background:
      "rgba(99,102,241,0.12)",
    color: "#c7d2fe",
    fontSize: "13px",
  },

  removeFileButton: {
    marginLeft: "auto",
    border: "none",
    background: "transparent",
    color: "#fca5a5",
    fontSize: "20px",
    cursor: "pointer",
  },

  replyInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: "11px",
    border:
      "1px solid rgba(255,255,255,0.1)",
    background:
      "rgba(0,0,0,0.2)",
    color: "#ffffff",
    outline: "none",
    resize: "vertical",
  },

  replyActions: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    marginTop: "10px",
    flexWrap: "wrap",
  },

  attachButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 13px",
    borderRadius: "10px",
    background:
      "rgba(255,255,255,0.06)",
    border:
      "1px solid rgba(255,255,255,0.09)",
    color: "#cbd5e1",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
  },

  sendButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 17px",
    borderRadius: "10px",
    border: "none",
    background: "#059669",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },

  closedMessage: {
    marginTop: "10px",
    color: "#fbbf24",
    fontSize: "12px",
    textAlign: "center",
  },

  emptyState: {
    minHeight: "250px",
    padding: "20px",
    color: "#64748b",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "34px",
  },

  disabledButton: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
};
