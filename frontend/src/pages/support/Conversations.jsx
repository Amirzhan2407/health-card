import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  RiAddLine,
  RiAttachment2,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiFileLine,
  RiLoader4Line,
  RiQuestionAnswerLine,
  RiRefreshLine,
  RiSendPlane2Line,
} from "react-icons/ri";

import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";

const STATUS_VALUES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const TEXTS = {
  ru: {
    statusOpen: "Открыто",
    statusInProgress: "В работе",
    statusResolved: "Решено",
    statusClosed: "Закрыто",

    organizationFallback: "Медицинская организация",
    supportSender: "Техническая поддержка",
    organizationSender: "Представитель организации",
    openAttachment: "Открыть вложение",

    loadTicketsError: "Не удалось загрузить обращения.",
    openTicketError: "Не удалось открыть обращение.",
    messageSent: "Сообщение отправлено.",
    sendMessageError: "Не удалось отправить сообщение.",
    statusChanged: (status) => `Статус изменён: ${status}.`,
    changeStatusError: "Не удалось изменить статус обращения.",
    attachmentTooLarge:
      "Размер вложения не должен превышать 10 МБ.",
    createTicketError: "Не удалось создать обращение.",
    ticketCreated: "Обращение успешно создано.",
    subjectRequired: "Укажите тему обращения.",
    descriptionRequired:
      "Опишите проблему или прикрепите файл.",

    supportPageTitle: "Обращения в техподдержку",
    supportPageSubtitle:
      "Переписка с администраторами медицинских организаций.",

    adminPageTitle: "Техническая поддержка",
    adminPageSubtitle:
      "Создавайте обращения и получайте ответы технической поддержки.",

    refreshing: "Обновление...",
    refresh: "Обновить",
    newTicket: "Новое обращение",

    supportTotalTickets: "Всего обращений",
    supportNeedProcessing: "Требуют обработки",
    adminTotalTickets: "Мои обращения",
    adminNeedProcessing: "Открытые обращения",

    searchPlaceholder: "Поиск обращений",
    allStatuses: "Все статусы",
    loadingTickets: "Загрузка обращений...",
    noTickets: "Обращений нет",
    supportNewTicketsHere:
      "Новые обращения организаций появятся здесь.",
    adminNewTicketsHere:
      "Создайте первое обращение в техническую поддержку.",
    noSubject: "Без темы",

    selectTicket: "Выберите обращение",
    selectTicketDescription:
      "Откройте обращение слева, чтобы увидеть историю переписки.",
    loadingConversation: "Загрузка переписки...",
    noMessages: "Сообщений пока нет.",

    replyPlaceholder: "Введите сообщение...",
    attachFile: "Прикрепить файл",
    sending: "Отправка...",
    send: "Отправить",

    supportClosedConversation:
      "Обращение закрыто. Измените статус, чтобы продолжить переписку.",
    adminClosedConversation:
      "Обращение закрыто. Для нового вопроса создайте новое обращение.",

    createModalTitle: "Новое обращение",
    createModalSubtitle:
      "Опишите проблему, и техническая поддержка ответит в этом чате.",
    subjectLabel: "Тема обращения",
    subjectPlaceholder: "Например: проблема с расписанием",
    descriptionLabel: "Описание проблемы",
    descriptionPlaceholder:
      "Подробно опишите, что произошло и какие действия уже пробовали выполнить.",
    selectedFile: "Выбранный файл",
    cancel: "Отмена",
    creating: "Создание...",
    create: "Создать обращение",
  },

  kk: {
    statusOpen: "Ашық",
    statusInProgress: "Орындалуда",
    statusResolved: "Шешілді",
    statusClosed: "Жабық",

    organizationFallback: "Медициналық ұйым",
    supportSender: "Техникалық қолдау",
    organizationSender: "Ұйым өкілі",
    openAttachment: "Тіркемені ашу",

    loadTicketsError: "Өтініштерді жүктеу мүмкін болмады.",
    openTicketError: "Өтінішті ашу мүмкін болмады.",
    messageSent: "Хабарлама жіберілді.",
    sendMessageError: "Хабарламаны жіберу мүмкін болмады.",
    statusChanged: (status) => `Мәртебе өзгертілді: ${status}.`,
    changeStatusError:
      "Өтініш мәртебесін өзгерту мүмкін болмады.",
    attachmentTooLarge:
      "Тіркеме көлемі 10 МБ-тан аспауы керек.",
    createTicketError: "Өтінішті құру мүмкін болмады.",
    ticketCreated: "Өтініш сәтті құрылды.",
    subjectRequired: "Өтініш тақырыбын көрсетіңіз.",
    descriptionRequired:
      "Мәселені сипаттаңыз немесе файл тіркеңіз.",

    supportPageTitle: "Техникалық қолдау өтініштері",
    supportPageSubtitle:
      "Медициналық ұйым әкімшілерімен хат алмасу.",

    adminPageTitle: "Техникалық қолдау",
    adminPageSubtitle:
      "Өтініштер құрыңыз және техникалық қолдау жауабын алыңыз.",

    refreshing: "Жаңартылуда...",
    refresh: "Жаңарту",
    newTicket: "Жаңа өтініш",

    supportTotalTickets: "Барлық өтініштер",
    supportNeedProcessing: "Өңдеуді қажет етеді",
    adminTotalTickets: "Менің өтініштерім",
    adminNeedProcessing: "Ашық өтініштер",

    searchPlaceholder: "Өтініштерді іздеу",
    allStatuses: "Барлық мәртебелер",
    loadingTickets: "Өтініштер жүктелуде...",
    noTickets: "Өтініштер жоқ",
    supportNewTicketsHere:
      "Ұйымдардың жаңа өтініштері осында пайда болады.",
    adminNewTicketsHere:
      "Техникалық қолдауға алғашқы өтінішті құрыңыз.",
    noSubject: "Тақырыпсыз",

    selectTicket: "Өтінішті таңдаңыз",
    selectTicketDescription:
      "Хат алмасу тарихын көру үшін сол жақтан өтінішті ашыңыз.",
    loadingConversation: "Хат алмасу жүктелуде...",
    noMessages: "Әзірге хабарламалар жоқ.",

    replyPlaceholder: "Хабарламаны енгізіңіз...",
    attachFile: "Файл тіркеу",
    sending: "Жіберілуде...",
    send: "Жіберу",

    supportClosedConversation:
      "Өтініш жабық. Хат алмасуды жалғастыру үшін мәртебені өзгертіңіз.",
    adminClosedConversation:
      "Өтініш жабық. Жаңа сұрақ үшін жаңа өтініш құрыңыз.",

    createModalTitle: "Жаңа өтініш",
    createModalSubtitle:
      "Мәселені сипаттаңыз, техникалық қолдау осы чатта жауап береді.",
    subjectLabel: "Өтініш тақырыбы",
    subjectPlaceholder: "Мысалы: кестеге қатысты мәселе",
    descriptionLabel: "Мәселенің сипаттамасы",
    descriptionPlaceholder:
      "Не болғанын және қандай әрекеттер жасағаныңызды толық сипаттаңыз.",
    selectedFile: "Таңдалған файл",
    cancel: "Бас тарту",
    creating: "Құрылуда...",
    create: "Өтініш құру",
  },
};

