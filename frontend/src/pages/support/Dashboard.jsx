
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  RiBuilding4Line,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDeleteBinLine,
  RiFileList2Line,
  RiLockLine,
  RiRefreshLine,
  RiSearchLine,
  RiShieldCheckLine,
} from "react-icons/ri";

import api from "../../api/api";

import { useLanguage } from "../../i18n/LanguageContext";

const TEXTS = {
  ru: {
    applicationStatusLabels: {
      pending: "Ожидает рассмотрения",
      approved: "Одобрена",
      rejected: "Отклонена",
    },
    organizationStatusLabels: {
      active: "Активна",
      blocked: "Заблокирована",
      pending: "Ожидает подключения",
      archived: "В архиве",
    },

    dateNotSpecified: "Дата не указана",
    medicalOrganization: "Медицинская организация",
    binNotSpecified: "не указан",

    loadDashboardError:
      "Не удалось загрузить данные кабинета техподдержки.",
    organizationsLoadedApplicationsUnavailable:
      "Организации загружены, но список заявок недоступен.",
    applicationsLoadedOrganizationsUnavailable:
      "Заявки загружены, но список организаций недоступен.",

    applicationMissingId:
      "У заявки отсутствует идентификатор.",
    promptAdminUsername: (name, bin) =>
      `Введите логин администратора организации.\n\nОрганизация: ${name}\nБИН: ${bin}`,
    invalidUsername:
      "Логин должен содержать от 3 до 30 латинских букв, цифр или символов . _ -",
    confirmApprove: (name, bin, username) =>
      `Одобрить заявку?\n\nОрганизация: ${name}\nБИН: ${bin}\nЛогин администратора: ${username}\n\nНа Email будут отправлены БИН, логин и временный пароль.`,
    applicationApproved:
      "Заявка одобрена. Данные для входа отправлены на Email.",
    approveApplicationError:
      "Не удалось одобрить заявку.",
    promptRejectReason:
      "Укажите причину отклонения заявки:",
    applicationRejected: "Заявка отклонена.",
    rejectApplicationError:
      "Не удалось отклонить заявку.",

    organizationMissingId:
      "У организации отсутствует идентификатор.",
    confirmBlockOrganization: (name) =>
      `Вы действительно хотите заблокировать организацию «${name}»?`,
    confirmUnblockOrganization: (name) =>
      `Вы действительно хотите разблокировать организацию «${name}»?`,
    organizationBlocked:
      "Организация заблокирована.",
    organizationUnblocked:
      "Организация разблокирована.",
    blockOrganizationError:
      "Не удалось заблокировать организацию.",
    unblockOrganizationError:
      "Не удалось разблокировать организацию.",
    confirmDeleteOrganization: (name, bin) =>
      `Полностью удалить организацию?\n\nОрганизация: ${name}\nБИН: ${bin}\n\nБудут удалены организация, её администратор, активные сессии, обращения и уведомления.`,
    organizationDeleted: (name) =>
      `Организация «${name}» удалена.`,
    deleteOrganizationError:
      "Не удалось удалить организацию.",

    pageTitle: "Техническая поддержка",
    pageSubtitle:
      "Управление заявками и подключёнными медицинскими организациями.",
    updating: "Обновление...",
    refresh: "Обновить",

    pendingApplications:
      "Заявок на рассмотрении",
    totalOrganizations:
      "Всего организаций",
    activeOrganizations:
      "Активных организаций",
    blockedOrganizations:
      "Заблокированных",

    searchPlaceholder:
      "Поиск по названию, БИН, городу или Email",
    loadingDashboard:
      "Загрузка данных кабинета техподдержки...",

    applicationsTitle:
      "Заявки организаций",
    applicationsSubtitle:
      "Новые заявки на подключение к Clinic OS",
    noNewApplications:
      "Новых заявок нет",
    allApplicationsProcessed:
      "Все поступившие заявки обработаны.",

    binLabel: "БИН",
    cityLabel: "Город",
    representativeLabel: "Представитель",
    emailLabel: "Email",
    receivedLabel: "Получена",
    processing: "Обработка...",
    approve: "Одобрить",
    reject: "Отклонить",

    organizationsTitle:
      "Медицинские организации",
    organizationsSubtitle:
      "Подключённые поликлиники и их статусы",
    noOrganizations:
      "Организации не найдены",
    organizationsAppear:
      "Подключённые организации появятся здесь.",
    unblock: "Разблокировать",
    block: "Заблокировать",
    delete: "Удалить",
  },

  kk: {
    applicationStatusLabels: {
      pending: "Қаралуда",
      approved: "Мақұлданды",
      rejected: "Қабылданбады",
    },
    organizationStatusLabels: {
      active: "Белсенді",
      blocked: "Бұғатталған",
      pending: "Қосылуды күтуде",
      archived: "Мұрағатта",
    },

    dateNotSpecified: "Күні көрсетілмеген",
    medicalOrganization: "Медициналық ұйым",
    binNotSpecified: "көрсетілмеген",

    loadDashboardError:
      "Техникалық қолдау кабинетінің деректерін жүктеу мүмкін болмады.",
    organizationsLoadedApplicationsUnavailable:
      "Ұйымдар жүктелді, бірақ өтінімдер тізімі қолжетімсіз.",
    applicationsLoadedOrganizationsUnavailable:
      "Өтінімдер жүктелді, бірақ ұйымдар тізімі қолжетімсіз.",

    applicationMissingId:
      "Өтінімнің идентификаторы жоқ.",
    promptAdminUsername: (name, bin) =>
      `Ұйым әкімшісінің логинін енгізіңіз.\n\nҰйым: ${name}\nБСН: ${bin}`,
    invalidUsername:
      "Логин 3-тен 30-ға дейін латын әріптерінен, сандардан немесе . _ - таңбаларынан тұруы керек.",
    confirmApprove: (name, bin, username) =>
      `Өтінімді мақұлдау керек пе?\n\nҰйым: ${name}\nБСН: ${bin}\nӘкімші логині: ${username}\n\nEmail-ге БСН, логин және уақытша құпиясөз жіберіледі.`,
    applicationApproved:
      "Өтінім мақұлданды. Кіру деректері Email-ге жіберілді.",
    approveApplicationError:
      "Өтінімді мақұлдау мүмкін болмады.",
    promptRejectReason:
      "Өтінімді қабылдамау себебін көрсетіңіз:",
    applicationRejected:
      "Өтінім қабылданбады.",
    rejectApplicationError:
      "Өтінімді қабылдамау мүмкін болмады.",

    organizationMissingId:
      "Ұйымның идентификаторы жоқ.",
    confirmBlockOrganization: (name) =>
      `«${name}» ұйымын бұғаттау керек пе?`,
    confirmUnblockOrganization: (name) =>
      `«${name}» ұйымын бұғаттан шығару керек пе?`,
    organizationBlocked:
      "Ұйым бұғатталды.",
    organizationUnblocked:
      "Ұйым бұғаттан шығарылды.",
    blockOrganizationError:
      "Ұйымды бұғаттау мүмкін болмады.",
    unblockOrganizationError:
      "Ұйымды бұғаттан шығару мүмкін болмады.",
    confirmDeleteOrganization: (name, bin) =>
      `Ұйымды толығымен жою керек пе?\n\nҰйым: ${name}\nБСН: ${bin}\n\nҰйым, оның әкімшісі, белсенді сессиялары, өтініштері және хабарландырулары жойылады.`,
    organizationDeleted: (name) =>
      `«${name}» ұйымы жойылды.`,
    deleteOrganizationError:
      "Ұйымды жою мүмкін болмады.",

    pageTitle: "Техникалық қолдау",
    pageSubtitle:
      "Өтінімдер мен қосылған медициналық ұйымдарды басқару.",
    updating: "Жаңартылуда...",
    refresh: "Жаңарту",

    pendingApplications:
      "Қаралудағы өтінімдер",
    totalOrganizations:
      "Барлық ұйымдар",
    activeOrganizations:
      "Белсенді ұйымдар",
    blockedOrganizations:
      "Бұғатталған ұйымдар",

    searchPlaceholder:
      "Атауы, БСН, қала немесе Email бойынша іздеу",
    loadingDashboard:
      "Техникалық қолдау кабинетінің деректері жүктелуде...",

    applicationsTitle:
      "Ұйымдардың өтінімдері",
    applicationsSubtitle:
      "Clinic OS жүйесіне қосылуға арналған жаңа өтінімдер",
    noNewApplications:
      "Жаңа өтінімдер жоқ",
    allApplicationsProcessed:
      "Барлық түскен өтінімдер өңделді.",

    binLabel: "БСН",
    cityLabel: "Қала",
    representativeLabel: "Өкіл",
    emailLabel: "Email",
    receivedLabel: "Алынған күні",
    processing: "Өңделуде...",
    approve: "Мақұлдау",
    reject: "Қабылдамау",

    organizationsTitle:
      "Медициналық ұйымдар",
    organizationsSubtitle:
      "Қосылған емханалар және олардың мәртебелері",
    noOrganizations:
      "Ұйымдар табылмады",
    organizationsAppear:
      "Қосылған ұйымдар осы жерде көрсетіледі.",
    unblock: "Бұғаттан шығару",
    block: "Бұғаттау",
    delete: "Жою",
  },
};


