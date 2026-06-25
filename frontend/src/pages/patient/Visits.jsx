import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../api/api";
import { useLanguage } from "../../i18n/LanguageContext";

import {
  RiCalendarCheckLine,
  RiCalendarEventLine,
  RiCloseCircleLine,
  RiFileTextLine,
  RiHospitalLine,
  RiRefreshLine,
  RiStethoscopeLine,
  RiTimeLine,
  RiUserHeartLine,
} from "react-icons/ri";

const ACTIVE_STATUSES = [
  "scheduled",
  "confirmed",
  "transfer_pending",
  "transferred",
  "in_progress",
  "waiting_finish_confirmation",
];

const HISTORY_STATUSES = [
  "completed",
  "no_show",
  "cancelled",
  "cancelled_by_patient",
  "cancelled_by_organization",
];

const CONFIRMABLE_STATUSES = [
  "scheduled",
  "transfer_pending",
  "transferred",
];

const CANCELLABLE_STATUSES = [
  "scheduled",
  "confirmed",
  "transfer_pending",
  "transferred",
];

const STATUS_STYLES = {
  scheduled: {
    color: "#38bdf8",
    background: "rgba(56, 189, 248, 0.12)",
  },
  confirmed: {
    color: "#34d399",
    background: "rgba(52, 211, 153, 0.12)",
  },
  transfer_pending: {
    color: "#fbbf24",
    background: "rgba(251, 191, 36, 0.12)",
  },
  transferred: {
    color: "#a78bfa",
    background: "rgba(167, 139, 250, 0.12)",
  },
  in_progress: {
    color: "#22d3ee",
    background: "rgba(34, 211, 238, 0.12)",
  },
  waiting_finish_confirmation: {
    color: "#f59e0b",
    background: "rgba(245, 158, 11, 0.12)",
  },
  completed: {
    color: "#cbd5e1",
    background: "rgba(148, 163, 184, 0.12)",
  },
  no_show: {
    color: "#fb7185",
    background: "rgba(251, 113, 133, 0.12)",
  },
  cancelled: {
    color: "#fb7185",
    background: "rgba(251, 113, 133, 0.12)",
  },
  cancelled_by_patient: {
    color: "#fb7185",
    background: "rgba(251, 113, 133, 0.12)",
  },
  cancelled_by_organization: {
    color: "#ef4444",
    background: "rgba(239, 68, 68, 0.12)",
  },
};

