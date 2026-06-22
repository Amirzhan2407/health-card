
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  RiArchiveLine,
  RiCloseLine,
  RiFileCopyLine,
  RiKeyLine,
  RiLockLine,
  RiLockUnlockLine,
  RiRefreshLine,
  RiTeamLine,
  RiUserAddLine,
} from "react-icons/ri";

import api from "../../api/api";

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

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function getAccessStatus(doctor) {
  if (doctor?.status === "archived") {
    return "archived";
  }

  if (doctor?.accessStatus) {
    return doctor.accessStatus;
  }

  if (!doctor?.username) {
    return "no_access";
  }

  if (doctor?.profileStatus === "active") {
    return "active";
  }

  return "blocked";
}

function getAccessStatusLabel(status) {
  const labels = {
    no_access: "Доступ не выдан",
    active: "Доступ активен",
    blocked: "Доступ заблокирован",
    archived: "В архиве",
  };

  return labels[status] || "Неизвестно";
}

function getAccessBadgeStyle(status) {
  if (status === "active") {
    return {
      color: "#6ee7b7",
      background:
        "rgba(16,185,129,0.12)",
      borderColor:
        "rgba(16,185,129,0.3)",
    };
  }

  if (status === "blocked") {
    return {
      color: "#fca5a5",
      background:
        "rgba(239,68,68,0.12)",
      borderColor:
        "rgba(239,68,68,0.3)",
    };
  }

  if (status === "archived") {
    return {
      color: "#94a3b8",
      background:
        "rgba(148,163,184,0.1)",
      borderColor:
        "rgba(148,163,184,0.25)",
    };
  }

  return {
    color: "#fcd34d",
    background:
      "rgba(245,158,11,0.12)",
    borderColor:
      "rgba(245,158,11,0.3)",
  };
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export default function OrgAdminDashboard() {
  const [doctors, setDoctors] =
    useState([]);

  const [
    showAddForm,
    setShowAddForm,
  ] = useState(false);

  const [iin, setIin] = useState("");
  const [fullName, setFullName] =
    useState("");
  const [email, setEmail] =
    useState("");
  const [phone, setPhone] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [activeAction, setActiveAction] =
    useState("");

  const [
    accessDoctor,
    setAccessDoctor,
  ] = useState(null);

  const [username, setUsername] =
    useState("");

  const [
    credentials,
    setCredentials,
  ] = useState(null);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const activeDoctors = useMemo(
    () =>
      doctors.filter(
        (doctor) =>
          doctor.status !== "archived"
      ),
    [doctors]
  );

  const archivedDoctorsCount = useMemo(
    () =>
      doctors.filter(
        (doctor) =>
          doctor.status === "archived"
      ).length,
    [doctors]
  );

  const loadDoctors =
    useCallback(async () => {
      setLoading(true);

      try {
        const response = await api.get(
          "/doctors"
        );

        setDoctors(
          extractArray(response)
        );
      } catch (error) {
        setDoctors([]);

        setMessage({
          type: "error",
          text: getErrorMessage(
            error,
            "Не удалось загрузить врачей."
          ),
        });
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  function resetCreateForm() {
    setIin("");
    setFullName("");
    setEmail("");
    setPhone("");
  }

  async function handleCreateDoctor(
    event
  ) {
    event.preventDefault();

    setMessage({
      type: "",
      text: "",
    });

    if (!/^\d{12}$/.test(iin.trim())) {
      setMessage({
        type: "error",
        text: "ИИН должен содержать ровно 12 цифр.",
      });

      return;
    }

    if (!fullName.trim()) {
      setMessage({
        type: "error",
        text: "Укажите ФИО врача.",
      });

      return;
    }

    if (!email.trim()) {
      setMessage({
        type: "error",
        text: "Укажите электронную почту врача.",
      });

      return;
    }

    setCreating(true);

    try {
      const response = await api.post(
        "/doctors",
        {
          iin: iin.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
        }
      );

      if (response?.data?.success) {
        resetCreateForm();
        setShowAddForm(false);

        setMessage({
          type: "success",
          text:
            response.data.message ||
            "Карточка врача создана. Теперь можно выдать доступ.",
        });

        await loadDoctors();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(
          error,
          "Не удалось создать врача."
        ),
      });
    } finally {
      setCreating(false);
    }
  }

  function openAccessModal(doctor) {
    const suggestedUsername =
      doctor?.username ||
      String(doctor?.email || "")
        .split("@")[0]
        .toLowerCase();

    setAccessDoctor(doctor);

    setUsername(
      suggestedUsername || ""
    );

    setMessage({
      type: "",
      text: "",
    });
  }

  function closeAccessModal() {
    if (activeAction) {
      return;
    }

    setAccessDoctor(null);
    setUsername("");
  }

  async function grantAccess(event) {
    event.preventDefault();

    if (!accessDoctor?.id) {
      return;
    }

    const normalizedUsername =
      normalizeUsername(username);

    if (
      !/^[\p{L}\p{N}._-]{3,30}$/u.test(
        normalizedUsername
      )
    ) {
      setMessage({
        type: "error",
        text: "Логин должен содержать от 3 до 30 букв, цифр или символов . _ -",
      });

      return;
    }

    setActiveAction(
      `grant:${accessDoctor.id}`
    );

    setMessage({
      type: "",
      text: "",
    });

    try {
      const response = await api.post(
        `/doctors/${accessDoctor.id}/access`,
        {
          username:
            normalizedUsername,
        }
      );

      const accessData =
        response?.data?.data;

      setCredentials({
        doctorName:
          accessDoctor.fullName ||
          "Врач",

        username:
          accessData?.username ||
          normalizedUsername,

        temporaryPassword:
          accessData?.temporaryPassword ||
          "",
      });

      setAccessDoctor(null);
      setUsername("");

      setMessage({
        type: "success",
        text:
          response?.data?.message ||
          "Доступ врачу успешно выдан.",
      });

      await loadDoctors();
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(
          error,
          "Не удалось выдать доступ врачу."
        ),
      });
    } finally {
      setActiveAction("");
    }
  }

  async function resetPassword(doctor) {
    const confirmed = window.confirm(
      `Создать новый временный пароль для врача «${doctor.fullName}»? Старый пароль перестанет работать.`
    );

    if (!confirmed) {
      return;
    }

    setActiveAction(
      `reset:${doctor.id}`
    );

    setMessage({
      type: "",
      text: "",
    });

    try {
      const response = await api.post(
        `/doctors/${doctor.id}/access/reset-password`
      );

      const accessData =
        response?.data?.data;

      setCredentials({
        doctorName:
          doctor.fullName || "Врач",

        username:
          accessData?.username ||
          doctor.username ||
          "",

        temporaryPassword:
          accessData?.temporaryPassword ||
          "",
      });

      setMessage({
        type: "success",
        text:
          response?.data?.message ||
          "Временный пароль обновлён.",
      });

      await loadDoctors();
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(
          error,
          "Не удалось сбросить пароль."
        ),
      });
    } finally {
      setActiveAction("");
    }
  }

  async function blockAccess(doctor) {
    const confirmed = window.confirm(
      `Заблокировать доступ врачу «${doctor.fullName}»? Его активные сессии будут завершены.`
    );

    if (!confirmed) {
      return;
    }

    setActiveAction(
      `block:${doctor.id}`
    );

    try {
      const response = await api.patch(
        `/doctors/${doctor.id}/access/block`
      );

      setMessage({
        type: "success",
        text:
          response?.data?.message ||
          "Доступ врача заблокирован.",
      });

      await loadDoctors();
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(
          error,
          "Не удалось заблокировать доступ."
        ),
      });
    } finally {
      setActiveAction("");
    }
  }

  async function unblockAccess(doctor) {
    setActiveAction(
      `unblock:${doctor.id}`
    );

    try {
      const response = await api.patch(
        `/doctors/${doctor.id}/access/unblock`
      );

      setMessage({
        type: "success",
        text:
          response?.data?.message ||
          "Доступ врача разблокирован.",
      });

      await loadDoctors();
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(
          error,
          "Не удалось разблокировать доступ."
        ),
      });
    } finally {
      setActiveAction("");
    }
  }

  async function archiveDoctor(doctor) {
    const confirmed = window.confirm(
      `Отправить врача «${doctor.fullName}» в архив? Его доступ будет заблокирован.`
    );

    if (!confirmed) {
      return;
    }

    setActiveAction(
      `archive:${doctor.id}`
    );

    try {
      const response = await api.delete(
        `/doctors/${doctor.id}`
      );

      setMessage({
        type: "success",
        text:
          response?.data?.message ||
          "Врач отправлен в архив.",
      });

      await loadDoctors();
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(
          error,
          "Не удалось архивировать врача."
        ),
      });
    } finally {
      setActiveAction("");
    }
  }

  async function copyCredentials() {
    if (!credentials) {
      return;
    }

    const text = [
      `Врач: ${credentials.doctorName}`,
      `Логин: ${credentials.username}`,
      `Временный пароль: ${credentials.temporaryPassword}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(
        text
      );

      setMessage({
        type: "success",
        text: "Данные доступа скопированы.",
      });
    } catch {
      setMessage({
        type: "error",
        text: "Не удалось скопировать данные. Скопируйте их вручную.",
      });
    }
  }

  function isDoctorBusy(doctorId) {
    return activeAction.endsWith(
      `:${doctorId}`
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Управление врачами
          </h1>

          <p style={styles.sub}>
            Создавайте карточки врачей,
            выдавайте доступ и управляйте
            входом в систему.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDoctors}
          disabled={loading}
          style={{
            ...styles.refreshButton,
            ...(loading
              ? styles.disabled
              : {}),
          }}
        >
          <RiRefreshLine />

          {loading
            ? "Обновление..."
            : "Обновить"}
        </button>
      </header>

      {message.text && (
        <div
          style={{
            ...styles.alert,

            ...(message.type === "error"
              ? styles.errorAlert
              : message.type ===
                "success"
              ? styles.successAlert
              : styles.infoAlert),
          }}
        >
          {message.text}
        </div>
      )}

      <section style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>
            Действующие врачи
          </span>

          <strong style={styles.statValue}>
            {activeDoctors.length}
          </strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>
            Доступ не выдан
          </span>

          <strong style={styles.statValue}>
            {
              activeDoctors.filter(
                (doctor) =>
                  getAccessStatus(
                    doctor
                  ) === "no_access"
              ).length
            }
          </strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>
            Заблокированы
          </span>

          <strong style={styles.statValue}>
            {
              activeDoctors.filter(
                (doctor) =>
                  getAccessStatus(
                    doctor
                  ) === "blocked"
              ).length
            }
          </strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>
            В архиве
          </span>

          <strong style={styles.statValue}>
            {archivedDoctorsCount}
          </strong>
        </div>
      </section>

      <div style={styles.actionHeader}>
        <button
          type="button"
          onClick={() =>
            setShowAddForm(
              (current) => !current
            )
          }
          style={styles.addButton}
        >
          <RiUserAddLine />

          {showAddForm
            ? "Скрыть форму"
            : "Добавить врача"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleCreateDoctor}
          style={styles.formCard}
        >
          <div style={styles.formHeader}>
            <div>
              <h2 style={styles.cardTitle}>
                Новый врач
              </h2>

              <p style={styles.cardSubtitle}>
                Сначала создаётся карточка.
                Логин и временный пароль
                выдаются отдельно.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowAddForm(false)
              }
              style={styles.iconButton}
            >
              <RiCloseLine />
            </button>
          </div>

          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                ИИН *
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={iin}
                onChange={(event) =>
                  setIin(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 12)
                  )
                }
                style={styles.input}
                maxLength={12}
                placeholder="12 цифр"
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                ФИО *
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(event) =>
                  setFullName(
                    event.target.value
                  )
                }
                style={styles.input}
                placeholder="Фамилия Имя Отчество"
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Электронная почта *
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                style={styles.input}
                placeholder="doctor@example.kz"
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Телефон
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value
                  )
                }
                style={styles.input}
                placeholder="+7 700 000 00 00"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            style={{
              ...styles.submitButton,
              ...(creating
                ? styles.disabled
                : {}),
            }}
          >
            <RiUserAddLine />

            {creating
              ? "Создание..."
              : "Создать карточку"}
          </button>
        </form>
      )}

      <section style={styles.listCard}>
        <div style={styles.listHeader}>
          <div>
            <h2 style={styles.cardTitle}>
              Врачи клиники
            </h2>

            <p style={styles.cardSubtitle}>
              Для входа врачу необходимо
              отдельно выдать доступ.
            </p>
          </div>

          <span style={styles.countBadge}>
            {doctors.length}
          </span>
        </div>

        {loading ? (
          <div style={styles.emptyState}>
            Загрузка врачей...
          </div>
        ) : doctors.length === 0 ? (
          <div style={styles.emptyState}>
            В организации пока нет врачей.
          </div>
        ) : (
          <div style={styles.grid}>
            {doctors.map((doctor) => {
              const accessStatus =
                getAccessStatus(doctor);

              const badgeStyle =
                getAccessBadgeStyle(
                  accessStatus
                );

              const busy = isDoctorBusy(
                doctor.id
              );

              return (
                <article
                  key={doctor.id}
                  style={{
                    ...styles.doctorItem,

                    ...(accessStatus ===
                    "archived"
                      ? styles.archivedDoctor
                      : {}),
                  }}
                >
                  <div
                    style={
                      styles.doctorMain
                    }
                  >
                    <div
                      style={styles.avatar}
                    >
                      <RiTeamLine />
                    </div>

                    <div
                      style={
                        styles.doctorDetails
                      }
                    >
                      <h3
                        style={
                          styles.doctorName
                        }
                      >
                        {doctor.fullName ||
                          "ФИО не указано"}
                      </h3>

                      <p
                        style={
                          styles.doctorMeta
                        }
                      >
                        ИИН:{" "}
                        {doctor.iin ||
                          "не указан"}
                      </p>

                      <p
                        style={
                          styles.doctorMeta
                        }
                      >
                        {doctor.email ||
                          "Почта не указана"}

                        {doctor.phone
                          ? ` • ${doctor.phone}`
                          : ""}
                      </p>

                      {doctor.username && (
                        <p
                          style={
                            styles.usernameText
                          }
                        >
                          Логин:{" "}
                          <strong>
                            {
                              doctor.username
                            }
                          </strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    style={
                      styles.doctorControls
                    }
                  >
                    <span
                      style={{
                        ...styles.statusBadge,
                        ...badgeStyle,
                      }}
                    >
                      {getAccessStatusLabel(
                        accessStatus
                      )}
                    </span>

                    <div
                      style={
                        styles.buttonsRow
                      }
                    >
                      {accessStatus ===
                        "no_access" && (
                        <button
                          type="button"
                          onClick={() =>
                            openAccessModal(
                              doctor
                            )
                          }
                          disabled={busy}
                          style={
                            styles.accessButton
                          }
                        >
                          <RiKeyLine />
                          Выдать доступ
                        </button>
                      )}

                      {accessStatus !==
                        "no_access" &&
                        accessStatus !==
                          "archived" && (
                          <button
                            type="button"
                            onClick={() =>
                              resetPassword(
                                doctor
                              )
                            }
                            disabled={busy}
                            style={
                              styles.secondaryButton
                            }
                          >
                            <RiKeyLine />
                            Сбросить пароль
                          </button>
                        )}

                      {accessStatus ===
                        "active" && (
                        <button
                          type="button"
                          onClick={() =>
                            blockAccess(
                              doctor
                            )
                          }
                          disabled={busy}
                          style={
                            styles.dangerButton
                          }
                        >
                          <RiLockLine />
                          Заблокировать
                        </button>
                      )}

                      {accessStatus ===
                        "blocked" && (
                        <button
                          type="button"
                          onClick={() =>
                            unblockAccess(
                              doctor
                            )
                          }
                          disabled={busy}
                          style={
                            styles.successButton
                          }
                        >
                          <RiLockUnlockLine />
                          Разблокировать
                        </button>
                      )}

                      {accessStatus !==
                        "archived" && (
                        <button
                          type="button"
                          onClick={() =>
                            archiveDoctor(
                              doctor
                            )
                          }
                          disabled={busy}
                          style={
                            styles.archiveButton
                          }
                        >
                          <RiArchiveLine />
                          В архив
                        </button>
                      )}
                    </div>

                    {busy && (
                      <span
                        style={
                          styles.processingText
                        }
                      >
                        Выполнение операции...
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {accessDoctor && (
        <div style={styles.modalOverlay}>
          <form
            onSubmit={grantAccess}
            style={styles.modal}
          >
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>
                  Выдать доступ
                </h2>

                <p
                  style={
                    styles.modalSubtitle
                  }
                >
                  {accessDoctor.fullName}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAccessModal}
                style={styles.iconButton}
              >
                <RiCloseLine />
              </button>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Логин врача *
              </label>

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value
                  )
                }
                style={styles.input}
                placeholder="doctor.login"
                minLength={3}
                maxLength={30}
                autoFocus
                required
              />

              <small style={styles.hint}>
                Разрешены буквы, цифры и
                символы точка, дефис,
                нижнее подчёркивание.
              </small>
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={closeAccessModal}
                disabled={Boolean(
                  activeAction
                )}
                style={
                  styles.cancelButton
                }
              >
                Отмена
              </button>

              <button
                type="submit"
                disabled={Boolean(
                  activeAction
                )}
                style={{
                  ...styles.accessButton,

                  ...(activeAction
                    ? styles.disabled
                    : {}),
                }}
              >
                <RiKeyLine />

                {activeAction
                  ? "Создание..."
                  : "Создать доступ"}
              </button>
            </div>
          </form>
        </div>
      )}

      {credentials && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>
                  Данные для входа
                </h2>

                <p
                  style={
                    styles.modalSubtitle
                  }
                >
                  {credentials.doctorName}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCredentials(null)
                }
                style={styles.iconButton}
              >
                <RiCloseLine />
              </button>
            </div>

            <div style={styles.warningBox}>
              Временный пароль показывается
              только сейчас. Скопируйте и
              передайте его врачу безопасным
              способом.
            </div>

            <div style={styles.credentialBox}>
              <div>
                <span
                  style={
                    styles.credentialLabel
                  }
                >
                  Логин
                </span>

                <strong
                  style={
                    styles.credentialValue
                  }
                >
                  {credentials.username}
                </strong>
              </div>

              <div>
                <span
                  style={
                    styles.credentialLabel
                  }
                >
                  Временный пароль
                </span>

                <strong
                  style={
                    styles.credentialValue
                  }
                >
                  {
                    credentials.temporaryPassword
                  }
                </strong>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={copyCredentials}
                style={
                  styles.secondaryButton
                }
              >
                <RiFileCopyLine />
                Скопировать
              </button>

              <button
                type="button"
                onClick={() =>
                  setCredentials(null)
                }
                style={styles.accessButton}
              >
                Готово
              </button>
            </div>
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

  title: {
    margin: "0 0 8px",
    fontSize: "32px",
    fontWeight: 800,
  },

  sub: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "15px",
    lineHeight: 1.5,
  },

  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "11px 16px",
    borderRadius: "11px",
    border:
      "1px solid rgba(99,102,241,0.35)",
    background:
      "rgba(99,102,241,0.14)",
    color: "#c7d2fe",
    cursor: "pointer",
    fontWeight: 700,
  },

  alert: {
    marginBottom: "20px",
    padding: "13px 16px",
    borderRadius: "11px",
    border: "1px solid",
    lineHeight: 1.45,
  },

  successAlert: {
    color: "#6ee7b7",
    background:
      "rgba(16,185,129,0.12)",
    borderColor:
      "rgba(16,185,129,0.3)",
  },

  errorAlert: {
    color: "#fca5a5",
    background:
      "rgba(239,68,68,0.12)",
    borderColor:
      "rgba(239,68,68,0.3)",
  },

  infoAlert: {
    color: "#93c5fd",
    background:
      "rgba(59,130,246,0.12)",
    borderColor:
      "rgba(59,130,246,0.3)",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "14px",
    marginBottom: "22px",
  },

  statCard: {
    padding: "18px",
    borderRadius: "15px",
    border:
      "1px solid rgba(255,255,255,0.07)",
    background:
      "rgba(30,41,59,0.42)",
  },

  statLabel: {
    display: "block",
    marginBottom: "8px",
    color: "#94a3b8",
    fontSize: "12px",
  },

  statValue: {
    fontSize: "27px",
  },

  actionHeader: {
    marginBottom: "20px",
  },

  addButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 19px",
    border: "none",
    borderRadius: "11px",
    background: "#6366f1",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },

  formCard: {
    marginBottom: "24px",
    padding: "24px",
    borderRadius: "18px",
    border:
      "1px solid rgba(255,255,255,0.07)",
    background:
      "rgba(30,41,59,0.45)",
  },

  formHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "20px",
  },

  cardTitle: {
    margin: "0 0 5px",
    fontSize: "20px",
  },

  cardSubtitle: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "13px",
    lineHeight: 1.45,
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  label: {
    color: "#cbd5e1",
    fontSize: "12px",
    fontWeight: 700,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "43px",
    padding: "11px 13px",
    borderRadius: "10px",
    border:
      "1px solid rgba(255,255,255,0.11)",
    background:
      "rgba(0,0,0,0.22)",
    color: "#ffffff",
    outline: "none",
    fontSize: "14px",
  },

  hint: {
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.4,
  },

  submitButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    border: "none",
    borderRadius: "11px",
    background: "#10b981",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },

  listCard: {
    padding: "24px",
    borderRadius: "18px",
    border:
      "1px solid rgba(255,255,255,0.07)",
    background:
      "rgba(30,41,59,0.4)",
  },

  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "20px",
  },

  countBadge: {
    minWidth: "34px",
    height: "34px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "10px",
    color: "#c7d2fe",
    background:
      "rgba(99,102,241,0.15)",
    fontWeight: 800,
  },

  grid: {
    display: "flex",
    flexDirection: "column",
    gap: "13px",
  },

  doctorItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    padding: "18px",
    borderRadius: "14px",
    border:
      "1px solid rgba(255,255,255,0.06)",
    background:
      "rgba(0,0,0,0.16)",
  },

  archivedDoctor: {
    opacity: 0.6,
  },

  doctorMain: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    minWidth: "250px",
    flex: 1,
  },

  avatar: {
    width: "44px",
    height: "44px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "12px",
    color: "#a5b4fc",
    background:
      "rgba(99,102,241,0.15)",
    fontSize: "22px",
  },

  doctorDetails: {
    minWidth: 0,
  },

  doctorName: {
    margin: "0 0 5px",
    fontSize: "16px",
  },

  doctorMeta: {
    margin: "2px 0",
    color: "#94a3b8",
    fontSize: "12px",
    wordBreak: "break-word",
  },

  usernameText: {
    margin: "7px 0 0",
    color: "#c7d2fe",
    fontSize: "12px",
  },

  doctorControls: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "10px",
  },

  statusBadge: {
    padding: "5px 9px",
    borderRadius: "7px",
    border: "1px solid",
    fontSize: "11px",
    fontWeight: 700,
  },

  buttonsRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    flexWrap: "wrap",
  },

  accessButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    padding: "10px 13px",
    border: "none",
    borderRadius: "9px",
    background: "#6366f1",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },

  secondaryButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    padding: "9px 12px",
    borderRadius: "9px",
    border:
      "1px solid rgba(148,163,184,0.25)",
    background:
      "rgba(148,163,184,0.09)",
    color: "#cbd5e1",
    cursor: "pointer",
    fontWeight: 650,
  },

  successButton: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 12px",
    borderRadius: "9px",
    border:
      "1px solid rgba(16,185,129,0.3)",
    background:
      "rgba(16,185,129,0.12)",
    color: "#6ee7b7",
    cursor: "pointer",
    fontWeight: 650,
  },

  dangerButton: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 12px",
    borderRadius: "9px",
    border:
      "1px solid rgba(239,68,68,0.28)",
    background:
      "rgba(239,68,68,0.1)",
    color: "#fca5a5",
    cursor: "pointer",
    fontWeight: 650,
  },

  archiveButton: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 12px",
    borderRadius: "9px",
    border:
      "1px solid rgba(148,163,184,0.2)",
    background:
      "rgba(15,23,42,0.45)",
    color: "#94a3b8",
    cursor: "pointer",
    fontWeight: 650,
  },

  processingText: {
    color: "#94a3b8",
    fontSize: "11px",
  },

  emptyState: {
    minHeight: "150px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    background:
      "rgba(2,6,23,0.78)",
    backdropFilter: "blur(6px)",
  },

  modal: {
    width: "100%",
    maxWidth: "500px",
    padding: "24px",
    borderRadius: "18px",
    border:
      "1px solid rgba(255,255,255,0.09)",
    background: "#172033",
    boxShadow:
      "0 25px 70px rgba(0,0,0,0.45)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "20px",
  },

  modalTitle: {
    margin: "0 0 5px",
    fontSize: "21px",
  },

  modalSubtitle: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "13px",
  },

  iconButton: {
    width: "36px",
    height: "36px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "9px",
    border:
      "1px solid rgba(255,255,255,0.1)",
    background:
      "rgba(255,255,255,0.05)",
    color: "#cbd5e1",
    cursor: "pointer",
    fontSize: "19px",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "9px",
    flexWrap: "wrap",
    marginTop: "22px",
  },

  cancelButton: {
    padding: "10px 15px",
    borderRadius: "9px",
    border:
      "1px solid rgba(148,163,184,0.25)",
    background: "transparent",
    color: "#cbd5e1",
    cursor: "pointer",
    fontWeight: 650,
  },

  warningBox: {
    marginBottom: "17px",
    padding: "13px",
    borderRadius: "10px",
    border:
      "1px solid rgba(245,158,11,0.3)",
    background:
      "rgba(245,158,11,0.1)",
    color: "#fcd34d",
    fontSize: "13px",
    lineHeight: 1.45,
  },

  credentialBox: {
    display: "grid",
    gap: "13px",
    padding: "17px",
    borderRadius: "12px",
    background:
      "rgba(2,6,23,0.4)",
  },

  credentialLabel: {
    display: "block",
    marginBottom: "5px",
    color: "#94a3b8",
    fontSize: "11px",
    textTransform: "uppercase",
  },

  credentialValue: {
    display: "block",
    color: "#ffffff",
    fontFamily: "monospace",
    fontSize: "16px",
    wordBreak: "break-all",
  },

  disabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
};