function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function extractArray(response) {
  const body = response?.data;

  if (Array.isArray(body)) {
    return body;
  }

  if (Array.isArray(body?.data)) {
    return body.data;
  }

  return [];
}

function formatDate(value, text, locale) {
  if (!value) {
    return text.dateNotSpecified;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return text.dateNotSpecified;
  }

  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function applicationName(application, text) {
  return (
    application?.organization_name ||
    application?.name ||
    text.medicalOrganization
  );
}

function organizationName(organization, text) {
  return (
    organization?.name ||
    organization?.organization_name ||
    text.medicalOrganization
  );
}

export default function SupportDashboard() {
  const { language } = useLanguage();

  const currentLanguage = String(language || "ru")
    .trim()
    .toLowerCase();

  const isKazakh = [
    "kk",
    "kz",
    "kaz",
    "kazakh",
    "kk-kz",
  ].includes(currentLanguage);

  const text = isKazakh ? TEXTS.kk : TEXTS.ru;
  const locale = isKazakh ? "kk-KZ" : "ru-RU";

  const applicationStatusLabels =
    text.applicationStatusLabels;

  const organizationStatusLabels =
    text.organizationStatusLabels;

  const localizedResponseMessage = (
    response,
    fallback
  ) =>
    isKazakh
      ? fallback
      : response?.data?.message || fallback;

  const localizedErrorMessage = (
    error,
    fallback
  ) =>
    isKazakh
      ? fallback
      : getErrorMessage(error, fallback);

  const [applications, setApplications] =
    useState([]);

  const [organizations, setOrganizations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [actionId, setActionId] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadApplications =
    useCallback(async () => {
      const response = await api.get(
        "/applications?status=pending"
      );

      return extractArray(response);
    }, []);

  const loadOrganizations =
    useCallback(async () => {
      const response = await api.get(
        "/organizations"
      );

      return extractArray(response);
    }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const results =
      await Promise.allSettled([
        loadApplications(),
        loadOrganizations(),
      ]);

    const applicationsResult =
      results[0];

    const organizationsResult =
      results[1];

    if (
      applicationsResult.status ===
      "fulfilled"
    ) {
      setApplications(
        applicationsResult.value
      );
    } else {
      setApplications([]);
    }

    if (
      organizationsResult.status ===
      "fulfilled"
    ) {
      setOrganizations(
        organizationsResult.value
      );
    } else {
      setOrganizations([]);
    }

    if (
      applicationsResult.status ===
        "rejected" &&
      organizationsResult.status ===
        "rejected"
    ) {
      setErrorMessage(
        localizedErrorMessage(
          applicationsResult.reason,
          text.loadDashboardError
        )
      );
    } else if (
      applicationsResult.status ===
      "rejected"
    ) {
      setErrorMessage(
        text.organizationsLoadedApplicationsUnavailable
      );
    } else if (
      organizationsResult.status ===
      "rejected"
    ) {
      setErrorMessage(
        text.applicationsLoadedOrganizationsUnavailable
      );
    }

    setLoading(false);
  }, [
    loadApplications,
    loadOrganizations,
    isKazakh,
    text,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredApplications =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) {
        return applications;
      }

      return applications.filter(
        (application) => {
          const values = [
            applicationName(application, text),
            application?.bin,
            application?.city,
            application?.admin_name,
            application?.contact_email,
            application?.contact_phone,
          ];

          return values.some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [applications, search, text]);

  const filteredOrganizations =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) {
        return organizations;
      }

      return organizations.filter(
        (organization) => {
          const values = [
            organizationName(
              organization,
              text
            ),
            organization?.bin,
            organization?.city,
            organization?.status,
            organization?.email,
          ];

          return values.some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [organizations, search, text]);

  const activeOrganizationsCount =
    useMemo(
      () =>
        organizations.filter(
          (organization) =>
            String(
              organization?.status || ""
            ).toLowerCase() === "active"
        ).length,
      [organizations]
    );

  const blockedOrganizationsCount =
    useMemo(
      () =>
        organizations.filter(
          (organization) =>
            String(
              organization?.status || ""
            ).toLowerCase() ===
            "blocked"
        ).length,
      [organizations]
    );

  async function approveApplication(
    application
  ) {
    const applicationId =
      application?.id;

    if (!applicationId) {
      setErrorMessage(
        text.applicationMissingId
      );
      return;
    }

    const enteredUsername =
      window.prompt(
        text.promptAdminUsername(
          applicationName(application, text),
          application?.bin ||
            text.binNotSpecified
        )
      );

    if (enteredUsername === null) {
      return;
    }

    const username =
      enteredUsername
        .trim()
        .toLowerCase();

    if (
      !/^[a-z0-9._-]{3,30}$/.test(
        username
      )
    ) {
      setErrorMessage(
        text.invalidUsername
      );
      return;
    }

    const confirmed =
      window.confirm(
        text.confirmApprove(
          applicationName(application, text),
          application?.bin ||
            text.binNotSpecified,
          username
        )
      );

    if (!confirmed) {
      return;
    }

    setActionId(
      `application-${applicationId}`
    );

    setNotice("");
    setErrorMessage("");

    try {
      const response = await api.post(
        `/applications/${applicationId}/approve`,
        {
          username,
        }
      );

      setNotice(
        localizedResponseMessage(
          response,
          text.applicationApproved
        )
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        localizedErrorMessage(
          error,
          text.approveApplicationError
        )
      );
    } finally {
      setActionId("");
    }
  }

  async function rejectApplication(
    applicationId
  ) {
    const reason = window.prompt(
      text.promptRejectReason
    );

    if (!reason?.trim()) {
      return;
    }

    setActionId(
      `application-${applicationId}`
    );

    setNotice("");
    setErrorMessage("");

    try {
      const response = await api.post(
        `/applications/${applicationId}/reject`,
        {
          reason: reason.trim(),
        }
      );

      setNotice(
        localizedResponseMessage(
          response,
          text.applicationRejected
        )
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        localizedErrorMessage(
          error,
          text.rejectApplicationError
        )
      );
    } finally {
      setActionId("");
    }
  }

  async function changeOrganizationStatus(
    organization,
    nextStatus
  ) {
    const organizationId =
      organization?.id;

    if (!organizationId) {
      setErrorMessage(
        text.organizationMissingId
      );
      return;
    }

    const isBlocking =
      nextStatus === "blocked";

    const confirmed =
      window.confirm(
        isBlocking
          ? text.confirmBlockOrganization(
              organizationName(
                organization,
                text
              )
            )
          : text.confirmUnblockOrganization(
              organizationName(
                organization,
                text
              )
            )
      );

    if (!confirmed) {
      return;
    }

    setActionId(
      `organization-${organizationId}`
    );

    setNotice("");
    setErrorMessage("");

    try {
      const response = await api.patch(
        `/organizations/${organizationId}/status`,
        {
          status: nextStatus,
        }
      );

      setNotice(
        localizedResponseMessage(
          response,
          isBlocking
            ? text.organizationBlocked
            : text.organizationUnblocked
        )
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        localizedErrorMessage(
          error,
          isBlocking
            ? text.blockOrganizationError
            : text.unblockOrganizationError
        )
      );
    } finally {
      setActionId("");
    }
  }

  async function deleteOrganization(
    organization
  ) {
    const organizationId =
      organization?.id;

    if (!organizationId) {
      setErrorMessage(
        text.organizationMissingId
      );
      return;
    }

    const name =
      organizationName(organization, text);

    const bin =
      organization?.bin ||
      text.binNotSpecified;

    const confirmed =
      window.confirm(
        text.confirmDeleteOrganization(
          name,
          bin
        )
      );

    if (!confirmed) {
      return;
    }

    setActionId(
      `organization-${organizationId}`
    );

    setNotice("");
    setErrorMessage("");

    try {
      const response = await api.delete(
        `/organizations/${organizationId}`
      );

      setNotice(
        localizedResponseMessage(
          response,
          text.organizationDeleted(name)
        )
      );

      setOrganizations(
        (currentOrganizations) =>
          currentOrganizations.filter(
            (item) =>
              item.id !==
              organizationId
          )
      );
    } catch (error) {
      setErrorMessage(
        localizedErrorMessage(
          error,
          text.deleteOrganizationError
        )
      );
    } finally {
      setActionId("");
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

        <button
          type="button"
          onClick={loadData}
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
            ? text.updating
            : text.refresh}
        </button>
      </div>

      {notice && (
        <div style={styles.successAlert}>
          <RiCheckboxCircleLine />
          <span>{notice}</span>
        </div>
      )}

      {errorMessage && (
        <div style={styles.errorAlert}>
          <RiCloseCircleLine />
          <span>{errorMessage}</span>
        </div>
      )}

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIconBox}>
            <RiFileList2Line />
          </div>

          <div>
            <div style={styles.statValue}>
              {applications.length}
            </div>

            <div style={styles.statLabel}>
              {text.pendingApplications}
            </div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIconBox}>
            <RiBuilding4Line />
          </div>

          <div>
            <div style={styles.statValue}>
              {organizations.length}
            </div>

            <div style={styles.statLabel}>
              {text.totalOrganizations}
            </div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIconBox}>
            <RiShieldCheckLine />
          </div>

          <div>
            <div style={styles.statValue}>
              {
                activeOrganizationsCount
              }
            </div>

            <div style={styles.statLabel}>
              {text.activeOrganizations}
            </div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIconBox}>
            <RiLockLine />
          </div>

          <div>
            <div style={styles.statValue}>
              {
                blockedOrganizationsCount
              }
            </div>

            <div style={styles.statLabel}>
              {text.blockedOrganizations}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.searchBox}>
        <RiSearchLine
          style={styles.searchIcon}
        />

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder={text.searchPlaceholder}
          style={styles.searchInput}
        />
      </div>

      {loading ? (
        <div style={styles.loadingCard}>
          {text.loadingDashboard}
        </div>
      ) : (
        <div style={styles.columns}>
          <section style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  {text.applicationsTitle}
                </h2>

                <p
                  style={
                    styles.sectionDescription
                  }
                >
                  {text.applicationsSubtitle}
                </p>
              </div>

              <span style={styles.counter}>
                {
                  filteredApplications.length
                }
              </span>
            </div>

            <div style={styles.list}>
              {filteredApplications.length ===
              0 ? (
                <div
                  style={styles.emptyState}
                >
                  <RiFileList2Line
                    style={styles.emptyIcon}
                  />

                  <strong>
                    {text.noNewApplications}
                  </strong>

                  <span>
                    {text.allApplicationsProcessed}
                  </span>
                </div>
              ) : (
                filteredApplications.map(
                  (application) => {
                    const itemActionId =
                      `application-${application.id}`;

                    const isProcessing =
                      actionId ===
                      itemActionId;

                    const status =
                      application?.status ||
                      "pending";

                    return (
                      <article
                        key={application.id}
                        style={styles.listItem}
                      >
                        <div
                          style={
                            styles.itemIcon
                          }
                        >
                          <RiFileList2Line />
                        </div>

                        <div
                          style={
                            styles.itemContent
                          }
                        >
                          <div
                            style={
                              styles.itemTopRow
                            }
                          >
                            <h3
                              style={
                                styles.itemTitle
                              }
                            >
                              {applicationName(
                                application,
                                text
                              )}
                            </h3>

                            <span
                              style={
                                styles.statusPending
                              }
                            >
                              {applicationStatusLabels[
                                status
                              ] || status}
                            </span>
                          </div>

                          <div
                            style={
                              styles.metaGrid
                            }
                          >
                            <span>
                              <b>{text.binLabel}:</b>{" "}
                              {application?.bin ||
                                "—"}
                            </span>

                            <span>
                              <b>{text.cityLabel}:</b>{" "}
                              {application?.city ||
                                "—"}
                            </span>

                            <span>
                              <b>
                                {text.representativeLabel}:
                              </b>{" "}
                              {application?.admin_name ||
                                "—"}
                            </span>

                            <span>
                              <b>{text.emailLabel}:</b>{" "}
                              {application?.contact_email ||
                                "—"}
                            </span>
                          </div>

                          <div
                            style={
                              styles.dateText
                            }
                          >
                            {text.receivedLabel}:{" "}
                            {formatDate(
                              application?.created_at,
                              text,
                              locale
                            )}
                          </div>

                          <div
                            style={
                              styles.actions
                            }
                          >
                            <button
                              type="button"
                              onClick={() =>
                                approveApplication(
                                  application
                                )
                              }
                              disabled={
                                isProcessing
                              }
                              style={{
                                ...styles.approveButton,
                                ...(isProcessing
                                  ? styles.disabledButton
                                  : {}),
                              }}
                            >
                              <RiCheckboxCircleLine />

                              {isProcessing
                                ? text.processing
                                : text.approve}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                rejectApplication(
                                  application.id
                                )
                              }
                              disabled={
                                isProcessing
                              }
                              style={{
                                ...styles.rejectButton,
                                ...(isProcessing
                                  ? styles.disabledButton
                                  : {}),
                              }}
                            >
                              <RiCloseCircleLine />
                              {text.reject}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  }
                )
              )}
            </div>
          </section>

          <section style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  {text.organizationsTitle}
                </h2>

                <p
                  style={
                    styles.sectionDescription
                  }
                >
                  {text.organizationsSubtitle}
                </p>
              </div>

              <span style={styles.counter}>
                {
                  filteredOrganizations.length
                }
              </span>
            </div>

            <div style={styles.list}>
              {filteredOrganizations.length ===
              0 ? (
                <div
                  style={styles.emptyState}
                >
                  <RiBuilding4Line
                    style={styles.emptyIcon}
                  />

                  <strong>
                    {text.noOrganizations}
                  </strong>

                  <span>
                    {text.organizationsAppear}
                  </span>
                </div>
              ) : (
                filteredOrganizations.map(
                  (organization) => {
                    const currentStatus =
                      String(
                        organization?.status ||
                          "pending"
                      ).toLowerCase();

                    const isBlocked =
                      currentStatus ===
                      "blocked";

                    const itemActionId =
                      `organization-${organization.id}`;

                    const isProcessing =
                      actionId ===
                      itemActionId;

                    return (
                      <article
                        key={organization.id}
                        style={styles.listItem}
                      >
                        <div
                          style={
                            styles.itemIcon
                          }
                        >
                          <RiBuilding4Line />
                        </div>

                        <div
                          style={
                            styles.itemContent
                          }
                        >
                          <div
                            style={
                              styles.itemTopRow
                            }
                          >
                            <h3
                              style={
                                styles.itemTitle
                              }
                            >
                              {organizationName(
                                organization,
                                text
                              )}
                            </h3>

                            <span
                              style={
                                isBlocked
                                  ? styles.statusBlocked
                                  : styles.statusActive
                              }
                            >
                              {organizationStatusLabels[
                                currentStatus
                              ] ||
                                currentStatus}
                            </span>
                          </div>

                          <div
                            style={
                              styles.metaGrid
                            }
                          >
                            <span>
                              <b>{text.binLabel}:</b>{" "}
                              {organization?.bin ||
                                "—"}
                            </span>

                            <span>
                              <b>{text.cityLabel}:</b>{" "}
                              {organization?.city ||
                                "—"}
                            </span>

                            <span>
                              <b>{text.emailLabel}:</b>{" "}
                              {organization?.email ||
                                "—"}
                            </span>
                          </div>

                          <div
                            style={
                              styles.actions
                            }
                          >
                            <button
                              type="button"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                changeOrganizationStatus(
                                  organization,
                                  isBlocked
                                    ? "active"
                                    : "blocked"
                                )
                              }
                              style={{
                                ...(isBlocked
                                  ? styles.unblockButton
                                  : styles.blockButton),

                                ...(isProcessing
                                  ? styles.disabledButton
                                  : {}),
                              }}
                            >
                              {isBlocked ? (
                                <RiShieldCheckLine />
                              ) : (
                                <RiLockLine />
                              )}

                              {isProcessing
                                ? text.processing
                                : isBlocked
                                  ? text.unblock
                                  : text.block}
                            </button>

                            <button
                              type="button"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                deleteOrganization(
                                  organization
                                )
                              }
                              style={{
                                ...styles.deleteButton,
                                ...(isProcessing
                                  ? styles.disabledButton
                                  : {}),
                              }}
                            >
                              <RiDeleteBinLine />

                              {isProcessing
                                ? text.processing
                                : text.delete}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  }
                )
              )}
            </div>
          </section>
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
    marginBottom: "28px",
  },

  title: {
    margin: "0 0 7px",
    fontSize: "32px",
    fontWeight: 800,
  },

  subtitle: {
    margin: 0,
    color: "#94a3b8",
    lineHeight: 1.5,
  },

  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "11px 16px",
    background:
      "rgba(99,102,241,0.15)",
    border:
      "1px solid rgba(99,102,241,0.35)",
    borderRadius: "11px",
    color: "#c7d2fe",
    cursor: "pointer",
    fontWeight: 700,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },

  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "18px",
    background:
      "rgba(30,41,59,0.48)",
    border:
      "1px solid rgba(255,255,255,0.07)",
    borderRadius: "16px",
  },

  statIconBox: {
    width: "43px",
    height: "43px",
    borderRadius: "12px",
    background:
      "rgba(99,102,241,0.17)",
    color: "#818cf8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
  },

  statValue: {
    fontSize: "25px",
    fontWeight: 800,
  },

  statLabel: {
    color: "#94a3b8",
    fontSize: "13px",
    marginTop: "2px",
  },

  successAlert: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginBottom: "18px",
    padding: "13px 15px",
    color: "#6ee7b7",
    background:
      "rgba(16,185,129,0.12)",
    border:
      "1px solid rgba(16,185,129,0.3)",
    borderRadius: "12px",
  },

  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginBottom: "18px",
    padding: "13px 15px",
    color: "#fca5a5",
    background:
      "rgba(239,68,68,0.12)",
    border:
      "1px solid rgba(239,68,68,0.3)",
    borderRadius: "12px",
  },

  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "24px",
    padding: "0 14px",
    background:
      "rgba(15,23,42,0.55)",
    border:
      "1px solid rgba(255,255,255,0.09)",
    borderRadius: "13px",
  },

  searchIcon: {
    color: "#64748b",
    fontSize: "20px",
  },

  searchInput: {
    width: "100%",
    padding: "13px 0",
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#ffffff",
    fontSize: "14px",
  },

  columns: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(360px, 1fr))",
    gap: "22px",
    alignItems: "start",
  },

  sectionCard: {
    padding: "22px",
    background:
      "rgba(30,41,59,0.42)",
    border:
      "1px solid rgba(255,255,255,0.06)",
    borderRadius: "19px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    marginBottom: "20px",
  },

  sectionTitle: {
    margin: "0 0 4px",
    fontSize: "20px",
    fontWeight: 750,
  },

  sectionDescription: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  counter: {
    minWidth: "32px",
    height: "32px",
    padding: "0 8px",
    borderRadius: "10px",
    background:
      "rgba(99,102,241,0.16)",
    color: "#a5b4fc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "13px",
  },

  listItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    padding: "16px",
    background: "rgba(0,0,0,0.17)",
    border:
      "1px solid rgba(255,255,255,0.045)",
    borderRadius: "14px",
  },

  itemIcon: {
    minWidth: "41px",
    height: "41px",
    borderRadius: "11px",
    background:
      "rgba(99,102,241,0.15)",
    color: "#818cf8",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "21px",
  },

  itemContent: {
    flex: 1,
    minWidth: 0,
  },

  itemTopRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
  },

  itemTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 750,
    overflowWrap: "anywhere",
  },

  metaGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "7px 14px",
    marginTop: "12px",
    color: "#94a3b8",
    fontSize: "13px",
    lineHeight: 1.45,
  },

  dateText: {
    marginTop: "10px",
    color: "#64748b",
    fontSize: "12px",
  },

  statusPending: {
    padding: "5px 9px",
    borderRadius: "999px",
    color: "#fcd34d",
    background:
      "rgba(245,158,11,0.12)",
    fontSize: "11px",
    fontWeight: 700,
  },

  statusActive: {
    padding: "5px 9px",
    borderRadius: "999px",
    color: "#6ee7b7",
    background:
      "rgba(16,185,129,0.12)",
    fontSize: "11px",
    fontWeight: 700,
  },

  statusBlocked: {
    padding: "5px 9px",
    borderRadius: "999px",
    color: "#fca5a5",
    background:
      "rgba(239,68,68,0.12)",
    fontSize: "11px",
    fontWeight: 700,
  },

  actions: {
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
    marginTop: "14px",
  },

  approveButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "9px 12px",
    border: "none",
    borderRadius: "9px",
    background: "#059669",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },

  rejectButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "9px 12px",
    border: "none",
    borderRadius: "9px",
    background: "#dc2626",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },

  blockButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "9px 12px",
    border:
      "1px solid rgba(239,68,68,0.3)",
    borderRadius: "9px",
    background:
      "rgba(239,68,68,0.13)",
    color: "#fca5a5",
    cursor: "pointer",
    fontWeight: 700,
  },

  unblockButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "9px 12px",
    border:
      "1px solid rgba(16,185,129,0.3)",
    borderRadius: "9px",
    background:
      "rgba(16,185,129,0.13)",
    color: "#6ee7b7",
    cursor: "pointer",
    fontWeight: 700,
  },

  deleteButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "9px 12px",
    border:
      "1px solid rgba(244,63,94,0.4)",
    borderRadius: "9px",
    background:
      "rgba(244,63,94,0.18)",
    color: "#fda4af",
    cursor: "pointer",
    fontWeight: 700,
  },

  disabledButton: {
    opacity: 0.55,
    cursor: "not-allowed",
  },

  loadingCard: {
    padding: "50px 20px",
    borderRadius: "18px",
    background:
      "rgba(30,41,59,0.42)",
    border:
      "1px solid rgba(255,255,255,0.06)",
    color: "#94a3b8",
    textAlign: "center",
  },

  emptyState: {
    minHeight: "170px",
    padding: "25px",
    borderRadius: "14px",
    background: "rgba(0,0,0,0.13)",
    color: "#64748b",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "32px",
    color: "#475569",
  },
};