const TEXTS = {
  ru: {
    title: "Записи",
    subtitle: "Активные записи к врачам и история ваших посещений.",
    refresh: "Обновить",
    activeTab: "Активные записи",
    historyTab: "История посещений",
    activeRecord: "АКТИВНАЯ ЗАПИСЬ",
    visitHistory: "ИСТОРИЯ ПОСЕЩЕНИЙ",
    selectRecord: "Выберите запись",
    selectRecordHint: "Здесь появится подробная информация.",
    activeEmptyTitle: "Активных записей нет",
    historyEmptyTitle: "История посещений пуста",
    activeEmptyText: "После записи к врачу информация появится здесь.",
    historyEmptyText: "Завершённые, отменённые записи и неявки появятся здесь.",
    loadingRecords: "Загрузка записей...",
    doctor: "Врач",
    specialty: "Специальность",
    organization: "Организация",
    time: "Время",
    appointmentTime: "Время приёма",
    plannedTime: "Плановое время",
    visitStart: "Начало приёма",
    visitEnd: "Окончание приёма",
    organizationAddress: "Адрес организации",
    reason: "Причина",
    visitReason: "Причина обращения",
    reasonNotSpecified: "Причина не указана",
    cancellationReasonNotSpecified: "Причина отмены не указана",
    cancelledBy: "Кем отменена запись",
    cancelledByPatient: "Пациентом",
    cancelledByOrganization: "Медицинской организацией",
    noShowMarkedByDoctor: "Врачом отмечена неявка",
    patientDidNotAttend: "Пациент не пришёл на приём",
    complaints: "Жалобы",
    symptoms: "Симптомы",
    examinationResults: "Результаты осмотра",
    preliminaryDiagnosis: "Предварительный диагноз",
    finalDiagnosis: "Окончательный диагноз",
    treatment: "Назначенное лечение",
    recommendations: "Рекомендации",
    doctorComment: "Комментарий врача",
    ticketCodeTitle: "КОД ЭЛЕКТРОННОГО ТАЛОНА",
    ticketCodeHint: "Покажите код врачу перед началом приёма.",
    copy: "Копировать",
    processing: "Обработка...",
    confirmVisit: "Подтвердить посещение",
    cancelAppointment: "Отменить запись",
    notSpecified: "Не указано",
    noData: "Нет данных",
    dateNotSpecified: "Дата не указана",
    doctorNotSpecified: "Врач не указан",
    specialtyNotSpecified: "Специальность не указана",
    organizationNotSpecified: "Организация не указана",
    statusNotSpecified: "Статус не указан",
    loadRecordsFailed: "Не удалось загрузить записи.",
    getRecordsFailed: "Не удалось получить записи.",
    confirmFailed: "Не удалось подтвердить запись.",
    confirmSuccess: "Посещение успешно подтверждено.",
    cancelFailed: "Не удалось отменить запись.",
    cancelSuccess: "Запись успешно отменена.",
    copySuccess: "Код электронного талона скопирован.",
    copyFailed: "Не удалось скопировать код талона.",
    cancelConfirmPrefix: "Вы действительно хотите отменить запись на",
    at: "в",
    statuses: {
      scheduled: "Запись создана",
      confirmed: "Посещение подтверждено",
      transfer_pending: "Ожидается подтверждение переноса",
      transferred: "Запись перенесена",
      in_progress: "Приём идёт",
      waiting_finish_confirmation: "Ожидается завершение",
      completed: "Приём завершён",
      no_show: "Неявка",
      cancelled: "Запись отменена",
      cancelled_by_patient: "Отменена пациентом",
      cancelled_by_organization: "Отменена организацией",
    },
  },

  kk: {
    title: "Жазбалар",
    subtitle: "Дәрігерге белсенді жазбалар және қабылдау тарихы.",
    refresh: "Жаңарту",
    activeTab: "Белсенді жазбалар",
    historyTab: "Қабылдау тарихы",
    activeRecord: "БЕЛСЕНДІ ЖАЗБА",
    visitHistory: "ҚАБЫЛДАУ ТАРИХЫ",
    selectRecord: "Жазбаны таңдаңыз",
    selectRecordHint: "Толық ақпарат осы жерде көрсетіледі.",
    activeEmptyTitle: "Белсенді жазбалар жоқ",
    historyEmptyTitle: "Қабылдау тарихы бос",
    activeEmptyText: "Дәрігерге жазылғаннан кейін ақпарат осы жерде көрсетіледі.",
    historyEmptyText: "Аяқталған, жойылған жазбалар және келмеу жағдайлары осы жерде көрсетіледі.",
    loadingRecords: "Жазбалар жүктелуде...",
    doctor: "Дәрігер",
    specialty: "Мамандығы",
    organization: "Ұйым",
    time: "Уақыты",
    appointmentTime: "Қабылдау уақыты",
    plannedTime: "Жоспарланған уақыт",
    visitStart: "Қабылдаудың басталуы",
    visitEnd: "Қабылдаудың аяқталуы",
    organizationAddress: "Ұйымның мекенжайы",
    reason: "Себебі",
    visitReason: "Жүгіну себебі",
    reasonNotSpecified: "Себебі көрсетілмеген",
    cancellationReasonNotSpecified: "Жою себебі көрсетілмеген",
    cancelledBy: "Жазбаны кім жойды",
    cancelledByPatient: "Емделуші",
    cancelledByOrganization: "Медициналық ұйым",
    noShowMarkedByDoctor: "Дәрігер келмегенін белгіледі",
    patientDidNotAttend: "Емделуші қабылдауға келмеді",
    complaints: "Шағымдар",
    symptoms: "Белгілер",
    examinationResults: "Қарау нәтижелері",
    preliminaryDiagnosis: "Алдын ала диагноз",
    finalDiagnosis: "Қорытынды диагноз",
    treatment: "Тағайындалған ем",
    recommendations: "Ұсынымдар",
    doctorComment: "Дәрігер пікірі",
    ticketCodeTitle: "ЭЛЕКТРОНДЫҚ ТАЛОН КОДЫ",
    ticketCodeHint: "Кодты қабылдау басталар алдында дәрігерге көрсетіңіз.",
    copy: "Көшіру",
    processing: "Өңделуде...",
    confirmVisit: "Қабылдауға келуді растау",
    cancelAppointment: "Жазбаны жою",
    notSpecified: "Көрсетілмеген",
    noData: "Деректер жоқ",
    dateNotSpecified: "Күні көрсетілмеген",
    doctorNotSpecified: "Дәрігер көрсетілмеген",
    specialtyNotSpecified: "Мамандық көрсетілмеген",
    organizationNotSpecified: "Ұйым көрсетілмеген",
    statusNotSpecified: "Мәртебе көрсетілмеген",
    loadRecordsFailed: "Жазбаларды жүктеу мүмкін болмады.",
    getRecordsFailed: "Жазбаларды алу мүмкін болмады.",
    confirmFailed: "Жазбаны растау мүмкін болмады.",
    confirmSuccess: "Қабылдауға келу сәтті расталды.",
    cancelFailed: "Жазбаны жою мүмкін болмады.",
    cancelSuccess: "Жазба сәтті жойылды.",
    copySuccess: "Электрондық талон коды көшірілді.",
    copyFailed: "Талон кодын көшіру мүмкін болмады.",
    cancelConfirmPrefix: "Мына күнгі жазбаны жойғыңыз келетініне сенімдісіз бе:",
    at: "сағат",
    statuses: {
      scheduled: "Жазба жасалды",
      confirmed: "Қабылдауға келу расталды",
      transfer_pending: "Ауыстыруды растау күтілуде",
      transferred: "Жазба ауыстырылды",
      in_progress: "Қабылдау жүріп жатыр",
      waiting_finish_confirmation: "Аяқталуды растау күтілуде",
      completed: "Қабылдау аяқталды",
      no_show: "Келмеді",
      cancelled: "Жазба жойылды",
      cancelled_by_patient: "Емделуші жойды",
      cancelled_by_organization: "Ұйым жойды",
    },
  },
};

