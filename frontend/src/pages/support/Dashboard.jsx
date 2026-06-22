
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

const APPLICATION_STATUS_LABELS = {
  pending: "Ожидает рассмотрения",
  approved: "Одобрена",
  rejected: "Отклонена",
};

const ORGANIZATION_STATUS_LABELS = {
  active: "Активна",
  blocked: "Заблокирована",
  pending: "Ожидает подключения",
  archived: "В архиве",
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

function formatDate(value) {
  if (!value) {
    return "Дата не указана";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата не указана";
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function applicationName(application) {
  return (
    application?.organization_name ||
    application?.name ||
    "Медицинская организация"
  );
}

function organizationName(organization) {
  return (
    organization?.name ||
    organization?.organization_name ||
    "Медицинская организация"
  );
}

export default function SupportDashboard() {
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
        getErrorMessage(
          applicationsResult.reason,
          "Не удалось загрузить данные кабинета техподдержки."
        )
      );
    } else if (
      applicationsResult.status ===
      "rejected"
    ) {
      setErrorMessage(
        "Организации загружены, но список заявок недоступен."
      );
    } else if (
      organizationsResult.status ===
      "rejected"
    ) {
      setErrorMessage(
        "Заявки загружены, но список организаций недоступен."
      );
    }

    setLoading(false);
  }, [
    loadApplications,
    loadOrganizations,
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
            applicationName(application),
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
    }, [applications, search]);

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
              organization
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
    }, [organizations, search]);

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
        "У заявки отсутствует идентификатор."
      );
      return;
    }

    const enteredUsername =
      window.prompt(
        `Введите логин администратора организации.\n\nОрганизация: ${applicationName(
          application
        )}\nБИН: ${
          application?.bin ||
          "не указан"
        }`
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
        "Логин должен содержать от 3 до 30 латинских букв, цифр или символов . _ -"
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Одобрить заявку?\n\nОрганизация: ${applicationName(
          application
        )}\nБИН: ${
          application?.bin ||
          "не указан"
        }\nЛогин администратора: ${username}\n\nНа Email будут отправлены БИН, логин и временный пароль.`
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
        response?.data?.message ||
          "Заявка одобрена. Данные для входа отправлены на Email."
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Не удалось одобрить заявку."
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
      "Укажите причину отклонения заявки:"
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
        response?.data?.message ||
          "Заявка отклонена."
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Не удалось отклонить заявку."
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
        "У организации отсутствует идентификатор."
      );
      return;
    }

    const actionText =
      nextStatus === "blocked"
        ? "заблокировать"
        : "разблокировать";

    const confirmed =
      window.confirm(
        `Вы действительно хотите ${actionText} организацию «${organizationName(
          organization
        )}»?`
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
        response?.data?.message ||
          (nextStatus === "blocked"
            ? "Организация заблокирована."
            : "Организация разблокирована.")
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          `Не удалось ${actionText} организацию.`
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
        "У организации отсутствует идентификатор."
      );
      return;
    }

    const name =
      organizationName(organization);

    const bin =
      organization?.bin ||
      "не указан";

    const confirmed =
      window.confirm(
        `Полностью удалить организацию?\n\nОрганизация: ${name}\nБИН: ${bin}\n\nБудут удалены организация, её администратор, активные сессии, обращения и уведомления.`
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
        response?.data?.message ||
          `Организация «${name}» удалена.`
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
        getErrorMessage(
          error,
          "Не удалось удалить организацию."
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
            Техническая поддержка
          </h1>

          <p style={styles.subtitle}>
            Управление заявками и
            подключёнными медицинскими
            организациями.
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
            ? "Обновление..."
            : "Обновить"}
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
              Заявок на рассмотрении
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
              Всего организаций
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
              Активных организаций
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
              Заблокированных
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
          placeholder="Поиск по названию, БИН, городу или Email"
          style={styles.searchInput}
        />
      </div>

      {loading ? (
        <div style={styles.loadingCard}>
          Загрузка данных кабинета
          техподдержки...
        </div>
      ) : (
        <div style={styles.columns}>
          <section style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  Заявки организаций
                </h2>

                <p
                  style={
                    styles.sectionDescription
                  }
                >
                  Новые заявки на подключение
                  к Clinic OS
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
                    Новых заявок нет
                  </strong>

                  <span>
                    Все поступившие заявки
                    обработаны.
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
                                application
                              )}
                            </h3>

                            <span
                              style={
                                styles.statusPending
                              }
                            >
                              {APPLICATION_STATUS_LABELS[
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
                              <b>БИН:</b>{" "}
                              {application?.bin ||
                                "—"}
                            </span>

                            <span>
                              <b>Город:</b>{" "}
                              {application?.city ||
                                "—"}
                            </span>

                            <span>
                              <b>
                                Представитель:
                              </b>{" "}
                              {application?.admin_name ||
                                "—"}
                            </span>

                            <span>
                              <b>Email:</b>{" "}
                              {application?.contact_email ||
                                "—"}
                            </span>
                          </div>

                          <div
                            style={
                              styles.dateText
                            }
                          >
                            Получена:{" "}
                            {formatDate(
                              application?.created_at
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
                                ? "Обработка..."
                                : "Одобрить"}
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
                              Отклонить
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
                  Медицинские организации
                </h2>

                <p
                  style={
                    styles.sectionDescription
                  }
                >
                  Подключённые поликлиники и
                  их статусы
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
                    Организации не найдены
                  </strong>

                  <span>
                    Подключённые организации
                    появятся здесь.
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
                                organization
                              )}
                            </h3>

                            <span
                              style={
                                isBlocked
                                  ? styles.statusBlocked
                                  : styles.statusActive
                              }
                            >
                              {ORGANIZATION_STATUS_LABELS[
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
                              <b>БИН:</b>{" "}
                              {organization?.bin ||
                                "—"}
                            </span>

                            <span>
                              <b>Город:</b>{" "}
                              {organization?.city ||
                                "—"}
                            </span>

                            <span>
                              <b>Email:</b>{" "}
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
                                ? "Обработка..."
                                : isBlocked
                                  ? "Разблокировать"
                                  : "Заблокировать"}
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
                                ? "Обработка..."
                                : "Удалить"}
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