function getStatusLabel(status, text) {
  const labels = {
    open: text.statusOpen,
    in_progress: text.statusInProgress,
    resolved: text.statusResolved,
    closed: text.statusClosed,
  };

  return labels[status] || status || text.statusOpen;
}

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

function formatDateTime(value, locale) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOrganizationName(ticket, text) {
  return (
    ticket?.organization?.name ||
    ticket?.organization_name ||
    ticket?.clinic_name ||
    text.organizationFallback
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

function getSenderName(
  message,
  text,
  ticket
) {
  if (
    getSenderRole(message) ===
    "support"
  ) {
    return (
      message?.sender?.fullName ||
      message?.sender?.full_name ||
      message?.sender_name ||
      text.supportSender
    );
  }

  return getOrganizationName(
    ticket,
    text
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

function getAttachmentName(message, text) {
  return (
    message?.attachment_name ||
    message?.attachmentName ||
    message?.file_name ||
    text.openAttachment
  );
}

export default function Conversations() {
  const { user } = useAuth();
  const { language } = useLanguage();

  const currentLanguage = String(language || "ru")
    .trim()
    .toLowerCase();

  const isKazakh = [
    "kk",
    "kz",
    "kaz",
    "kk-kz",
    "kz-kz",
  ].includes(currentLanguage);

  const text = isKazakh ? TEXTS.kk : TEXTS.ru;
  const dateLocale = isKazakh ? "kk-KZ" : "ru-RU";

  const isSupport = user?.role === "support";
  const isOrganizationAdmin =
    user?.role === "organization_admin";

  const statusOptions = useMemo(
    () =>
      STATUS_VALUES.map((value) => ({
        value,
        label: getStatusLabel(value, text),
      })),
    [text]
  );

  const localizedErrorMessage = useCallback(
    (error, fallback) =>
      isKazakh
        ? fallback
        : getErrorMessage(error, fallback),
    [isKazakh]
  );

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

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [newSubject, setNewSubject] =
    useState("");

  const [newDescription, setNewDescription] =
    useState("");

  const [newAttachment, setNewAttachment] =
    useState(null);

  const [creatingTicket, setCreatingTicket] =
    useState(false);

  const fileInputRef = useRef(null);
  const createFileInputRef = useRef(null);
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
        localizedErrorMessage(
          error,
          text.loadTicketsError
        )
      );
    } finally {
      setLoadingTickets(false);
    }
  }, [localizedErrorMessage, text.loadTicketsError]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (
      !isOrganizationAdmin ||
      loadingTickets ||
      selectedTicket?.id ||
      tickets.length === 0
    ) {
      return;
    }

    openTicket(tickets[0]);
  }, [
    isOrganizationAdmin,
    loadingTickets,
    selectedTicket?.id,
    tickets,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [selectedTicket]);

  useEffect(() => {
    if (!selectedTicket?.id) {
      return undefined;
    }

    const intervalId = window.setInterval(
      async () => {
        try {
          const response = await api.get(
            `/support/conversations/${selectedTicket.id}`
          );

          const conversation =
            extractConversation(response);

          setSelectedTicket((current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              ...conversation,
              messages:
                conversation?.messages ||
                conversation?.support_messages ||
                [],
            };
          });
        } catch {
          // Фоновое обновление не должно мешать работе страницы.
        }
      },
      15000
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [selectedTicket?.id]);

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
        getOrganizationName(ticket, text),
        ticket?.organization?.bin,
        ticket?.organization_bin,
        ticket?.created_by_profile?.full_name,
        ticket?.created_by?.full_name,
        ticket?.created_by_name,
      ];

      return searchableValues.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [tickets, search, statusFilter, text]);

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
        localizedErrorMessage(
          error,
          text.openTicketError
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
        text.messageSent
      );
    } catch (error) {
      setErrorMessage(
        localizedErrorMessage(
          error,
          text.sendMessageError
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
      !isSupport ||
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
        text.statusChanged(
          getStatusLabel(nextStatus, text)
        )
      );
    } catch (error) {
      setErrorMessage(
        localizedErrorMessage(
          error,
          text.changeStatusError
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
      selectedFile.size > MAX_FILE_SIZE
    ) {
      setErrorMessage(
        text.attachmentTooLarge
      );

      event.target.value = "";
      return;
    }

    setErrorMessage("");
    setAttachment(selectedFile);
  }

  function handleCreateAttachmentChange(event) {
    const selectedFile =
      event.target.files?.[0] || null;

    if (
      selectedFile &&
      selectedFile.size > MAX_FILE_SIZE
    ) {
      setErrorMessage(
        text.attachmentTooLarge
      );

      event.target.value = "";
      return;
    }

    setErrorMessage("");
    setNewAttachment(selectedFile);
  }

  function resetCreateForm() {
    setNewSubject("");
    setNewDescription("");
    setNewAttachment(null);

    if (createFileInputRef.current) {
      createFileInputRef.current.value = "";
    }
  }

  function closeCreateModal() {
    if (creatingTicket) {
      return;
    }

    resetCreateForm();
    setShowCreateModal(false);
  }

  async function handleCreateTicket(event) {
    event.preventDefault();

    if (
      creatingTicket ||
      !isOrganizationAdmin
    ) {
      return;
    }

    const subject = newSubject.trim();
    const description =
      newDescription.trim();

    if (!subject) {
      setErrorMessage(
        text.subjectRequired
      );
      return;
    }

    if (
      !description &&
      !newAttachment
    ) {
      setErrorMessage(
        text.descriptionRequired
      );
      return;
    }

    setCreatingTicket(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      let response;

      if (newAttachment) {
        const formData = new FormData();

        formData.append(
          "subject",
          subject
        );

        formData.append(
          "description",
          description
        );

        formData.append(
          "attachment",
          newAttachment
        );

        response = await api.post(
          "/support/conversations",
          formData
        );
      } else {
        response = await api.post(
          "/support/conversations",
          {
            subject,
            description,
          }
        );
      }

      const createdConversation =
        extractConversation(response);

      resetCreateForm();
      setShowCreateModal(false);

      await loadTickets();

      if (createdConversation?.id) {
        await openTicket(
          createdConversation
        );
      }

      setSuccessMessage(
        text.ticketCreated
      );
    } catch (error) {
      setErrorMessage(
        localizedErrorMessage(
          error,
          text.createTicketError
        )
      );
    } finally {
      setCreatingTicket(false);
    }
  }

  const messages = getMessages(
    selectedTicket
  );

  const pageTitle = isSupport
    ? text.supportPageTitle
    : text.adminPageTitle;

  const pageSubtitle = isSupport
    ? text.supportPageSubtitle
    : text.adminPageSubtitle;

  const totalLabel = isSupport
    ? text.supportTotalTickets
    : text.adminTotalTickets;

  const processingLabel = isSupport
    ? text.supportNeedProcessing
    : text.adminNeedProcessing;

  const noTicketsDescription =
    text.supportNewTicketsHere;

  const closedConversationText = isSupport
    ? text.supportClosedConversation
    : text.adminClosedConversation;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            {pageTitle}
          </h1>

          <p style={styles.subtitle}>
            {pageSubtitle}
          </p>
        </div>

        <div style={styles.headerActions}>
          {isOrganizationAdmin &&
            (tickets.length === 0 ||
              selectedTicket?.status ===
                "closed") && (
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                setSuccessMessage("");
                setShowCreateModal(true);
              }}
              style={styles.newTicketButton}
            >
              <RiAddLine />
              {text.newTicket}
            </button>
          )}

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
            {loadingTickets
              ? text.refreshing
              : text.refresh}
          </button>
        </div>
      </div>

      {isSupport && (
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <strong style={styles.statValue}>
              {tickets.length}
            </strong>
            <span style={styles.statLabel}>
              {totalLabel}
            </span>
          </div>

          <div style={styles.statCard}>
            <strong style={styles.statValue}>
              {openCount}
            </strong>
            <span style={styles.statLabel}>
              {processingLabel}
            </span>
          </div>
        </div>
      )}

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

      <div
        style={{
          ...styles.workspace,
          gridTemplateColumns: isSupport
            ? "minmax(290px, 380px) minmax(0, 1fr)"
            : "minmax(0, 1fr)",
        }}
      >
        {isSupport && (
          <aside style={styles.ticketPanel}>
          <div style={styles.ticketList}>
            {loadingTickets ? (
              <div style={styles.emptyState}>
                <RiLoader4Line
                  style={styles.emptyIcon}
                />
                {text.loadingTickets}
              </div>
            ) : filteredTickets.length ===
              0 ? (
              <div style={styles.emptyState}>
                <RiQuestionAnswerLine
                  style={styles.emptyIcon}
                />

                <strong>
                  {text.noTickets}
                </strong>

                <span>
                  {noTicketsDescription}
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
                              text.noSubject}
                          </strong>

                          {unreadCount > 0 && (
                            <span
                              style={
                                styles.unreadBadge
                              }
                            >
                              {unreadCount}
                            </span>
                          )}
                        </div>

                        {isSupport && (
                          <span
                            style={
                              styles.organizationName
                            }
                          >
                            {getOrganizationName(
                              ticket,
                              text
                            )}
                          </span>
                        )}

                        <div
                          style={{
                            ...styles.ticketBottom,
                            justifyContent:
                              isSupport
                                ? "space-between"
                                : "flex-end",
                          }}
                        >
                          {isSupport && (
                            <span
                              style={
                                styles[
                                  `status_${ticket?.status}`
                                ] ||
                                styles.status_open
                              }
                            >
                              {getStatusLabel(
                                ticket?.status,
                                text
                              )}
                            </span>
                          )}

                          <span
                            style={
                              styles.ticketDate
                            }
                          >
                            {formatDateTime(
                              ticket?.updated_at ||
                                ticket?.created_at,
                              dateLocale
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
        )}

        <section style={styles.dialogPanel}>
          {loadingDialog ? (
            <div style={styles.dialogEmpty}>
              {text.loadingConversation}
            </div>
          ) : !selectedTicket ? (
            <div style={styles.dialogEmpty}>
              {loadingTickets ? (
                <>
                  <RiLoader4Line
                    style={styles.dialogEmptyIcon}
                  />

                  <h2>
                    {text.loadingTickets}
                  </h2>
                </>
              ) : isOrganizationAdmin ? (
                <>
                  <RiQuestionAnswerLine
                    style={styles.dialogEmptyIcon}
                  />

                  <h2>
                    {text.noTickets}
                  </h2>

                  <p>
                    {text.adminNewTicketsHere}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage("");
                      setSuccessMessage("");
                      setShowCreateModal(true);
                    }}
                    style={styles.newTicketButton}
                  >
                    <RiAddLine />
                    {text.newTicket}
                  </button>
                </>
              ) : (
                <>
                  <RiQuestionAnswerLine
                    style={styles.dialogEmptyIcon}
                  />

                  <h2>
                    {text.selectTicket}
                  </h2>

                  <p>
                    {text.selectTicketDescription}
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <div style={styles.dialogHeader}>
                <div>
                  <h2 style={styles.dialogTitle}>
                    {selectedTicket.subject ||
                      text.noSubject}
                  </h2>

                  <p
                    style={
                      styles.dialogOrganization
                    }
                  >
                    {isSupport
                      ? getOrganizationName(
                          selectedTicket,
                          text
                        )
                      : text.supportSender}
                  </p>
                </div>

                {isSupport && (
                  <select
                    value={
                      selectedTicket.status ||
                      "open"
                    }
                    disabled={
                      changingStatus
                    }
                    onChange={(event) =>
                      handleStatusChange(
                        event.target.value
                      )
                    }
                    style={
                      styles.statusSelect
                    }
                  >
                    {statusOptions.map(
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
                )}
              </div>

              <div style={styles.messagesBox}>
                {messages.length === 0 ? (
                  <div
                    style={
                      styles.messagesEmpty
                    }
                  >
                    {text.noMessages}
                  </div>
                ) : (
                  messages.map(
                    (message, index) => {
                      const senderRole =
                        getSenderRole(message);

                      const isOwnMessage =
                        senderRole ===
                        user?.role;

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
                              isOwnMessage
                                ? "flex-end"
                                : "flex-start",
                          }}
                        >
                          <div
                            style={{
                              ...styles.messageBubble,
                              ...(isOwnMessage
                                ? styles.ownBubble
                                : styles.otherBubble),
                            }}
                          >
                            <div
                              style={
                                styles.messageMeta
                              }
                            >
                              <strong>
                                {getSenderName(
                                  message,
                                  text,
                                  selectedTicket
                                )}
                              </strong>

                              <span>
                                {formatDateTime(
                                  message?.created_at,
                                  dateLocale
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
                                  message,
                                  text
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
                        setAttachment(null);

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
                  placeholder={
                    text.replyPlaceholder
                  }
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
                    style={{
                      ...styles.attachButton,
                      ...(selectedTicket.status ===
                      "closed"
                        ? styles.disabledButton
                        : {}),
                    }}
                  >
                    <RiAttachment2 />
                    {text.attachFile}

                    <input
                      ref={fileInputRef}
                      type="file"
                      disabled={
                        selectedTicket.status ===
                        "closed"
                      }
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
                      ? text.sending
                      : text.send}
                  </button>
                </div>

                {selectedTicket.status ===
                  "closed" && (
                  <div
                    style={
                      styles.closedMessage
                    }
                  >
                    {closedConversationText}
                  </div>
                )}
              </form>
            </>
          )}
        </section>
      </div>

      {showCreateModal &&
        isOrganizationAdmin && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>
                    {text.createModalTitle}
                  </h2>

                  <p
                    style={
                      styles.modalSubtitle
                    }
                  >
                    {text.createModalSubtitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creatingTicket}
                  style={styles.modalCloseButton}
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={handleCreateTicket}
                style={styles.createForm}
              >
                <label style={styles.formLabel}>
                  <span>
                    {text.subjectLabel}
                  </span>

                  <input
                    type="text"
                    value={newSubject}
                    onChange={(event) =>
                      setNewSubject(
                        event.target.value
                      )
                    }
                    maxLength={200}
                    placeholder={
                      text.subjectPlaceholder
                    }
                    disabled={creatingTicket}
                    style={styles.formInput}
                  />
                </label>

                <label style={styles.formLabel}>
                  <span>
                    {text.descriptionLabel}
                  </span>

                  <textarea
                    value={newDescription}
                    onChange={(event) =>
                      setNewDescription(
                        event.target.value
                      )
                    }
                    rows={6}
                    maxLength={5000}
                    placeholder={
                      text.descriptionPlaceholder
                    }
                    disabled={creatingTicket}
                    style={styles.formTextarea}
                  />
                </label>

                {newAttachment && (
                  <div
                    style={
                      styles.selectedFile
                    }
                  >
                    <RiAttachment2 />

                    <span>
                      {text.selectedFile}:{" "}
                      {newAttachment.name}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setNewAttachment(null);

                        if (
                          createFileInputRef.current
                        ) {
                          createFileInputRef.current.value =
                            "";
                        }
                      }}
                      disabled={creatingTicket}
                      style={
                        styles.removeFileButton
                      }
                    >
                      ×
                    </button>
                  </div>
                )}

                <label
                  style={
                    styles.createAttachButton
                  }
                >
                  <RiAttachment2 />
                  {text.attachFile}

                  <input
                    ref={createFileInputRef}
                    type="file"
                    disabled={creatingTicket}
                    onChange={
                      handleCreateAttachmentChange
                    }
                    accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
                    style={{
                      display: "none",
                    }}
                  />
                </label>

                <div
                  style={
                    styles.modalActions
                  }
                >
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    disabled={creatingTicket}
                    style={
                      styles.cancelButton
                    }
                  >
                    {text.cancel}
                  </button>

                  <button
                    type="submit"
                    disabled={creatingTicket}
                    style={{
                      ...styles.createButton,
                      ...(creatingTicket
                        ? styles.disabledButton
                        : {}),
                    }}
                  >
                    {creatingTicket
                      ? text.creating
                      : text.create}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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

  headerActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
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

  newTicketButton: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "11px 16px",
    borderRadius: "11px",
    border: "none",
    background: "#059669",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
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

  statusBadge: {
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 800,
  },

  statusBadge_open: {
    color: "#fbbf24",
    background:
      "rgba(251,191,36,0.12)",
  },

  statusBadge_in_progress: {
    color: "#60a5fa",
    background:
      "rgba(96,165,250,0.12)",
  },

  statusBadge_resolved: {
    color: "#34d399",
    background:
      "rgba(52,211,153,0.12)",
  },

  statusBadge_closed: {
    color: "#94a3b8",
    background:
      "rgba(148,163,184,0.12)",
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

  ownBubble: {
    background: "#4f46e5",
    borderBottomRightRadius: "3px",
  },

  otherBubble: {
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

  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background:
      "rgba(2,6,23,0.78)",
    backdropFilter: "blur(5px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },

  modal: {
    width: "100%",
    maxWidth: "620px",
    maxHeight: "90vh",
    overflowY: "auto",
    borderRadius: "18px",
    background: "#111827",
    border:
      "1px solid rgba(255,255,255,0.1)",
    boxShadow:
      "0 24px 80px rgba(0,0,0,0.45)",
  },

  modalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    padding: "20px",
    borderBottom:
      "1px solid rgba(255,255,255,0.08)",
  },

  modalTitle: {
    margin: "0 0 6px",
    fontSize: "22px",
  },

  modalSubtitle: {
    margin: 0,
    color: "#94a3b8",
    lineHeight: 1.5,
  },

  modalCloseButton: {
    border: "none",
    background: "transparent",
    color: "#94a3b8",
    fontSize: "28px",
    cursor: "pointer",
  },

  createForm: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  formLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#e2e8f0",
    fontSize: "13px",
    fontWeight: 700,
  },

  formInput: {
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
  },

  formTextarea: {
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

  createAttachButton: {
    display: "inline-flex",
    width: "fit-content",
    alignItems: "center",
    gap: "7px",
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

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "4px",
  },

  cancelButton: {
    padding: "10px 15px",
    borderRadius: "10px",
    border:
      "1px solid rgba(255,255,255,0.1)",
    background:
      "rgba(255,255,255,0.05)",
    color: "#e2e8f0",
    cursor: "pointer",
    fontWeight: 700,
  },

  createButton: {
    padding: "10px 17px",
    borderRadius: "10px",
    border: "none",
    background: "#059669",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },

  disabledButton: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
};