function clean(value) {
  return String(value ?? "").trim();
}

function getDoctorName(record, text) {
  return (
    clean(record?.doctor?.profile?.full_name) ||
    clean(record?.doctor?.organization_members?.profiles?.full_name) ||
    clean(record?.doctors?.organization_members?.profiles?.full_name) ||
    clean(record?.doctor_profile?.full_name) ||
    clean(record?.doctor_name) ||
    text.doctorNotSpecified
  );
}

function getSpecialtyName(record, text, isKazakh) {
  const specialty =
    record?.doctor?.specialty ||
    record?.doctor?.specialties ||
    record?.doctors?.specialties ||
    record?.specialty ||
    {};

  return (
    (isKazakh
      ? clean(specialty?.name_kz) || clean(specialty?.name_kk)
      : clean(specialty?.name_ru)) ||
    clean(specialty?.name_ru) ||
    clean(specialty?.name_kz) ||
    clean(specialty?.name_kk) ||
    clean(record?.specialty_name) ||
    text.specialtyNotSpecified
  );
}

function getOrganizationName(record, text, isKazakh) {
  const organization =
    record?.organization ||
    record?.organizations ||
    record?.appointment?.organization ||
    {};

  return (
    (isKazakh
      ? clean(organization?.name_kz) || clean(organization?.name_kk)
      : clean(organization?.name_ru)) ||
    clean(organization?.name) ||
    clean(organization?.name_ru) ||
    clean(organization?.name_kz) ||
    clean(organization?.name_kk) ||
    clean(record?.organization_name) ||
    text.organizationNotSpecified
  );
}

function getOrganizationAddress(record) {
  return (
    clean(record?.organization?.address) ||
    clean(record?.organizations?.address) ||
    clean(record?.appointment?.organization?.address) ||
    clean(record?.organization_address) ||
    ""
  );
}

function getRecordDate(record) {
  return (
    clean(record?.date) ||
    clean(record?.appointment?.date) ||
    clean(record?.appointments?.date) ||
    clean(record?.created_at).slice(0, 10)
  );
}

function getRecordTime(record) {
  return (
    clean(record?.time) ||
    clean(record?.appointment?.time) ||
    clean(record?.appointments?.time) ||
    ""
  );
}

