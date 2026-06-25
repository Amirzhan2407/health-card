
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarCheckLine,
  RiCalendarLine,
  RiRefreshLine,
  RiTimeLine,
  RiUserLine,
} from "react-icons/ri";

import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";

const ACTIVE_VISIT_STORAGE_KEY = "clinic_os_active_visit_id";
const ACTIVE_STATUSES = ["in_progress", "waiting_finish_confirmation"];

const TEXTS = {
  ru: {
    calendarTitle: "Календарь приёмов",
    calendarSubtitle:
      "Свободные окна и записи пациентов по вашему рабочему расписанию.",
    refreshing: "Обновление...",
    refresh: "Обновить",

    doctorProfileError:
      "Не удалось определить профиль врача. Выйдите из аккаунта и войдите повторно.",
    calendarLoadError:
      "Не удалось загрузить календарь приёмов.",
    currentDoctorError:
      "Не удалось определить текущего врача.",

    unfinishedVisitTitle:
      "Незавершённый приём",
    unfinishedVisitText:
      "Этот приём уже начат и остаётся активным до подтверждения кода завершения.",
    continueVisit:
      "Продолжить приём",

    previousDay: "Предыдущий день",
    nextDay: "Следующий день",
    today: "Сегодня",

    totalSlots: "Всего окон",
    available: "Свободно",
    busy: "Занято",

    scheduleTitle:
      "Расписание на день",
    scheduleSubtitle:
      "Свободные интервалы отмечены зелёным цветом, записи пациентов — синим.",
    loadingSchedule:
      "Загрузка расписания...",
    noWorkSlots:
      "На эту дату нет рабочих интервалов",
    noWorkSlotsText:
      "Возможно, это выходной день, отсутствие врача или расписание ещё не действует.",

    timePassed: "Время прошло",
    pastUnavailable:
      "Интервал уже недоступен для записи",
    noPatientBooked:
      "На это время пациент не записан",

    reason: "Причина",
    openRecord: "Открыть запись",
    completedVisit:
      "Приём завершён",
    unknownBusy:
      "Интервал занят, но данные записи не были получены.",

    patient: "Пациент",
    occupied: "Занято",

    statusScheduled: "Запланирован",
    statusConfirmed: "Подтверждён",
    statusTransferPending:
      "Ожидает переноса",
    statusTransferred: "Перенесён",
    statusInProgress: "Приём идёт",
    statusWaitingFinish:
      "Ожидается подтверждение",
    statusCompleted: "Завершён",
    statusNoShow: "Неявка",
    statusCancelledByPatient:
      "Отменён пациентом",
    statusCancelledByOrganization:
      "Отменён организацией",
  },

  kk: {
    calendarTitle:
      "Қабылдаулар күнтізбесі",
    calendarSubtitle:
      "Бос уақыттар мен пациенттердің жазбалары сіздің жұмыс кестеңіз бойынша көрсетіледі.",
    refreshing: "Жаңартылуда...",
    refresh: "Жаңарту",

    doctorProfileError:
      "Дәрігер профилін анықтау мүмкін болмады. Аккаунттан шығып, қайта кіріңіз.",
    calendarLoadError:
      "Қабылдаулар күнтізбесін жүктеу мүмкін болмады.",
    currentDoctorError:
      "Ағымдағы дәрігерді анықтау мүмкін болмады.",

    unfinishedVisitTitle:
      "Аяқталмаған қабылдау",
    unfinishedVisitText:
      "Бұл қабылдау басталып қойған және аяқтау коды расталғанға дейін белсенді болып қалады.",
    continueVisit:
      "Қабылдауды жалғастыру",

    previousDay: "Алдыңғы күн",
    nextDay: "Келесі күн",
    today: "Бүгін",

    totalSlots:
      "Барлық уақыт аралығы",
    available: "Бос",
    busy: "Бос емес",

    scheduleTitle: "Күндік кесте",
    scheduleSubtitle:
      "Бос уақыттар жасыл түспен, пациент жазбалары көк түспен белгіленген.",
    loadingSchedule:
      "Кесте жүктелуде...",
    noWorkSlots:
      "Бұл күнге жұмыс аралықтары жоқ",
    noWorkSlotsText:
      "Бұл демалыс күні болуы мүмкін, дәрігер жоқ немесе кесте әлі күшіне енбеген.",

    timePassed:
      "Уақыт өтіп кетті",
    pastUnavailable:
      "Бұл аралыққа енді жазылу мүмкін емес",
    noPatientBooked:
      "Бұл уақытқа пациент жазылмаған",

    reason: "Себебі",
    openRecord: "Жазбаны ашу",
    completedVisit:
      "Қабылдау аяқталды",
    unknownBusy:
      "Аралық бос емес, бірақ жазба деректері алынбады.",

    patient: "Пациент",
    occupied: "Бос емес",

    statusScheduled: "Жоспарланған",
    statusConfirmed: "Расталған",
    statusTransferPending:
      "Ауыстыруды күтуде",
    statusTransferred:
      "Ауыстырылған",
    statusInProgress:
      "Қабылдау жүріп жатыр",
    statusWaitingFinish:
      "Растауды күтуде",
    statusCompleted: "Аяқталды",
    statusNoShow: "Келмеді",
    statusCancelledByPatient:
      "Пациент бас тартты",
    statusCancelledByOrganization:
      "Ұйым бас тартты",
  },
};


function clean(value) {
  return String(value ?? "").trim();
}

function normalizeTime(value) {
  return clean(value).slice(0, 5);
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(dateString, amount) {
  const date = new Date(
    `${dateString}T12:00:00`
  );

  date.setDate(
    date.getDate() + amount
  );

  return getLocalDateString(date);
}

function formatSelectedDate(dateString, locale = "ru-RU") {
  const date = new Date(
    `${dateString}T12:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat(
    locale,
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(date);
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

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function extractCurrentUser(response) {
  const body = response?.data;

  return (
    body?.data?.user ||
    body?.user ||
    body?.data ||
    body ||
    null
  );
}

function getDoctorId(user) {
  return clean(
    user?.doctor_id ||
      user?.doctorId ||
      user?.doctor?.id ||
      user?.profile?.doctor_id ||
      user?.profile?.doctorId
  );
}

function getAppointmentDate(appointment) {
  return clean(
    appointment?.date ||
      appointment?.appointment_date ||
      appointment?.appointmentDate
  ).slice(0, 10);
}

function getAppointmentTime(appointment) {
  return normalizeTime(
    appointment?.time ||
      appointment?.start_time ||
      appointment?.startTime ||
      appointment?.appointment_time ||
      appointment?.appointmentTime
  );
}

function getPatientName(appointment, fallback = "Пациент") {
  return (
    clean(
      appointment?.profiles?.full_name
    ) ||
    clean(
      appointment?.patient_profile
        ?.full_name
    ) ||
    clean(
      appointment?.patientProfile
        ?.fullName
    ) ||
    clean(
      appointment?.patients?.profiles
        ?.full_name
    ) ||
    clean(
      appointment?.patient?.profiles
        ?.full_name
    ) ||
    clean(
      appointment?.patient?.full_name
    ) ||
    clean(
      appointment?.patient?.fullName
    ) ||
    clean(
      appointment?.patient_name
    ) ||
    clean(
      appointment?.patientName
    ) ||
    fallback
  );
}

function getPatientPhone(appointment) {
  return (
    clean(
      appointment?.profiles?.phone
    ) ||
    clean(
      appointment?.patient_profile
        ?.phone
    ) ||
    clean(
      appointment?.patient?.profiles
        ?.phone
    ) ||
    clean(
      appointment?.patient?.phone
    ) ||
    clean(
      appointment?.patient_phone
    ) ||
    ""
  );
}

function getAppointmentReason(appointment) {
  return (
    clean(
      appointment?.reason
    ) ||
    clean(
      appointment?.visit_reason
    ) ||
    clean(
      appointment?.complaint
    ) ||
    clean(
      appointment?.reason_for_visit
    ) ||
    ""
  );
}

function getAppointmentStatusLabel(
  status,
  text
) {
  const labels = {
    scheduled:
      text.statusScheduled,

    confirmed:
      text.statusConfirmed,

    transfer_pending:
      text.statusTransferPending,

    transferred:
      text.statusTransferred,

    in_progress:
      text.statusInProgress,

    waiting_finish_confirmation:
      text.statusWaitingFinish,

    completed:
      text.statusCompleted,

    no_show:
      text.statusNoShow,

    cancelled_by_patient:
      text.statusCancelledByPatient,

    cancelled_by_organization:
      text.statusCancelledByOrganization,
  };

  return (
    labels[status] ||
    status ||
    text.occupied
  );
}

function getStatusStyle(status) {
  if (status === "completed") {
    return {
      color: "#94a3b8",
      background:
        "rgba(148,163,184,0.12)",
      borderColor:
        "rgba(148,163,184,0.24)",
    };
  }

  if (status === "in_progress") {
    return {
      color: "#fcd34d",
      background:
        "rgba(245,158,11,0.12)",
      borderColor:
        "rgba(245,158,11,0.3)",
    };
  }

  if (
    status === "confirmed" ||
    status === "scheduled" ||
    status === "transferred"
  ) {
    return {
      color: "#93c5fd",
      background:
        "rgba(59,130,246,0.12)",
      borderColor:
        "rgba(59,130,246,0.3)",
    };
  }

  return {
    color: "#c4b5fd",
    background:
      "rgba(139,92,246,0.12)",
    borderColor:
      "rgba(139,92,246,0.3)",
  };
}

function isPastSlot(dateString, time) {
  const slotDate = new Date(
    `${dateString}T${normalizeTime(
      time
    )}:00`
  );

  if (Number.isNaN(slotDate.getTime())) {
    return false;
  }

  return slotDate.getTime() < Date.now();
}

export default function DoctorDashboard() {
  const { user } = useAuth();

  const { language } =
    useLanguage();

  const isKazakh =
    language === "kk" ||
    language === "kz";

  const text =
    isKazakh
      ? TEXTS.kk
      : TEXTS.ru;

  const locale =
    isKazakh
      ? "kk-KZ"
      : "ru-RU";

  const [doctorId, setDoctorId] =
    useState("");

  const [selectedDate, setSelectedDate] =
    useState(getLocalDateString());

  const [slots, setSlots] =
    useState([]);

  const [appointments, setAppointments] =
    useState([]);

  const [activeAppointments, setActiveAppointments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const appointmentsByTime = useMemo(() => {
    const result = new Map();

    for (const appointment of appointments) {
      const appointmentDate =
        getAppointmentDate(appointment);

      if (
        appointmentDate &&
        appointmentDate !== selectedDate
      ) {
        continue;
      }

      const time =
        getAppointmentTime(appointment);

      if (time) {
        result.set(time, appointment);
      }
    }

    return result;
  }, [appointments, selectedDate]);

  const preparedSlots = useMemo(
    () =>
      slots.map((slot) => {
        const time = normalizeTime(
          slot.startTime || slot.time
        );

        const appointment =
          appointmentsByTime.get(time) ||
          null;

        return {
          ...slot,
          time,
          startTime: time,
          endTime: normalizeTime(
            slot.endTime
          ),
          appointment,
          isAvailable:
            slot.isAvailable === true &&
            !appointment,
          isPast: isPastSlot(
            selectedDate,
            time
          ),
        };
      }),
    [
      slots,
      appointmentsByTime,
      selectedDate,
    ]
  );

  const availableCount = useMemo(
    () =>
      preparedSlots.filter(
        (slot) =>
          slot.isAvailable &&
          !slot.isPast
      ).length,
    [preparedSlots]
  );

  const busyCount = useMemo(
    () =>
      preparedSlots.filter(
        (slot) =>
          !slot.isAvailable ||
          Boolean(slot.appointment)
      ).length,
    [preparedSlots]
  );

  const loadDoctorId =
    useCallback(async () => {
      const doctorIdFromContext =
        getDoctorId(user);

      if (doctorIdFromContext) {
        setDoctorId(
          doctorIdFromContext
        );

        return doctorIdFromContext;
      }

      const response = await api.get(
        "/auth/me"
      );

      const currentUser =
        extractCurrentUser(response);

      const currentDoctorId =
        getDoctorId(currentUser);

      if (!currentDoctorId) {
        throw new Error(
          text.doctorProfileError
        );
      }

      setDoctorId(currentDoctorId);

      return currentDoctorId;
    }, [user, text.doctorProfileError]);

  const loadCalendar =
    useCallback(
      async (
        targetDoctorId,
        date,
        isManualRefresh = false
      ) => {
        if (!targetDoctorId || !date) {
          return;
        }

        if (isManualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setMessage({
          type: "",
          text: "",
        });

        try {
          const [
            slotsResponse,
            appointmentsResponse,
            inProgressResponse,
            waitingFinishResponse,
          ] = await Promise.all([
            api.get("/schedules/slots", {
              params: {
                doctorId: targetDoctorId,
                date,
              },
            }),

            api.get("/appointments", {
              params: {
                date,
              },
            }),

            api.get("/appointments", {
              params: {
                status: "in_progress",
              },
            }),

            api.get("/appointments", {
              params: {
                status:
                  "waiting_finish_confirmation",
              },
            }),
          ]);

          const dayAppointments =
            extractArray(
              appointmentsResponse
            );

          const activeMap =
            new Map();

          for (const item of [
            ...extractArray(
              inProgressResponse
            ),
            ...extractArray(
              waitingFinishResponse
            ),
          ]) {
            if (item?.id) {
              activeMap.set(
                String(item.id),
                item
              );
            }
          }

          const activeItems =
            [...activeMap.values()];

          setSlots(
            extractArray(slotsResponse)
          );

          setAppointments(
            dayAppointments
          );

          setActiveAppointments(
            activeItems
          );

          if (
            activeItems.length > 0
          ) {
            window.localStorage.setItem(
              ACTIVE_VISIT_STORAGE_KEY,
              String(
                activeItems[0].id
              )
            );
          } else {
            window.localStorage.removeItem(
              ACTIVE_VISIT_STORAGE_KEY
            );
          }
        } catch (error) {
          setSlots([]);
          setAppointments([]);
          setActiveAppointments([]);

          setMessage({
            type: "error",
            text: getErrorMessage(
              error,
              text.calendarLoadError
            ),
          });
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [text.calendarLoadError]
    );

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setLoading(true);

      try {
        const currentDoctorId =
          await loadDoctorId();

        if (!cancelled) {
          await loadCalendar(
            currentDoctorId,
            selectedDate
          );
        }
      } catch (error) {
        if (!cancelled) {
          setMessage({
            type: "error",
            text: getErrorMessage(
              error,
              text.currentDoctorError
            ),
          });

          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [loadDoctorId, loadCalendar]);

  useEffect(() => {
    if (!doctorId) {
      return;
    }

    loadCalendar(
      doctorId,
      selectedDate
    );
  }, [
    doctorId,
    selectedDate,
    loadCalendar,
  ]);

  function selectPreviousDay() {
    setSelectedDate((current) =>
      addDays(current, -1)
    );
  }

  function selectNextDay() {
    setSelectedDate((current) =>
      addDays(current, 1)
    );
  }

  function selectToday() {
    setSelectedDate(
      getLocalDateString()
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>
            {text.calendarTitle}
          </h1>

          <p style={styles.sub}>
            {text.calendarSubtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            loadCalendar(
              doctorId,
              selectedDate,
              true
            )
          }
          disabled={
            refreshing ||
            loading ||
            !doctorId
          }
          style={{
            ...styles.refreshButton,
            ...(refreshing ||
            loading ||
            !doctorId
              ? styles.disabled
              : {}),
          }}
        >
          <RiRefreshLine />

          {refreshing
            ? text.refreshing
            : text.refresh}
        </button>
      </header>

      {message.text && (
        <div
          style={{
            ...styles.alert,

            ...(message.type === "error"
              ? styles.errorAlert
              : styles.successAlert),
          }}
        >
          {message.text}
        </div>
      )}

      {activeAppointments.length > 0 && (
        <section
          style={
            styles.activeVisitsPanel
          }
        >
          <div
            style={
              styles.activeVisitsHeader
            }
          >
            <div>
              <h2
                style={
                  styles.activeVisitsTitle
                }
              >
                {text.unfinishedVisitTitle}
              </h2>

              <p
                style={
                  styles.activeVisitsText
                }
              >
                {text.unfinishedVisitText}
              </p>
            </div>
          </div>

          <div
            style={
              styles.activeVisitsGrid
            }
          >
            {activeAppointments.map(
              (appointment) => (
                <article
                  key={
                    appointment.id
                  }
                  style={
                    styles.activeVisitCard
                  }
                >
                  <div>
                    <strong
                      style={
                        styles.activeVisitPatient
                      }
                    >
                      {getPatientName(
                        appointment,
                        text.patient
                      )}
                    </strong>

                    <span
                      style={
                        styles.activeVisitMeta
                      }
                    >
                      {formatSelectedDate(
                        getAppointmentDate(
                          appointment
                        ),
                        locale
                      )}{" "}
                      ·{" "}
                      {getAppointmentTime(
                        appointment
                      )}
                    </span>

                    <span
                      style={
                        styles.activeVisitMeta
                      }
                    >
                      {getAppointmentStatusLabel(
                        appointment.status,
                        text
                      )}
                    </span>
                  </div>

                  <Link
                    to={`/doctor/visit/${appointment.id}`}
                    style={
                      styles.activeVisitButton
                    }
                  >
                    {text.continueVisit}
                  </Link>
                </article>
              )
            )}
          </div>
        </section>
      )}

      <section style={styles.datePanel}>
        <button
          type="button"
          onClick={selectPreviousDay}
          style={styles.dateArrowButton}
          title={text.previousDay}
        >
          <RiArrowLeftSLine />
        </button>

        <div style={styles.dateCenter}>
          <RiCalendarLine
            style={styles.dateIcon}
          />

          <div>
            <strong style={styles.dateTitle}>
              {formatSelectedDate(
                selectedDate,
                locale
              )}
            </strong>

            <span style={styles.dateValue}>
              {selectedDate}
            </span>
          </div>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={(event) =>
            setSelectedDate(
              event.target.value
            )
          }
          style={styles.dateInput}
        />

        <button
          type="button"
          onClick={selectToday}
          style={styles.todayButton}
        >
          {text.today}
        </button>

        <button
          type="button"
          onClick={selectNextDay}
          style={styles.dateArrowButton}
          title={text.nextDay}
        >
          <RiArrowRightSLine />
        </button>
      </section>

      <section style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>
            {text.totalSlots}
          </span>

          <strong style={styles.statValue}>
            {preparedSlots.length}
          </strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>
            {text.available}
          </span>

          <strong
            style={{
              ...styles.statValue,
              color: "#6ee7b7",
            }}
          >
            {availableCount}
          </strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>
            {text.busy}
          </span>

          <strong
            style={{
              ...styles.statValue,
              color: "#93c5fd",
            }}
          >
            {busyCount}
          </strong>
        </div>
      </section>

      <section style={styles.calendarCard}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>
              {text.scheduleTitle}
            </h2>

            <p style={styles.cardSubtitle}>
              {text.scheduleSubtitle}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={styles.emptyState}>
            {text.loadingSchedule}
          </div>
        ) : preparedSlots.length === 0 ? (
          <div style={styles.emptyState}>
            <RiCalendarLine
              style={styles.emptyIcon}
            />

            <strong>
              {text.noWorkSlots}
            </strong>

            <span>
              {text.noWorkSlotsText}
            </span>
          </div>
        ) : (
          <div style={styles.slotsGrid}>
            {preparedSlots.map((slot) => {
              const appointment =
                slot.appointment;

              const appointmentStatus =
                clean(
                  appointment?.status
                );

              const statusStyle =
                getStatusStyle(
                  appointmentStatus
                );

              const slotKey = [
                selectedDate,
                slot.startTime,
                slot.endTime,
              ].join("-");

              if (slot.isAvailable) {
                return (
                  <article
                    key={slotKey}
                    style={{
                      ...styles.slotCard,
                      ...styles.availableSlot,

                      ...(slot.isPast
                        ? styles.pastSlot
                        : {}),
                    }}
                  >
                    <div style={styles.slotTimeRow}>
                      <RiTimeLine
                        style={
                          styles.availableIcon
                        }
                      />

                      <strong
                        style={styles.slotTime}
                      >
                        {slot.startTime}–
                        {slot.endTime}
                      </strong>
                    </div>

                    <div
                      style={
                        styles.availableContent
                      }
                    >
                      <strong
                        style={
                          styles.availableTitle
                        }
                      >
                        {slot.isPast
                          ? text.timePassed
                          : text.available}
                      </strong>

                      <span
                        style={
                          styles.availableText
                        }
                      >
                        {slot.isPast
                          ? text.pastUnavailable
                          : text.noPatientBooked}
                      </span>
                    </div>
                  </article>
                );
              }

              return (
                <article
                  key={slotKey}
                  style={{
                    ...styles.slotCard,
                    ...styles.busySlot,
                  }}
                >
                  <div style={styles.slotTop}>
                    <div
                      style={
                        styles.slotTimeRow
                      }
                    >
                      <RiCalendarCheckLine
                        style={styles.busyIcon}
                      />

                      <strong
                        style={styles.slotTime}
                      >
                        {slot.startTime}–
                        {slot.endTime}
                      </strong>
                    </div>

                    <span
                      style={{
                        ...styles.statusBadge,
                        ...statusStyle,
                      }}
                    >
                      {appointment
                        ? getAppointmentStatusLabel(
                            appointmentStatus,
                            text
                          )
                        : text.occupied}
                    </span>
                  </div>

                  {appointment ? (
                    <>
                      <div
                        style={
                          styles.patientBlock
                        }
                      >
                        <RiUserLine
                          style={
                            styles.patientIcon
                          }
                        />

                        <div>
                          <strong
                            style={
                              styles.patientName
                            }
                          >
                            {getPatientName(
                              appointment,
                              text.patient
                            )}
                          </strong>

                          {getPatientPhone(
                            appointment
                          ) && (
                            <span
                              style={
                                styles.patientMeta
                              }
                            >
                              {getPatientPhone(
                                appointment
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {getAppointmentReason(
                        appointment
                      ) && (
                        <p
                          style={
                            styles.reasonText
                          }
                        >
                          {text.reason}:{" "}
                          {getAppointmentReason(
                            appointment
                          )}
                        </p>
                      )}

                      {appointmentStatus !==
                        "completed" && (
                        <Link
                          to={`/doctor/visit?apptId=${appointment.id}`}
                          style={
                            styles.actionButton
                          }
                        >
                          {appointmentStatus ===
                          "in_progress"
                            ? text.continueVisit
                            : text.openRecord}
                        </Link>
                      )}

                      {appointmentStatus ===
                        "completed" && (
                        <span
                          style={
                            styles.completedText
                          }
                        >
                          {text.completedVisit}
                        </span>
                      )}
                    </>
                  ) : (
                    <div
                      style={
                        styles.unknownBusyBlock
                      }
                    >
                      {text.unknownBusy}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "22px",
  },

  title: {
    margin: "0 0 7px",
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
    borderRadius: "10px",
    border:
      "1px solid rgba(99,102,241,0.38)",
    background:
      "rgba(99,102,241,0.14)",
    color: "#c7d2fe",
    cursor: "pointer",
    fontWeight: 700,
  },

  alert: {
    marginBottom: "18px",
    padding: "13px 16px",
    border: "1px solid",
    borderRadius: "11px",
    lineHeight: 1.45,
  },

  errorAlert: {
    color: "#fca5a5",
    background:
      "rgba(239,68,68,0.12)",
    borderColor:
      "rgba(239,68,68,0.3)",
  },

  successAlert: {
    color: "#6ee7b7",
    background:
      "rgba(16,185,129,0.12)",
    borderColor:
      "rgba(16,185,129,0.3)",
  },

  datePanel: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "18px",
    padding: "15px",
    border:
      "1px solid rgba(255,255,255,0.07)",
    borderRadius: "16px",
    background:
      "rgba(30,41,59,0.42)",
  },

  dateCenter: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: 1,
    minWidth: "240px",
  },

  dateIcon: {
    fontSize: "28px",
    color: "#818cf8",
  },

  dateTitle: {
    display: "block",
    textTransform: "capitalize",
    fontSize: "16px",
  },

  dateValue: {
    display: "block",
    marginTop: "3px",
    color: "#94a3b8",
    fontSize: "12px",
  },

  dateArrowButton: {
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border:
      "1px solid rgba(148,163,184,0.24)",
    borderRadius: "10px",
    background:
      "rgba(148,163,184,0.08)",
    color: "#cbd5e1",
    cursor: "pointer",
    fontSize: "25px",
  },

  dateInput: {
    minHeight: "40px",
    padding: "8px 11px",
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: "9px",
    background:
      "rgba(2,6,23,0.35)",
    color: "#ffffff",
    colorScheme: "dark",
  },

  todayButton: {
    minHeight: "40px",
    padding: "9px 14px",
    border:
      "1px solid rgba(99,102,241,0.35)",
    borderRadius: "9px",
    background:
      "rgba(99,102,241,0.14)",
    color: "#c7d2fe",
    cursor: "pointer",
    fontWeight: 700,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "13px",
    marginBottom: "18px",
  },

  statCard: {
    padding: "17px",
    border:
      "1px solid rgba(255,255,255,0.07)",
    borderRadius: "14px",
    background:
      "rgba(30,41,59,0.42)",
  },

  statLabel: {
    display: "block",
    marginBottom: "7px",
    color: "#94a3b8",
    fontSize: "12px",
  },

  statValue: {
    fontSize: "27px",
  },

  calendarCard: {
    padding: "22px",
    border:
      "1px solid rgba(255,255,255,0.07)",
    borderRadius: "18px",
    background:
      "rgba(30,41,59,0.4)",
  },

  cardHeader: {
    marginBottom: "19px",
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

  slotsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(245px, 1fr))",
    gap: "13px",
  },

  slotCard: {
    minHeight: "145px",
    padding: "16px",
    border: "1px solid",
    borderRadius: "14px",
  },

  availableSlot: {
    borderColor:
      "rgba(16,185,129,0.25)",
    background:
      "rgba(16,185,129,0.07)",
  },

  busySlot: {
    borderColor:
      "rgba(59,130,246,0.25)",
    background:
      "rgba(59,130,246,0.08)",
  },

  pastSlot: {
    opacity: 0.55,
  },

  slotTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
    marginBottom: "15px",
  },

  slotTimeRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  slotTime: {
    fontSize: "17px",
  },

  availableIcon: {
    fontSize: "21px",
    color: "#34d399",
  },

  busyIcon: {
    fontSize: "21px",
    color: "#60a5fa",
  },

  availableContent: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    marginTop: "18px",
  },

  availableTitle: {
    color: "#6ee7b7",
    fontSize: "16px",
  },

  availableText: {
    color: "#94a3b8",
    fontSize: "12px",
    lineHeight: 1.45,
  },

  statusBadge: {
    padding: "5px 8px",
    border: "1px solid",
    borderRadius: "7px",
    fontSize: "10px",
    fontWeight: 700,
  },

  patientBlock: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },

  patientIcon: {
    fontSize: "22px",
    color: "#93c5fd",
  },

  patientName: {
    display: "block",
    fontSize: "14px",
  },

  patientMeta: {
    display: "block",
    marginTop: "3px",
    color: "#94a3b8",
    fontSize: "11px",
  },

  reasonText: {
    margin: "0 0 13px",
    color: "#cbd5e1",
    fontSize: "12px",
    lineHeight: 1.45,
  },

  actionButton: {
    display: "inline-flex",
    justifyContent: "center",
    padding: "9px 13px",
    borderRadius: "8px",
    background: "#6366f1",
    color: "#ffffff",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: 700,
  },

  completedText: {
    display: "inline-block",
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: 700,
  },

  unknownBusyBlock: {
    marginTop: "18px",
    color: "#94a3b8",
    fontSize: "12px",
    lineHeight: 1.45,
  },

  emptyState: {
    minHeight: "190px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    color: "#94a3b8",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "34px",
    color: "#64748b",
  },

  activeVisitsPanel: {
    marginBottom: "18px",
    padding: "18px",
    border:
      "1px solid rgba(245,158,11,0.32)",
    borderRadius: "16px",
    background:
      "rgba(245,158,11,0.08)",
  },

  activeVisitsHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    marginBottom: "14px",
  },

  activeVisitsTitle: {
    margin: "0 0 5px",
    color: "#fde68a",
    fontSize: "20px",
  },

  activeVisitsText: {
    margin: 0,
    color: "#cbd5e1",
    fontSize: "13px",
    lineHeight: 1.45,
  },

  activeVisitsGrid: {
    display: "grid",
    gap: "10px",
  },

  activeVisitCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "14px",
    flexWrap: "wrap",
    padding: "14px",
    border:
      "1px solid rgba(245,158,11,0.22)",
    borderRadius: "12px",
    background:
      "rgba(15,23,42,0.4)",
  },

  activeVisitPatient: {
    display: "block",
    marginBottom: "4px",
    fontSize: "15px",
  },

  activeVisitMeta: {
    display: "block",
    marginTop: "2px",
    color: "#94a3b8",
    fontSize: "11px",
  },

  activeVisitButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "40px",
    padding: "0 15px",
    borderRadius: "9px",
    background:
      "linear-gradient(90deg,#d97706,#f59e0b)",
    color: "#ffffff",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: 800,
  },

  disabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
};