function formatDate(value, locale, fallback) {
  if (!value) {
    return fallback;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(value, locale) {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(locale);
}

function formatTime(value) {
  if (!value) {
    return "—";
  }

  return String(value).slice(0, 5);
}

function formatDateTime(value, locale, fallback) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSortTime(record) {
  const date = getRecordDate(record);
  const time = getRecordTime(record) || "00:00";
  const result = new Date(`${date}T${time}`).getTime();

  return Number.isNaN(result) ? 0 : result;
}

function getStatusInfo(status, text) {
  const style =
    STATUS_STYLES[status] || {
      color: "#cbd5e1",
      background: "rgba(148, 163, 184, 0.12)",
    };

  return {
    ...style,
    label:
      text.statuses[status] ||
      status ||
      text.statusNotSpecified,
  };
}

function getAppointmentIdFromVisit(visit) {
  return clean(
    visit?.appointment_id ||
      visit?.appointment?.id ||
      visit?.appointments?.id
  );
}

function StatusBadge({ status, text }) {
  const info = getStatusInfo(status, text);

  return (
    <span
      style={{
        ...styles.statusBadge,
        color: info.color,
        background: info.background,
        borderColor: info.color,
      }}
    >
      {info.label}
    </span>
  );
}

function InfoCard({ icon, label, value, fallback }) {
  return (
    <div style={styles.infoCard}>
      <div style={styles.infoIcon}>{icon}</div>

      <div>
        <p style={styles.infoLabel}>{label}</p>
        <p style={styles.infoValue}>{value || fallback}</p>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  fallback,
  danger = false,
}) {
  return (
    <div style={styles.field}>
      <span
        style={{
          ...styles.fieldLabel,
          color: danger ? "#fb7185" : "#818cf8",
        }}
      >
        {label}
      </span>

      <p
        style={{
          ...styles.fieldText,
          ...(danger ? styles.dangerField : {}),
        }}
      >
        {value || fallback}
      </p>
    </div>
  );
}

export default function Visits() {
  const { language } = useLanguage();

  const isKazakh =
    language === "kk" || language === "kz";

  const text = isKazakh ? TEXTS.kk : TEXTS.ru;
  const locale = isKazakh ? "kk-KZ" : "ru-RU";

  const [activeTab, setActiveTab] = useState("active");
  const [appointments, setAppointments] = useState([]);
  const [visits, setVisits] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        api.get("/appointments"),
        api.get("/visits"),
      ]);

      const appointmentsResult = results[0];
      const visitsResult = results[1];

      if (appointmentsResult.status === "rejected") {
        throw appointmentsResult.reason;
      }

      const appointmentsResponse = appointmentsResult.value;

      if (!appointmentsResponse.data?.success) {
        throw new Error(
          text.getRecordsFailed
        );
      }

      setAppointments(
        Array.isArray(appointmentsResponse.data.data)
          ? appointmentsResponse.data.data
          : []
      );

      if (
        visitsResult.status === "fulfilled" &&
        visitsResult.value.data?.success
      ) {
        setVisits(
          Array.isArray(visitsResult.value.data.data)
            ? visitsResult.value.data.data
            : []
        );
      } else {
        setVisits([]);
      }
    } catch (requestError) {
      console.error("Visits loading error:", requestError);

      setError(
        text.loadRecordsFailed
      );
    } finally {
      setLoading(false);
    }
  }, [text]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeAppointments = useMemo(() => {
    return appointments
      .filter((appointment) =>
        ACTIVE_STATUSES.includes(appointment.status)
      )
      .sort((first, second) => {
        return getSortTime(first) - getSortTime(second);
      });
  }, [appointments]);

  const historyRecords = useMemo(() => {
    const visitMap = new Map();

    visits.forEach((visit) => {
      const appointmentId = getAppointmentIdFromVisit(visit);

      if (appointmentId) {
        visitMap.set(appointmentId, visit);
      }
    });

    const appointmentHistory = appointments
      .filter((appointment) =>
        HISTORY_STATUSES.includes(appointment.status)
      )
      .map((appointment) => ({
        ...appointment,
        visitDetails:
          visitMap.get(String(appointment.id)) || null,
      }));

    const usedVisitIds = new Set(
      appointmentHistory
        .map((record) => record.visitDetails?.id)
        .filter(Boolean)
        .map(String)
    );

    const independentVisits = visits
      .filter(
        (visit) => !usedVisitIds.has(String(visit.id))
      )
      .map((visit) => ({
        ...visit,
        id: `visit-${visit.id}`,
        status: "completed",
        date: getRecordDate(visit),
        time: getRecordTime(visit),
        visitDetails: visit,
      }));

    return [...appointmentHistory, ...independentVisits].sort(
      (first, second) => {
        return getSortTime(second) - getSortTime(first);
      }
    );
  }, [appointments, visits]);

  const displayedRecords =
    activeTab === "active"
      ? activeAppointments
      : historyRecords;

  useEffect(() => {
    if (displayedRecords.length === 0) {
      setSelectedRecord(null);
      return;
    }

    const selectedExists = displayedRecords.some(
      (record) =>
        String(record.id) === String(selectedRecord?.id)
    );

    if (!selectedExists) {
      setSelectedRecord(displayedRecords[0]);
    }
  }, [displayedRecords, selectedRecord?.id]);

  function showSuccess(message) {
    setSuccess(message);

    window.setTimeout(() => {
      setSuccess("");
    }, 3500);
  }

  async function confirmAppointment(record) {
    if (!record?.id) {
      return;
    }

    const appointmentId = String(record.id);

    setActionLoadingId(appointmentId);
    setError("");

    try {
      const response = await api.post(
        `/appointments/${appointmentId}/confirm`
      );

      if (!response.data?.success) {
        throw new Error(
          text.confirmFailed
        );
      }

      const serverRecord = response.data?.data || {};

      setAppointments((previousAppointments) =>
        previousAppointments.map((appointment) =>
          String(appointment.id) === appointmentId
            ? {
                ...appointment,
                ...serverRecord,
                status: "confirmed",
              }
            : appointment
        )
      );

      setSelectedRecord((previousRecord) => {
        if (String(previousRecord?.id) !== appointmentId) {
          return previousRecord;
        }

        return {
          ...previousRecord,
          ...serverRecord,
          status: "confirmed",
        };
      });

      showSuccess(
        text.confirmSuccess
      );
    } catch (requestError) {
      console.error("Appointment confirmation error:", requestError);

      setError(
        text.confirmFailed
      );
    } finally {
      setActionLoadingId("");
    }
  }

  async function cancelAppointment(record) {
    const confirmed = window.confirm(
      `${text.cancelConfirmPrefix} ${formatDate(
        getRecordDate(record),
        locale,
        text.dateNotSpecified
      )} ${text.at} ${formatTime(getRecordTime(record))}?`
    );

    if (!confirmed) {
      return;
    }

    setActionLoadingId(String(record.id));
    setError("");

    try {
      const response = await api.post(
        `/appointments/${record.id}/cancel`
      );

      if (!response.data?.success) {
        throw new Error(
          text.cancelFailed
        );
      }

      showSuccess(
        text.cancelSuccess
      );

      await loadData();
    } catch (requestError) {
      setError(
        text.cancelFailed
      );
    } finally {
      setActionLoadingId("");
    }
  }

  async function copyTicketCode(record) {
    if (!record.qr_token) {
      return;
    }

    try {
      await navigator.clipboard.writeText(record.qr_token);
      showSuccess(text.copySuccess);
    } catch {
      setError(text.copyFailed);
    }
  }

  function renderRecordList() {
    if (loading) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.loader} />
          <p style={styles.emptyText}>{text.loadingRecords}</p>
        </div>
      );
    }

    if (displayedRecords.length === 0) {
      return (
        <div style={styles.emptyState}>
          {activeTab === "active" ? (
            <RiCalendarEventLine style={styles.emptyIcon} />
          ) : (
            <RiFileTextLine style={styles.emptyIcon} />
          )}

          <h3 style={styles.emptyTitle}>
            {activeTab === "active"
              ? text.activeEmptyTitle
              : text.historyEmptyTitle}
          </h3>

          <p style={styles.emptyText}>
            {activeTab === "active"
              ? text.activeEmptyText
              : text.historyEmptyText}
          </p>
        </div>
      );
    }

    return (
      <div style={styles.list}>
        {displayedRecords.map((record) => {
          const isSelected =
            String(selectedRecord?.id) === String(record.id);

          return (
            <button
              type="button"
              key={record.id}
              onClick={() => setSelectedRecord(record)}
              style={{
                ...styles.listItem,
                ...(isSelected ? styles.selectedItem : {}),
              }}
            >
              <div style={styles.itemTop}>
                <span style={styles.dateText}>
                  <RiCalendarEventLine />
                  {formatShortDate(
                    getRecordDate(record),
                    locale
                  )}
                </span>

                <span style={styles.timeText}>
                  <RiTimeLine />
                  {formatTime(getRecordTime(record))}
                </span>
              </div>

              <h4 style={styles.doctorName}>
                {getDoctorName(record, text)}
              </h4>

              <p style={styles.specialtyText}>
                {getSpecialtyName(record, text, isKazakh)}
              </p>

              <div style={styles.itemBadge}>
                <StatusBadge status={record.status} text={text} />
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function renderActiveRecord(record) {
    const isProcessing =
      actionLoadingId === String(record.id);

    const address = getOrganizationAddress(record);

    return (
      <>
        <div style={styles.detailHeader}>
          <div>
            <p style={styles.detailType}>{text.activeRecord}</p>

            <h3 style={styles.detailTitle}>
              {formatDate(
                getRecordDate(record),
                locale,
                text.dateNotSpecified
              )}
            </h3>

            <p style={styles.detailSubtitle}>
              {text.appointmentTime}: {" "}
              <strong>{formatTime(getRecordTime(record))}</strong>
            </p>
          </div>

          <StatusBadge status={record.status} text={text} />
        </div>

        <div style={styles.infoGrid}>
          <InfoCard
            icon={<RiUserHeartLine />}
            label={text.doctor}
            value={getDoctorName(record, text)}
            fallback={text.notSpecified}
          />

          <InfoCard
            icon={<RiStethoscopeLine />}
            label={text.specialty}
            value={getSpecialtyName(record, text, isKazakh)}
            fallback={text.notSpecified}
          />

          <InfoCard
            icon={<RiHospitalLine />}
            label={text.organization}
            value={getOrganizationName(record, text, isKazakh)}
            fallback={text.notSpecified}
          />

          <InfoCard
            icon={<RiTimeLine />}
            label={text.time}
            value={formatTime(getRecordTime(record))}
            fallback={text.notSpecified}
          />
        </div>

        {address && (
          <DetailField
            label={text.organizationAddress}
            value={address}
            fallback={text.noData}
          />
        )}

        <DetailField
          label={text.visitReason}
          value={record.reason || text.reasonNotSpecified}
          fallback={text.noData}
        />

        {record.qr_token && (
          <div style={styles.ticket}>
            <div>
              <p style={styles.ticketTitle}>
                {text.ticketCodeTitle}
              </p>

              <p style={styles.ticketCode}>{record.qr_token}</p>

              <p style={styles.ticketDescription}>
                {text.ticketCodeHint}
              </p>
            </div>

            <button
              type="button"
              onClick={() => copyTicketCode(record)}
              style={styles.copyButton}
            >
              {text.copy}
            </button>
          </div>
        )}

        <div style={styles.actions}>
          {CONFIRMABLE_STATUSES.includes(record.status) && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => confirmAppointment(record)}
              style={{
                ...styles.confirmButton,
                ...(isProcessing ? styles.disabled : {}),
              }}
            >
              <RiCalendarCheckLine />

              {isProcessing
                ? text.processing
                : text.confirmVisit}
            </button>
          )}

          {CANCELLABLE_STATUSES.includes(record.status) && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => cancelAppointment(record)}
              style={{
                ...styles.cancelButton,
                ...(isProcessing ? styles.disabled : {}),
              }}
            >
              <RiCloseCircleLine />

              {isProcessing
                ? text.processing
                : text.cancelAppointment}
            </button>
          )}
        </div>
      </>
    );
  }

  function renderHistoryRecord(record) {
    const visit = record.visitDetails || record;

    const cancelledStatuses = [
      "cancelled",
      "cancelled_by_patient",
      "cancelled_by_organization",
      "no_show",
    ];

    const isCancelled = cancelledStatuses.includes(record.status);

    return (
      <>
        <div style={styles.detailHeader}>
          <div>
            <p style={styles.detailType}>{text.visitHistory}</p>

            <h3 style={styles.detailTitle}>
              {formatDate(
                getRecordDate(record),
                locale,
                text.dateNotSpecified
              )}
            </h3>

            <p style={styles.detailSubtitle}>
              {text.plannedTime}: {" "}
              <strong>{formatTime(getRecordTime(record))}</strong>
            </p>
          </div>

          <StatusBadge status={record.status} text={text} />
        </div>

        <div style={styles.infoGrid}>
          <InfoCard
            icon={<RiUserHeartLine />}
            label={text.doctor}
            value={getDoctorName(record, text)}
            fallback={text.notSpecified}
          />

          <InfoCard
            icon={<RiStethoscopeLine />}
            label={text.specialty}
            value={getSpecialtyName(record, text, isKazakh)}
            fallback={text.notSpecified}
          />

          <InfoCard
            icon={<RiHospitalLine />}
            label={text.organization}
            value={getOrganizationName(record, text, isKazakh)}
            fallback={text.notSpecified}
          />

          <InfoCard
            icon={<RiTimeLine />}
            label={text.visitStart}
            value={formatDateTime(
              record.actual_start_time || visit.actual_start_time,
              locale,
              text.notSpecified
            )}
            fallback={text.notSpecified}
          />
        </div>

        {isCancelled ? (
          <>
            <DetailField
              danger
              label={text.reason}
              value={
                record.cancellation_reason ||
                (record.status === "no_show"
                  ? text.patientDidNotAttend
                  : text.cancellationReasonNotSpecified)
              }
              fallback={text.noData}
            />

            <DetailField
              label={text.cancelledBy}
              value={
                record.status === "cancelled_by_patient"
                  ? text.cancelledByPatient
                  : record.status === "cancelled_by_organization"
                  ? text.cancelledByOrganization
                  : record.status === "no_show"
                  ? text.noShowMarkedByDoctor
                  : text.notSpecified
              }
              fallback={text.notSpecified}
            />
          </>
        ) : (
          <>
            <DetailField
              label={text.complaints}
              value={visit.complaints}
              fallback={text.noData}
            />

            <DetailField
              label={text.symptoms}
              value={visit.symptoms}
              fallback={text.noData}
            />

            <DetailField
              label={text.examinationResults}
              value={
                visit.examination_results || visit.examination
              }
              fallback={text.noData}
            />

            <DetailField
              label={text.preliminaryDiagnosis}
              value={visit.preliminary_diagnosis}
              fallback={text.noData}
            />

            <DetailField
              label={text.finalDiagnosis}
              value={visit.final_diagnosis}
              fallback={text.noData}
            />

            <DetailField
              label={text.treatment}
              value={visit.treatment}
              fallback={text.noData}
            />

            <DetailField
              label={text.recommendations}
              value={visit.recommendations}
              fallback={text.noData}
            />

            <DetailField
              label={text.doctorComment}
              value={visit.comment || visit.additional_comment}
              fallback={text.noData}
            />

            <DetailField
              label={text.visitEnd}
              value={formatDateTime(
                record.actual_end_time || visit.actual_end_time,
                locale,
                text.notSpecified
              )}
              fallback={text.notSpecified}
            />
          </>
        )}
      </>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>{text.title}</h1>

          <p style={styles.subtitle}>{text.subtitle}</p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={loadData}
          style={{
            ...styles.refreshButton,
            ...(loading ? styles.disabled : {}),
          }}
        >
          <RiRefreshLine />
          {text.refresh}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.tabs}>
        <button
          type="button"
          onClick={() => {
            setActiveTab("active");
            setSelectedRecord(null);
          }}
          style={{
            ...styles.tab,
            ...(activeTab === "active" ? styles.activeTab : {}),
          }}
        >
          <RiCalendarCheckLine />
          {text.activeTab}

          <span style={styles.counter}>
            {activeAppointments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("history");
            setSelectedRecord(null);
          }}
          style={{
            ...styles.tab,
            ...(activeTab === "history" ? styles.activeTab : {}),
          }}
        >
          <RiFileTextLine />
          {text.historyTab}

          <span style={styles.counter}>
            {historyRecords.length}
          </span>
        </button>
      </div>

      <div style={styles.layout}>
        <section style={styles.listCard}>
          {renderRecordList()}
        </section>

        <section style={styles.detailCard}>
          {selectedRecord ? (
            activeTab === "active" ? (
              renderActiveRecord(selectedRecord)
            ) : (
              renderHistoryRecord(selectedRecord)
            )
          ) : (
            <div style={styles.emptyState}>
              <RiFileTextLine style={styles.emptyIcon} />

              <h3 style={styles.emptyTitle}>
                {text.selectRecord}
              </h3>

              <p style={styles.emptyText}>
                {text.selectRecordHint}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1500px",
    margin: "0 auto",
    padding: "32px",
    color: "#ffffff",
    fontFamily: "'Outfit', sans-serif",
  },

  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "18px",
    marginBottom: "26px",
  },

  title: {
    margin: "0 0 8px",
    fontSize: "32px",
    fontWeight: 700,
  },

  subtitle: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "15px",
  },

  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minHeight: "42px",
    padding: "0 16px",
    borderRadius: "11px",
    border: "1px solid rgba(129, 140, 248, 0.35)",
    background: "rgba(99, 102, 241, 0.13)",
    color: "#c7d2fe",
    fontWeight: 700,
    cursor: "pointer",
  },

  tabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "22px",
    padding: "6px",
    borderRadius: "15px",
    background: "rgba(15, 23, 42, 0.55)",
    border: "1px solid rgba(148, 163, 184, 0.1)",
  },

  tab: {
    minHeight: "46px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 17px",
    border: "1px solid transparent",
    borderRadius: "11px",
    background: "transparent",
    color: "#94a3b8",
    fontWeight: 700,
    cursor: "pointer",
  },

  activeTab: {
    color: "#ffffff",
    background:
      "linear-gradient(135deg, #4f46e5, #7c3aed)",
  },

  counter: {
    minWidth: "23px",
    height: "23px",
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "0 6px",
    borderRadius: "999px",
    background: "rgba(15, 23, 42, 0.45)",
    color: "#ffffff",
    fontSize: "12px",
  },

  layout: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "22px",
    alignItems: "start",
  },

  listCard: {
    minHeight: "520px",
    padding: "18px",
    borderRadius: "19px",
    background: "rgba(30, 41, 59, 0.42)",
    border: "1px solid rgba(148, 163, 184, 0.1)",
  },

  detailCard: {
    minHeight: "520px",
    padding: "27px",
    borderRadius: "19px",
    background: "rgba(30, 41, 59, 0.42)",
    border: "1px solid rgba(148, 163, 184, 0.1)",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "11px",
  },

  listItem: {
    width: "100%",
    padding: "16px",
    textAlign: "left",
    color: "#ffffff",
    background: "rgba(15, 23, 42, 0.47)",
    border: "1px solid rgba(148, 163, 184, 0.1)",
    borderRadius: "14px",
    cursor: "pointer",
  },

  selectedItem: {
    background: "rgba(99, 102, 241, 0.14)",
    borderColor: "#6366f1",
  },

  itemTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "11px",
  },

  dateText: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#cbd5e1",
    fontSize: "13px",
  },

  timeText: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#818cf8",
    fontSize: "13px",
    fontWeight: 800,
  },

  doctorName: {
    margin: "0 0 4px",
    color: "#f8fafc",
    fontSize: "16px",
  },

  specialtyText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "13px",
  },

  itemBadge: {
    marginTop: "13px",
  },

  statusBadge: {
    display: "inline-flex",
    padding: "5px 10px",
    border: "1px solid",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 800,
  },

  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "16px",
    paddingBottom: "20px",
    marginBottom: "21px",
    borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
  },

  detailType: {
    margin: "0 0 7px",
    color: "#818cf8",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.1em",
  },

  detailTitle: {
    margin: "0 0 7px",
    fontSize: "23px",
  },

  detailSubtitle: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "14px",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "11px",
    marginBottom: "22px",
  },

  infoCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "11px",
    padding: "14px",
    borderRadius: "13px",
    background: "rgba(15, 23, 42, 0.5)",
    border: "1px solid rgba(148, 163, 184, 0.09)",
  },

  infoIcon: {
    width: "35px",
    height: "35px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    borderRadius: "9px",
    background: "rgba(99, 102, 241, 0.15)",
    color: "#818cf8",
    fontSize: "18px",
  },

  infoLabel: {
    margin: "0 0 4px",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: 800,
    textTransform: "uppercase",
  },

  infoValue: {
    margin: 0,
    color: "#e2e8f0",
    fontSize: "13px",
    lineHeight: 1.4,
  },

  field: {
    marginBottom: "17px",
  },

  fieldLabel: {
    display: "block",
    marginBottom: "6px",
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
  },

  fieldText: {
    margin: 0,
    padding: "13px 15px",
    borderRadius: "11px",
    background: "rgba(15, 23, 42, 0.5)",
    border: "1px solid rgba(148, 163, 184, 0.08)",
    color: "#e2e8f0",
    fontSize: "14px",
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
  },

  dangerField: {
    color: "#fecdd3",
    background: "rgba(190, 18, 60, 0.1)",
    borderColor: "rgba(251, 113, 133, 0.22)",
  },

  ticket: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "17px",
    marginTop: "22px",
    padding: "18px",
    borderRadius: "15px",
    background: "rgba(79, 70, 229, 0.15)",
    border: "1px solid rgba(129, 140, 248, 0.3)",
  },

  ticketTitle: {
    margin: "0 0 7px",
    color: "#a5b4fc",
    fontSize: "10px",
    fontWeight: 800,
  },

  ticketCode: {
    margin: "0 0 6px",
    color: "#ffffff",
    fontFamily: "monospace",
    fontSize: "20px",
    fontWeight: 800,
    wordBreak: "break-all",
  },

  ticketDescription: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "12px",
  },

  copyButton: {
    minHeight: "39px",
    padding: "0 14px",
    borderRadius: "9px",
    border: "1px solid rgba(165, 180, 252, 0.35)",
    background: "rgba(99, 102, 241, 0.2)",
    color: "#e0e7ff",
    fontWeight: 700,
    cursor: "pointer",
  },

  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "11px",
    marginTop: "24px",
  },

  confirmButton: {
    minHeight: "45px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 18px",
    border: "none",
    borderRadius: "11px",
    background: "linear-gradient(135deg, #059669, #10b981)",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  },

  cancelButton: {
    minHeight: "45px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 18px",
    borderRadius: "11px",
    border: "1px solid rgba(251, 113, 133, 0.35)",
    background: "rgba(190, 18, 60, 0.15)",
    color: "#fda4af",
    fontWeight: 800,
    cursor: "pointer",
  },

  emptyState: {
    minHeight: "440px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    padding: "25px",
  },

  emptyIcon: {
    marginBottom: "12px",
    color: "#6366f1",
    fontSize: "45px",
  },

  emptyTitle: {
    margin: "0 0 7px",
    color: "#e2e8f0",
    fontSize: "18px",
  },

  emptyText: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  loader: {
    width: "35px",
    height: "35px",
    marginBottom: "13px",
    border: "3px solid rgba(148, 163, 184, 0.15)",
    borderTopColor: "#6366f1",
    borderRadius: "50%",
  },

  error: {
    marginBottom: "16px",
    padding: "13px 15px",
    borderRadius: "11px",
    background: "rgba(190, 18, 60, 0.12)",
    border: "1px solid rgba(251, 113, 133, 0.3)",
    color: "#fecdd3",
  },

  success: {
    marginBottom: "16px",
    padding: "13px 15px",
    borderRadius: "11px",
    background: "rgba(5, 150, 105, 0.12)",
    border: "1px solid rgba(52, 211, 153, 0.3)",
    color: "#a7f3d0",
  },

  disabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
};
