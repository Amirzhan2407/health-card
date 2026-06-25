
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  RiCalendarLine,
  RiFileCopyLine,
  RiRefreshLine,
  RiSaveLine,
  RiTimeLine,
} from "react-icons/ri";

import api from "../../api/api";
import { useLanguage } from "../../i18n/LanguageContext";

const DAYS = [
  {
    id: 1,
    nameRu: "Понедельник",
    nameKk: "Дүйсенбі",
  },
  {
    id: 2,
    nameRu: "Вторник",
    nameKk: "Сейсенбі",
  },
  {
    id: 3,
    nameRu: "Среда",
    nameKk: "Сәрсенбі",
  },
  {
    id: 4,
    nameRu: "Четверг",
    nameKk: "Бейсенбі",
  },
  {
    id: 5,
    nameRu: "Пятница",
    nameKk: "Жұма",
  },
  {
    id: 6,
    nameRu: "Суббота",
    nameKk: "Сенбі",
  },
  {
    id: 7,
    nameRu: "Воскресенье",
    nameKk: "Жексенбі",
  },
];

const TEXTS = {
  ru: {
    pageTitle: "Расписание врачей",
    pageSubtitle:
      "Назначьте врачу специальность, отделение, кабинет и настройте недельный график приёма.",

    refreshLoading: "Обновление...",
    refreshData: "Обновить данные",

    doctorSetupTitle: "Настройка врача",
    doctorSetupSubtitle:
      "Выберите врача, специальность, отделение и рабочий кабинет.",

    doctorLabel: "Врач",
    specialtyLabel: "Специальность",
    departmentLabel: "Отделение",
    roomLabel: "Кабинет",
    scheduleStartLabel:
      "Начало действия графика",

    selectDoctor: "Выберите врача",
    selectSpecialty:
      "Выберите специальность",
    selectDepartment:
      "Выберите отделение",
    selectRoom: "Выберите кабинет",
    loadingRooms:
      "Загрузка кабинетов...",

    notSelectedFeminine: "Не выбрана",
    notSelectedNeuter: "Не выбрано",
    notSelectedMasculine: "Не выбран",

    commonSettingsTitle:
      "Общие настройки",
    commonSettingsSubtitle:
      "Установите одинаковое время для всех выбранных рабочих дней.",

    workStart: "Начало работы",
    workEnd: "Конец работы",
    lunchStart: "Начало обеда",
    lunchEnd: "Конец обеда",
    appointmentMinutes:
      "Приём, минут",

    disableAllDays:
      "Отключить все дни",
    selectAllDays:
      "Выбрать все дни",
    selectWeekdays:
      "Выбрать понедельник–пятницу",
    applyToWorkingDays:
      "Применить время к рабочим дням",

    weeklySchedule:
      "Недельный график",
    selectedWorkingDays:
      "Рабочих дней выбрано",
    loadingSchedule:
      "Загрузка расписания...",

    workingDay: "Рабочий день",
    dayOff: "Выходной",
    copyDayTitle:
      "Скопировать настройки этого дня",

    appointmentDuration:
      "Продолжительность приёма",
    minutes: "минут",

    savePanelTitle:
      "Сохранение расписания",
    savePanelDescription:
      "Специальность, кабинет и недельный график будут сохранены для выбранного врача.",
    saving: "Сохранение...",
    saveSchedule:
      "Сохранить расписание",

    doctorWithoutName:
      "Врач без указанного имени",
    unnamed: "Без названия",
    roomDefault: "Кабинет",
    roomPrefix: "Кабинет",

    doctorsLoadError:
      "Не удалось загрузить список врачей.",
    referencesLoadError:
      "Не удалось загрузить специальности или отделения.",
    roomsLoadError:
      "Не удалось загрузить кабинеты отделения.",
    scheduleNotConfigured:
      "Для выбранного врача расписание ещё не настроено.",
    scheduleLoaded:
      "Сохранённое расписание врача загружено.",
    scheduleLoadError:
      "Не удалось загрузить расписание врача.",
    commonApplied:
      "Общие настройки применены ко всем рабочим дням.",
    cannotCopyDayOff:
      "Нельзя копировать настройки выходного дня.",
    scheduleSaved:
      "Специальность, отделение, кабинет и расписание успешно сохранены.",
    scheduleSaveError:
      "Не удалось сохранить данные врача и расписание.",

    validationDoctor:
      "Выберите врача.",
    validationSpecialty:
      "Выберите специальность врача.",
    validationDepartment:
      "Выберите отделение.",
    validationRoom:
      "Выберите кабинет.",
    validationRoomDepartment:
      "Выбранный кабинет не относится к выбранному отделению.",
    validationStartDate:
      "Укажите дату начала действия расписания.",
    validationWorkingDay:
      "Выберите хотя бы один рабочий день.",

    copyDaySuccess: (dayName) =>
      `Настройки дня «${dayName}» скопированы на остальные рабочие дни.`,

    validationWorkTime: (dayName) =>
      `${dayName}: укажите рабочее время.`,

    validationWorkEnd: (dayName) =>
      `${dayName}: окончание работы должно быть позже начала.`,

    validationLunchTime: (dayName) =>
      `${dayName}: укажите время обеда.`,

    validationLunchEnd: (dayName) =>
      `${dayName}: окончание обеда должно быть позже начала.`,

    validationLunchInside: (dayName) =>
      `${dayName}: обед должен находиться внутри рабочего времени.`,

    validationDuration: (dayName) =>
      `${dayName}: продолжительность приёма должна составлять от 5 до 480 минут.`,
  },

  kk: {
    pageTitle: "Дәрігерлер кестесі",
    pageSubtitle:
      "Дәрігерге мамандық, бөлімше, кабинет тағайындап, апталық қабылдау кестесін баптаңыз.",

    refreshLoading: "Жаңартылуда...",
    refreshData: "Деректерді жаңарту",

    doctorSetupTitle:
      "Дәрігерді баптау",
    doctorSetupSubtitle:
      "Дәрігерді, мамандықты, бөлімшені және жұмыс кабинетін таңдаңыз.",

    doctorLabel: "Дәрігер",
    specialtyLabel: "Мамандық",
    departmentLabel: "Бөлімше",
    roomLabel: "Кабинет",
    scheduleStartLabel:
      "Кестенің басталу күні",

    selectDoctor: "Дәрігерді таңдаңыз",
    selectSpecialty:
      "Мамандықты таңдаңыз",
    selectDepartment:
      "Бөлімшені таңдаңыз",
    selectRoom: "Кабинетті таңдаңыз",
    loadingRooms:
      "Кабинеттер жүктелуде...",

    notSelectedFeminine: "Таңдалмаған",
    notSelectedNeuter: "Таңдалмаған",
    notSelectedMasculine: "Таңдалмаған",

    commonSettingsTitle:
      "Жалпы баптаулар",
    commonSettingsSubtitle:
      "Барлық таңдалған жұмыс күндеріне бірдей уақыт орнатыңыз.",

    workStart: "Жұмыстың басталуы",
    workEnd: "Жұмыстың аяқталуы",
    lunchStart: "Түскі үзілістің басталуы",
    lunchEnd: "Түскі үзілістің аяқталуы",
    appointmentMinutes:
      "Қабылдау ұзақтығы, минут",

    disableAllDays:
      "Барлық күнді өшіру",
    selectAllDays:
      "Барлық күнді таңдау",
    selectWeekdays:
      "Дүйсенбі–жұма күндерін таңдау",
    applyToWorkingDays:
      "Уақытты жұмыс күндеріне қолдану",

    weeklySchedule:
      "Апталық кесте",
    selectedWorkingDays:
      "Таңдалған жұмыс күндері",
    loadingSchedule:
      "Кесте жүктелуде...",

    workingDay: "Жұмыс күні",
    dayOff: "Демалыс күні",
    copyDayTitle:
      "Осы күннің баптауларын көшіру",

    appointmentDuration:
      "Қабылдау ұзақтығы",
    minutes: "минут",

    savePanelTitle:
      "Кестені сақтау",
    savePanelDescription:
      "Таңдалған дәрігер үшін мамандық, кабинет және апталық кесте сақталады.",
    saving: "Сақталуда...",
    saveSchedule: "Кестені сақтау",

    doctorWithoutName:
      "Аты көрсетілмеген дәрігер",
    unnamed: "Атауы жоқ",
    roomDefault: "Кабинет",
    roomPrefix: "Кабинет",

    doctorsLoadError:
      "Дәрігерлер тізімін жүктеу мүмкін болмады.",
    referencesLoadError:
      "Мамандықтар немесе бөлімшелер жүктелмеді.",
    roomsLoadError:
      "Бөлімше кабинеттерін жүктеу мүмкін болмады.",
    scheduleNotConfigured:
      "Таңдалған дәрігердің кестесі әлі бапталмаған.",
    scheduleLoaded:
      "Дәрігердің сақталған кестесі жүктелді.",
    scheduleLoadError:
      "Дәрігердің кестесін жүктеу мүмкін болмады.",
    commonApplied:
      "Жалпы баптаулар барлық жұмыс күндеріне қолданылды.",
    cannotCopyDayOff:
      "Демалыс күнінің баптауларын көшіруге болмайды.",
    scheduleSaved:
      "Мамандық, бөлімше, кабинет және кесте сәтті сақталды.",
    scheduleSaveError:
      "Дәрігер деректері мен кестесін сақтау мүмкін болмады.",

    validationDoctor:
      "Дәрігерді таңдаңыз.",
    validationSpecialty:
      "Дәрігердің мамандығын таңдаңыз.",
    validationDepartment:
      "Бөлімшені таңдаңыз.",
    validationRoom:
      "Кабинетті таңдаңыз.",
    validationRoomDepartment:
      "Таңдалған кабинет осы бөлімшеге жатпайды.",
    validationStartDate:
      "Кестенің басталу күнін көрсетіңіз.",
    validationWorkingDay:
      "Кемінде бір жұмыс күнін таңдаңыз.",

    copyDaySuccess: (dayName) =>
      `«${dayName}» күнінің баптаулары басқа жұмыс күндеріне көшірілді.`,

    validationWorkTime: (dayName) =>
      `${dayName}: жұмыс уақытын көрсетіңіз.`,

    validationWorkEnd: (dayName) =>
      `${dayName}: жұмыстың аяқталу уақыты басталу уақытынан кейін болуы керек.`,

    validationLunchTime: (dayName) =>
      `${dayName}: түскі үзіліс уақытын көрсетіңіз.`,

    validationLunchEnd: (dayName) =>
      `${dayName}: түскі үзілістің аяқталуы басталуынан кейін болуы керек.`,

    validationLunchInside: (dayName) =>
      `${dayName}: түскі үзіліс жұмыс уақытының ішінде болуы керек.`,

    validationDuration: (dayName) =>
      `${dayName}: қабылдау ұзақтығы 5-тен 480 минутқа дейін болуы керек.`,
  },
};

const DEFAULT_DAY_SETTINGS = {
  isWorking: false,
  workStart: "09:00",
  workEnd: "18:00",
  lunchStart: "13:00",
  lunchEnd: "14:00",
  slotDuration: 30,
};

function getTodayDate() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createDefaultWeek() {
  const week = {};

  for (const day of DAYS) {
    week[String(day.id)] = {
      ...DEFAULT_DAY_SETTINGS,
      isWorking: day.id <= 5,
    };
  }

  return week;
}

function normalizeTime(value, fallback) {
  if (!value) {
    return fallback;
  }

  return String(value).slice(0, 5);
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
    error?.message ||
    fallback
  );
}

function getDayName(day, isKazakh) {
  return isKazakh
    ? day.nameKk
    : day.nameRu;
}

function getDoctorName(doctor, text) {
  return (
    doctor?.fullName ||
    doctor?.full_name ||
    doctor?.profile?.full_name ||
    doctor?.profiles?.full_name ||
    text.doctorWithoutName
  );
}

function getSpecialtyName(
  specialty,
  isKazakh,
  text
) {
  return (
    (isKazakh
      ? specialty?.name_kk ||
        specialty?.name_ru
      : specialty?.name_ru ||
        specialty?.name_kk) ||
    specialty?.name ||
    text.unnamed
  );
}

function getDepartmentName(
  department,
  isKazakh,
  text
) {
  return (
    (isKazakh
      ? department?.name_kk ||
        department?.name ||
        department?.name_ru
      : department?.name_ru ||
        department?.name ||
        department?.name_kk) ||
    text.unnamed
  );
}

function getRoomName(room, text) {
  const number = room?.number
    ? `${text.roomPrefix} №${room.number}`
    : text.roomDefault;

  return room?.name
    ? `${number} — ${room.name}`
    : number;
}

function getDoctorSpecialtyId(doctor) {
  return String(
    doctor?.specialtyId ||
      doctor?.specialty_id ||
      doctor?.specialty?.id ||
      doctor?.specialties?.id ||
      ""
  );
}

function getDoctorRoomId(doctor) {
  return String(
    doctor?.roomId ||
      doctor?.room_id ||
      doctor?.room?.id ||
      doctor?.rooms?.id ||
      ""
  );
}

function getDoctorDepartmentId(doctor) {
  return String(
    doctor?.departmentId ||
      doctor?.department_id ||
      doctor?.room?.department_id ||
      doctor?.rooms?.department_id ||
      ""
  );
}

function parseMinutes(value) {
  const parts = String(value || "")
    .split(":")
    .map(Number);

  if (
    parts.length !== 2 ||
    parts.some(Number.isNaN)
  ) {
    return Number.NaN;
  }

  return parts[0] * 60 + parts[1];
}

function buildWeekFromSchedule(schedule) {
  const week = createDefaultWeek();

  if (!schedule) {
    return week;
  }

  const detailedSchedule =
    schedule?.day_schedules &&
    typeof schedule.day_schedules ===
      "object"
      ? schedule.day_schedules
      : {};

  const legacyWorkDays = Array.isArray(
    schedule?.work_days
  )
    ? schedule.work_days.map(Number)
    : [];

  for (const day of DAYS) {
    const key = String(day.id);
    const detailedDay =
      detailedSchedule[key];

    if (
      detailedDay &&
      typeof detailedDay === "object"
    ) {
      week[key] = {
        isWorking:
          detailedDay.isWorking === true ||
          detailedDay.is_working === true,

        workStart: normalizeTime(
          detailedDay.workStart ??
            detailedDay.work_start,
          normalizeTime(
            schedule.work_start,
            "09:00"
          )
        ),

        workEnd: normalizeTime(
          detailedDay.workEnd ??
            detailedDay.work_end,
          normalizeTime(
            schedule.work_end,
            "18:00"
          )
        ),

        lunchStart: normalizeTime(
          detailedDay.lunchStart ??
            detailedDay.lunch_start,
          normalizeTime(
            schedule.lunch_start,
            "13:00"
          )
        ),

        lunchEnd: normalizeTime(
          detailedDay.lunchEnd ??
            detailedDay.lunch_end,
          normalizeTime(
            schedule.lunch_end,
            "14:00"
          )
        ),

        slotDuration: Number(
          detailedDay.slotDuration ??
            detailedDay.slot_duration ??
            schedule.slot_duration ??
            30
        ),
      };

      continue;
    }

    week[key] = {
      isWorking:
        legacyWorkDays.includes(day.id),

      workStart: normalizeTime(
        schedule.work_start,
        "09:00"
      ),

      workEnd: normalizeTime(
        schedule.work_end,
        "18:00"
      ),

      lunchStart: normalizeTime(
        schedule.lunch_start,
        "13:00"
      ),

      lunchEnd: normalizeTime(
        schedule.lunch_end,
        "14:00"
      ),

      slotDuration: Number(
        schedule.slot_duration || 30
      ),
    };
  }

  return week;
}

export default function Schedules() {
  const { language } = useLanguage();

  const normalizedLanguage = String(
    language || "ru"
  )
    .trim()
    .toLowerCase();

  const isKazakh = [
    "kk",
    "kz",
    "kaz",
    "kazakh",
    "kk-kz",
    "kz-kz",
  ].includes(normalizedLanguage);

  const text = isKazakh
    ? TEXTS.kk
    : TEXTS.ru;

  const localizedErrorMessage = (
    error,
    fallback
  ) =>
    isKazakh
      ? fallback
      : getErrorMessage(error, fallback);

  const localizedResponseMessage = (
    response,
    fallback
  ) =>
    isKazakh
      ? fallback
      : response?.data?.message ||
        fallback;

  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] =
    useState([]);
  const [departments, setDepartments] =
    useState([]);
  const [rooms, setRooms] = useState([]);

  const [
    selectedDoctorId,
    setSelectedDoctorId,
  ] = useState("");

  const [
    selectedSpecialtyId,
    setSelectedSpecialtyId,
  ] = useState("");

  const [
    selectedDepartmentId,
    setSelectedDepartmentId,
  ] = useState("");

  const [
    selectedRoomId,
    setSelectedRoomId,
  ] = useState("");

  const [daySchedules, setDaySchedules] =
    useState(createDefaultWeek);

  const [startDate, setStartDate] =
    useState(getTodayDate());

  const [commonSettings, setCommonSettings] =
    useState({
      workStart: "09:00",
      workEnd: "18:00",
      lunchStart: "13:00",
      lunchEnd: "14:00",
      slotDuration: 30,
    });

  const [
    loadingDoctors,
    setLoadingDoctors,
  ] = useState(true);

  const [
    loadingReferences,
    setLoadingReferences,
  ] = useState(true);

  const [loadingRooms, setLoadingRooms] =
    useState(false);

  const [
    loadingSchedule,
    setLoadingSchedule,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const selectedDoctor = useMemo(
    () =>
      doctors.find(
        (doctor) =>
          String(doctor.id) ===
          String(selectedDoctorId)
      ) || null,
    [doctors, selectedDoctorId]
  );

  const selectedSpecialty = useMemo(
    () =>
      specialties.find(
        (specialty) =>
          String(specialty.id) ===
          String(selectedSpecialtyId)
      ) || null,
    [specialties, selectedSpecialtyId]
  );

  const selectedDepartment = useMemo(
    () =>
      departments.find(
        (department) =>
          String(department.id) ===
          String(selectedDepartmentId)
      ) || null,
    [departments, selectedDepartmentId]
  );

  const selectedRoom = useMemo(
    () =>
      rooms.find(
        (room) =>
          String(room.id) ===
          String(selectedRoomId)
      ) || null,
    [rooms, selectedRoomId]
  );

  const workingDaysCount = useMemo(
    () =>
      DAYS.filter(
        (day) =>
          daySchedules[String(day.id)]
            ?.isWorking
      ).length,
    [daySchedules]
  );

  const allDaysSelected =
    workingDaysCount === DAYS.length;

  const loadDoctors =
    useCallback(async () => {
      setLoadingDoctors(true);

      try {
        const response = await api.get(
          "/doctors"
        );

        const doctorItems =
          extractArray(response);

        setDoctors(doctorItems);

        setSelectedDoctorId(
          (currentDoctorId) => {
            if (
              currentDoctorId &&
              doctorItems.some(
                (doctor) =>
                  String(doctor.id) ===
                  String(currentDoctorId)
              )
            ) {
              return currentDoctorId;
            }

            return doctorItems[0]?.id || "";
          }
        );
      } catch (error) {
        setDoctors([]);

        setMessage({
          type: "error",
          text: localizedErrorMessage(
            error,
            text.doctorsLoadError
          ),
        });
      } finally {
        setLoadingDoctors(false);
      }
    }, [text.doctorsLoadError]);

  const loadReferences =
    useCallback(async () => {
      setLoadingReferences(true);

      try {
        const [
          specialtiesResponse,
          departmentsResponse,
        ] = await Promise.all([
          api.get("/specialties"),
          api.get("/departments"),
        ]);

        setSpecialties(
          extractArray(specialtiesResponse)
        );

        setDepartments(
          extractArray(departmentsResponse)
        );
      } catch (error) {
        setSpecialties([]);
        setDepartments([]);

        setMessage({
          type: "error",
          text: localizedErrorMessage(
            error,
            text.referencesLoadError
          ),
        });
      } finally {
        setLoadingReferences(false);
      }
    }, [text.referencesLoadError]);

  useEffect(() => {
    loadDoctors();
    loadReferences();
  }, [loadDoctors, loadReferences]);

  useEffect(() => {
    if (!selectedDoctor) {
      setSelectedSpecialtyId("");
      setSelectedDepartmentId("");
      setSelectedRoomId("");
      return;
    }

    setSelectedSpecialtyId(
      getDoctorSpecialtyId(selectedDoctor)
    );

    setSelectedDepartmentId(
      getDoctorDepartmentId(selectedDoctor)
    );

    setSelectedRoomId(
      getDoctorRoomId(selectedDoctor)
    );
  }, [selectedDoctor]);

  useEffect(() => {
    if (!selectedDepartmentId) {
      setRooms([]);
      setSelectedRoomId("");
      return;
    }

    let cancelled = false;

    async function loadRooms() {
      setLoadingRooms(true);

      try {
        const response = await api.get(
          "/rooms",
          {
            params: {
              departmentId:
                selectedDepartmentId,
            },
          }
        );

        if (cancelled) {
          return;
        }

        const roomItems =
          extractArray(response);

        setRooms(roomItems);

        setSelectedRoomId(
          (currentRoomId) => {
            if (
              currentRoomId &&
              roomItems.some(
                (room) =>
                  String(room.id) ===
                  String(currentRoomId)
              )
            ) {
              return currentRoomId;
            }

            return "";
          }
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setRooms([]);
        setSelectedRoomId("");

        setMessage({
          type: "error",
          text: localizedErrorMessage(
            error,
            text.roomsLoadError
          ),
        });
      } finally {
        if (!cancelled) {
          setLoadingRooms(false);
        }
      }
    }

    loadRooms();

    return () => {
      cancelled = true;
    };
  }, [
    selectedDepartmentId,
    text.roomsLoadError,
  ]);

  useEffect(() => {
    if (!selectedDoctorId) {
      setDaySchedules(createDefaultWeek());
      setStartDate(getTodayDate());
      return;
    }

    let cancelled = false;

    async function loadSchedule() {
      setLoadingSchedule(true);

      try {
        const response = await api.get(
          "/schedule/standard",
          {
            params: {
              doctorId: selectedDoctorId,
            },
          }
        );

        if (cancelled) {
          return;
        }

        const schedule =
          response?.data?.data || null;

        if (!schedule) {
          setDaySchedules(
            createDefaultWeek()
          );

          setStartDate(getTodayDate());

          setMessage({
            type: "info",
            text: text.scheduleNotConfigured,
          });

          return;
        }

        setDaySchedules(
          buildWeekFromSchedule(schedule)
        );

        setStartDate(
          schedule.start_date ||
            getTodayDate()
        );

        setMessage({
          type: "success",
          text: text.scheduleLoaded,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setDaySchedules(
          createDefaultWeek()
        );

        setMessage({
          type: "error",
          text: localizedErrorMessage(
            error,
            text.scheduleLoadError
          ),
        });
      } finally {
        if (!cancelled) {
          setLoadingSchedule(false);
        }
      }
    }

    loadSchedule();

    return () => {
      cancelled = true;
    };
  }, [
    selectedDoctorId,
    text,
  ]);

  function handleDepartmentChange(event) {
    setSelectedDepartmentId(
      event.target.value
    );

    setSelectedRoomId("");
  }

  function updateDay(dayId, field, value) {
    const key = String(dayId);

    setDaySchedules((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: value,
      },
    }));
  }

  function toggleDay(dayId) {
    const key = String(dayId);

    setDaySchedules((current) => ({
      ...current,
      [key]: {
        ...current[key],
        isWorking:
          !current[key]?.isWorking,
      },
    }));
  }

  function selectAllDays() {
    setDaySchedules((current) => {
      const next = {};

      for (const day of DAYS) {
        const key = String(day.id);

        next[key] = {
          ...current[key],
          isWorking: !allDaysSelected,
        };
      }

      return next;
    });
  }

  function selectWeekdays() {
    setDaySchedules((current) => {
      const next = {};

      for (const day of DAYS) {
        const key = String(day.id);

        next[key] = {
          ...current[key],
          isWorking: day.id <= 5,
        };
      }

      return next;
    });
  }

  

  function applyCommonSettings() {
    setDaySchedules((current) => {
      const next = {};

      for (const day of DAYS) {
        const key = String(day.id);
        const currentDay = current[key];

        next[key] = currentDay?.isWorking
          ? {
              ...currentDay,
              workStart:
                commonSettings.workStart,
              workEnd:
                commonSettings.workEnd,
              lunchStart:
                commonSettings.lunchStart,
              lunchEnd:
                commonSettings.lunchEnd,
              slotDuration: Number(
                commonSettings.slotDuration
              ),
            }
          : currentDay;
      }

      return next;
    });

    setMessage({
      type: "info",
      text: text.commonApplied,
    });
  }

  function copyDayToWorkingDays(sourceDayId) {
    const source =
      daySchedules[String(sourceDayId)];

    if (!source?.isWorking) {
      setMessage({
        type: "error",
        text: text.cannotCopyDayOff,
      });

      return;
    }

    setDaySchedules((current) => {
      const next = {};

      for (const day of DAYS) {
        const key = String(day.id);
        const currentDay = current[key];

        next[key] = currentDay?.isWorking
          ? {
              ...currentDay,
              workStart:
                source.workStart,
              workEnd: source.workEnd,
              lunchStart:
                source.lunchStart,
              lunchEnd: source.lunchEnd,
              slotDuration: Number(
                source.slotDuration
              ),
            }
          : currentDay;
      }

      return next;
    });

    const sourceDay = DAYS.find(
      (day) => day.id === sourceDayId
    );

    setMessage({
      type: "info",
      text: text.copyDaySuccess(
        sourceDay
          ? getDayName(
              sourceDay,
              isKazakh
            )
          : ""
      ),
    });
  }

  function validateSchedule() {
    if (!selectedDoctorId) {
      return text.validationDoctor;
    }

    if (!selectedSpecialtyId) {
      return text.validationSpecialty;
    }

    if (!selectedDepartmentId) {
      return text.validationDepartment;
    }

    if (!selectedRoomId) {
      return text.validationRoom;
    }

    if (!selectedRoom) {
      return text.validationRoomDepartment;
    }

    if (!startDate) {
      return text.validationStartDate;
    }

    const workingDays = DAYS.filter(
      (day) =>
        daySchedules[String(day.id)]
          ?.isWorking
    );

    if (workingDays.length === 0) {
      return text.validationWorkingDay;
    }

    for (const day of workingDays) {
      const config =
        daySchedules[String(day.id)];

      const workStartMinutes =
        parseMinutes(config.workStart);

      const workEndMinutes =
        parseMinutes(config.workEnd);

      const lunchStartMinutes =
        parseMinutes(config.lunchStart);

      const lunchEndMinutes =
        parseMinutes(config.lunchEnd);

      if (
        !Number.isFinite(
          workStartMinutes
        ) ||
        !Number.isFinite(workEndMinutes)
      ) {
        return text.validationWorkTime(
          getDayName(day, isKazakh)
        );
      }

      if (
        workEndMinutes <=
        workStartMinutes
      ) {
        return text.validationWorkEnd(
          getDayName(day, isKazakh)
        );
      }

      if (
        !Number.isFinite(
          lunchStartMinutes
        ) ||
        !Number.isFinite(lunchEndMinutes)
      ) {
        return text.validationLunchTime(
          getDayName(day, isKazakh)
        );
      }

      if (
        lunchEndMinutes <=
        lunchStartMinutes
      ) {
        return text.validationLunchEnd(
          getDayName(day, isKazakh)
        );
      }

      if (
        lunchStartMinutes <
          workStartMinutes ||
        lunchEndMinutes > workEndMinutes
      ) {
        return text.validationLunchInside(
          getDayName(day, isKazakh)
        );
      }

      const duration = Number(
        config.slotDuration
      );

      if (
        !Number.isInteger(duration) ||
        duration < 5 ||
        duration > 480
      ) {
        return text.validationDuration(
          getDayName(day, isKazakh)
        );
      }
    }

    return "";
  }

  async function saveSchedule(event) {
    event.preventDefault();

    const validationError =
      validateSchedule();

    if (validationError) {
      setMessage({
        type: "error",
        text: validationError,
      });

      return;
    }

    const workDays = DAYS.filter(
      (day) =>
        daySchedules[String(day.id)]
          .isWorking
    ).map((day) => day.id);

    const firstWorkingDay =
      daySchedules[
        String(workDays[0])
      ];

    setSaving(true);

    setMessage({
      type: "",
      text: "",
    });

    try {
      await api.put(
        `/doctors/${selectedDoctorId}`,
        {
          specialtyId:
            selectedSpecialtyId,
          roomId: selectedRoomId,
        }
      );

      const scheduleResponse =
        await api.post(
          "/schedule/standard",
          {
            doctorId: selectedDoctorId,
            workDays,

            workStart:
              firstWorkingDay.workStart,

            workEnd:
              firstWorkingDay.workEnd,

            lunchStart:
              firstWorkingDay.lunchStart,

            lunchEnd:
              firstWorkingDay.lunchEnd,

            slotDuration: Number(
              firstWorkingDay.slotDuration
            ),

            startDate,
            endDate: null,
            daySchedules,
          }
        );

      const savedSchedule =
        scheduleResponse?.data?.data;

      if (savedSchedule) {
        setDaySchedules(
          buildWeekFromSchedule(
            savedSchedule
          )
        );
      }

      setDoctors((currentDoctors) =>
        currentDoctors.map((doctor) => {
          if (
            String(doctor.id) !==
            String(selectedDoctorId)
          ) {
            return doctor;
          }

          return {
            ...doctor,

            specialtyId:
              selectedSpecialtyId,

            specialty:
              selectedSpecialty,

            roomId: selectedRoomId,
            room: selectedRoom,

            departmentId:
              selectedDepartmentId,
          };
        })
      );

      setMessage({
        type: "success",
        text: localizedResponseMessage(
          scheduleResponse,
          text.scheduleSaved
        ),
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: localizedErrorMessage(
          error,
          text.scheduleSaveError
        ),
      });
    } finally {
      setSaving(false);
    }
  }

  const formUnavailable =
    loadingDoctors ||
    loadingReferences ||
    doctors.length === 0;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
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
          onClick={() => {
            loadDoctors();
            loadReferences();
          }}
          disabled={
            loadingDoctors ||
            loadingReferences
          }
          style={{
            ...styles.refreshButton,
            ...(loadingDoctors ||
            loadingReferences
              ? styles.disabled
              : {}),
          }}
        >
          <RiRefreshLine />

          {loadingDoctors ||
          loadingReferences
            ? text.refreshLoading
            : text.refreshData}
        </button>
      </header>

      {message.text && (
        <div
          style={{
            ...styles.message,

            ...(message.type === "error"
              ? styles.errorMessage
              : message.type === "success"
              ? styles.successMessage
              : styles.infoMessage),
          }}
        >
          {message.text}
        </div>
      )}

      <section style={styles.doctorCard}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionIcon}>
            <RiCalendarLine />
          </div>

          <div>
            <h2 style={styles.sectionTitle}>
              {text.doctorSetupTitle}
            </h2>

            <p style={styles.sectionSubtitle}>
              {text.doctorSetupSubtitle}
            </p>
          </div>
        </div>

        <div style={styles.doctorGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              {text.doctorLabel} *
            </label>

            <select
              value={selectedDoctorId}
              onChange={(event) =>
                setSelectedDoctorId(
                  event.target.value
                )
              }
              disabled={formUnavailable}
              style={styles.select}
            >
              <option value="">
                {text.selectDoctor}
              </option>

              {doctors.map((doctor) => (
                <option
                  key={doctor.id}
                  value={doctor.id}
                >
                  {getDoctorName(doctor, text)}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              {text.specialtyLabel} *
            </label>

            <select
              value={selectedSpecialtyId}
              onChange={(event) =>
                setSelectedSpecialtyId(
                  event.target.value
                )
              }
              disabled={
                loadingReferences ||
                !selectedDoctorId ||
                specialties.length === 0
              }
              style={styles.select}
            >
              <option value="">
                {text.selectSpecialty}
              </option>

              {specialties.map(
                (specialty) => (
                  <option
                    key={specialty.id}
                    value={specialty.id}
                  >
                    {getSpecialtyName(
                      specialty,
                      isKazakh,
                      text
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              {text.departmentLabel} *
            </label>

            <select
              value={selectedDepartmentId}
              onChange={
                handleDepartmentChange
              }
              disabled={
                loadingReferences ||
                !selectedDoctorId ||
                departments.length === 0
              }
              style={styles.select}
            >
              <option value="">
                {text.selectDepartment}
              </option>

              {departments.map(
                (department) => (
                  <option
                    key={department.id}
                    value={department.id}
                  >
                    {getDepartmentName(
                      department,
                      isKazakh,
                      text
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              {text.roomLabel} *
            </label>

            <select
              value={selectedRoomId}
              onChange={(event) =>
                setSelectedRoomId(
                  event.target.value
                )
              }
              disabled={
                !selectedDepartmentId ||
                loadingRooms ||
                rooms.length === 0
              }
              style={styles.select}
            >
              <option value="">
                {loadingRooms
                  ? text.loadingRooms
                  : text.selectRoom}
              </option>

              {rooms.map((room) => (
                <option
                  key={room.id}
                  value={room.id}
                >
                  {getRoomName(room, text)}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              {text.scheduleStartLabel} *
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value
                )
              }
              disabled={!selectedDoctorId}
              style={styles.input}
            />
          </div>
        </div>

        {selectedDoctor && (
          <div style={styles.doctorInformation}>
            <div>
              <span style={styles.infoLabel}>
                {text.doctorLabel}
              </span>

              <strong style={styles.infoValue}>
                {getDoctorName(
                  selectedDoctor,
                  text
                )}
              </strong>
            </div>

            <div>
              <span style={styles.infoLabel}>
                {text.specialtyLabel}
              </span>

              <strong style={styles.infoValue}>
                {selectedSpecialty
                  ? getSpecialtyName(
                      selectedSpecialty,
                      isKazakh,
                      text
                    )
                  : text.notSelectedFeminine}
              </strong>
            </div>

            <div>
              <span style={styles.infoLabel}>
                {text.departmentLabel}
              </span>

              <strong style={styles.infoValue}>
                {selectedDepartment
                  ? getDepartmentName(
                      selectedDepartment,
                      isKazakh,
                      text
                    )
                  : text.notSelectedNeuter}
              </strong>
            </div>

            <div>
              <span style={styles.infoLabel}>
                {text.roomLabel}
              </span>

              <strong style={styles.infoValue}>
                {selectedRoom
                  ? getRoomName(selectedRoom, text)
                  : text.notSelectedMasculine}
              </strong>
            </div>
          </div>
        )}
      </section>

      <form onSubmit={saveSchedule}>
        <section style={styles.commonCard}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>
              <RiTimeLine />
            </div>

            <div>
              <h2 style={styles.sectionTitle}>
                {text.commonSettingsTitle}
              </h2>

              <p style={styles.sectionSubtitle}>
                {text.commonSettingsSubtitle}
              </p>
            </div>
          </div>

          <div style={styles.commonGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                {text.workStart}
              </label>

              <input
                type="time"
                value={
                  commonSettings.workStart
                }
                onChange={(event) =>
                  setCommonSettings(
                    (current) => ({
                      ...current,
                      workStart:
                        event.target.value,
                    })
                  )
                }
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                {text.workEnd}
              </label>

              <input
                type="time"
                value={commonSettings.workEnd}
                onChange={(event) =>
                  setCommonSettings(
                    (current) => ({
                      ...current,
                      workEnd:
                        event.target.value,
                    })
                  )
                }
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                {text.lunchStart}
              </label>

              <input
                type="time"
                value={
                  commonSettings.lunchStart
                }
                onChange={(event) =>
                  setCommonSettings(
                    (current) => ({
                      ...current,
                      lunchStart:
                        event.target.value,
                    })
                  )
                }
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                {text.lunchEnd}
              </label>

              <input
                type="time"
                value={
                  commonSettings.lunchEnd
                }
                onChange={(event) =>
                  setCommonSettings(
                    (current) => ({
                      ...current,
                      lunchEnd:
                        event.target.value,
                    })
                  )
                }
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                {text.appointmentMinutes}
              </label>

              <input
                type="number"
                min="5"
                max="480"
                step="5"
                value={
                  commonSettings.slotDuration
                }
                onChange={(event) =>
                  setCommonSettings(
                    (current) => ({
                      ...current,
                      slotDuration: Number(
                        event.target.value
                      ),
                    })
                  )
                }
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.toolbar}>
            <button
              type="button"
              onClick={selectAllDays}
              style={styles.secondaryButton}
            >
              {allDaysSelected
                ? text.disableAllDays
                : text.selectAllDays}
            </button>

            <button
              type="button"
              onClick={selectWeekdays}
              style={styles.secondaryButton}
            >
              {text.selectWeekdays}
            </button>

            

            <button
              type="button"
              onClick={applyCommonSettings}
              style={styles.applyButton}
            >
              <RiFileCopyLine />
              {text.applyToWorkingDays}
            </button>
          </div>
        </section>

        <section style={styles.daysSection}>
          <div style={styles.daysHeader}>
            <h2 style={styles.sectionTitle}>
              {text.weeklySchedule}
            </h2>

            <p style={styles.sectionSubtitle}>
              {text.selectedWorkingDays}:{" "}
              {workingDaysCount}
            </p>
          </div>

          {loadingSchedule ? (
            <div style={styles.loadingBox}>
              {text.loadingSchedule}
            </div>
          ) : (
            <div style={styles.daysGrid}>
              {DAYS.map((day) => {
                const config =
                  daySchedules[
                    String(day.id)
                  ];

                return (
                  <article
                    key={day.id}
                    style={{
                      ...styles.dayCard,

                      ...(config.isWorking
                        ? styles.workingDayCard
                        : styles.dayOffCard),
                    }}
                  >
                    <div style={styles.dayHeader}>
                      <label
                        style={styles.dayToggle}
                      >
                        <input
                          type="checkbox"
                          checked={
                            config.isWorking
                          }
                          onChange={() =>
                            toggleDay(day.id)
                          }
                          style={styles.checkbox}
                        />

                        <div>
                          <strong
                            style={styles.dayName}
                          >
                            {getDayName(
                              day,
                              isKazakh
                            )}
                          </strong>

                          <span
                            style={{
                              ...styles.dayStatus,

                              color:
                                config.isWorking
                                  ? "#6ee7b7"
                                  : "#94a3b8",
                            }}
                          >
                            {config.isWorking
                              ? text.workingDay
                              : text.dayOff}
                          </span>
                        </div>
                      </label>

                      {config.isWorking && (
                        <button
                          type="button"
                          onClick={() =>
                            copyDayToWorkingDays(
                              day.id
                            )
                          }
                          style={styles.copyButton}
                          title={text.copyDayTitle}
                        >
                          <RiFileCopyLine />
                        </button>
                      )}
                    </div>

                    <div
                      style={{
                        ...styles.dayFields,

                        opacity:
                          config.isWorking
                            ? 1
                            : 0.45,
                      }}
                    >
                      <div
                        style={
                          styles.smallInputGroup
                        }
                      >
                        <label style={styles.label}>
                          {text.workStart}
                        </label>

                        <input
                          type="time"
                          value={config.workStart}
                          onChange={(event) =>
                            updateDay(
                              day.id,
                              "workStart",
                              event.target.value
                            )
                          }
                          disabled={
                            !config.isWorking
                          }
                          style={styles.input}
                        />
                      </div>

                      <div
                        style={
                          styles.smallInputGroup
                        }
                      >
                        <label style={styles.label}>
                          {text.workEnd}
                        </label>

                        <input
                          type="time"
                          value={config.workEnd}
                          onChange={(event) =>
                            updateDay(
                              day.id,
                              "workEnd",
                              event.target.value
                            )
                          }
                          disabled={
                            !config.isWorking
                          }
                          style={styles.input}
                        />
                      </div>

                      <div
                        style={
                          styles.smallInputGroup
                        }
                      >
                        <label style={styles.label}>
                          {text.lunchStart}
                        </label>

                        <input
                          type="time"
                          value={config.lunchStart}
                          onChange={(event) =>
                            updateDay(
                              day.id,
                              "lunchStart",
                              event.target.value
                            )
                          }
                          disabled={
                            !config.isWorking
                          }
                          style={styles.input}
                        />
                      </div>

                      <div
                        style={
                          styles.smallInputGroup
                        }
                      >
                        <label style={styles.label}>
                          {text.lunchEnd}
                        </label>

                        <input
                          type="time"
                          value={config.lunchEnd}
                          onChange={(event) =>
                            updateDay(
                              day.id,
                              "lunchEnd",
                              event.target.value
                            )
                          }
                          disabled={
                            !config.isWorking
                          }
                          style={styles.input}
                        />
                      </div>

                      <div
                        style={styles.durationGroup}
                      >
                        <label style={styles.label}>
                          {text.appointmentDuration}
                        </label>

                        <div
                          style={styles.durationRow}
                        >
                          <input
                            type="number"
                            min="5"
                            max="480"
                            step="5"
                            value={
                              config.slotDuration
                            }
                            onChange={(event) =>
                              updateDay(
                                day.id,
                                "slotDuration",
                                Number(
                                  event.target
                                    .value
                                )
                              )
                            }
                            disabled={
                              !config.isWorking
                            }
                            style={styles.input}
                          />

                          <span
                            style={
                              styles.minutesLabel
                            }
                          >
                            {text.minutes}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div style={styles.savePanel}>
          <div>
            <strong style={styles.saveTitle}>
              {text.savePanelTitle}
            </strong>

            <p style={styles.saveDescription}>
              {text.savePanelDescription}
            </p>
          </div>

          <button
            type="submit"
            disabled={
              saving ||
              loadingSchedule ||
              loadingRooms ||
              !selectedDoctorId
            }
            style={{
              ...styles.saveButton,

              ...(saving ||
              loadingSchedule ||
              loadingRooms ||
              !selectedDoctorId
                ? styles.disabled
                : {}),
            }}
          >
            <RiSaveLine />

            {saving
              ? text.saving
              : text.saveSchedule}
          </button>
        </div>
      </form>
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
    maxWidth: "760px",
    color: "#94a3b8",
    fontSize: "15px",
    lineHeight: 1.5,
  },

  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "11px 16px",
    borderRadius: "11px",
    border:
      "1px solid rgba(99,102,241,0.4)",
    background:
      "rgba(99,102,241,0.15)",
    color: "#c7d2fe",
    cursor: "pointer",
    fontWeight: 700,
  },

  message: {
    marginBottom: "20px",
    padding: "13px 16px",
    borderRadius: "12px",
    border: "1px solid",
    lineHeight: 1.45,
  },

  successMessage: {
    color: "#6ee7b7",
    background:
      "rgba(16,185,129,0.12)",
    borderColor:
      "rgba(16,185,129,0.35)",
  },

  errorMessage: {
    color: "#fca5a5",
    background:
      "rgba(239,68,68,0.12)",
    borderColor:
      "rgba(239,68,68,0.35)",
  },

  infoMessage: {
    color: "#93c5fd",
    background:
      "rgba(59,130,246,0.12)",
    borderColor:
      "rgba(59,130,246,0.3)",
  },

  doctorCard: {
    marginBottom: "22px",
    padding: "24px",
    borderRadius: "18px",
    border:
      "1px solid rgba(255,255,255,0.07)",
    background:
      "rgba(30,41,59,0.45)",
  },

  commonCard: {
    marginBottom: "22px",
    padding: "24px",
    borderRadius: "18px",
    border:
      "1px solid rgba(255,255,255,0.07)",
    background:
      "rgba(30,41,59,0.45)",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "22px",
  },

  sectionIcon: {
    width: "43px",
    height: "43px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "12px",
    background:
      "rgba(99,102,241,0.17)",
    color: "#a5b4fc",
    fontSize: "22px",
  },

  sectionTitle: {
    margin: "0 0 4px",
    fontSize: "20px",
    fontWeight: 750,
  },

  sectionSubtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  doctorGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "16px",
  },

  commonGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "14px",
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  smallInputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  label: {
    color: "#cbd5e1",
    fontSize: "12px",
    fontWeight: 700,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "42px",
    padding: "10px 12px",
    borderRadius: "10px",
    border:
      "1px solid rgba(255,255,255,0.11)",
    background: "rgba(0,0,0,0.2)",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "44px",
    padding: "10px 13px",
    borderRadius: "10px",
    border:
      "1px solid rgba(255,255,255,0.11)",
    background: "#111827",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
  },

  doctorInformation: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginTop: "19px",
    padding: "16px",
    borderRadius: "13px",
    background: "rgba(15,23,42,0.5)",
  },

  infoLabel: {
    display: "block",
    marginBottom: "5px",
    color: "#64748b",
    fontSize: "11px",
    textTransform: "uppercase",
  },

  infoValue: {
    color: "#e2e8f0",
    fontSize: "14px",
  },

  toolbar: {
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
    marginTop: "20px",
  },

  secondaryButton: {
    padding: "10px 13px",
    borderRadius: "10px",
    border:
      "1px solid rgba(148,163,184,0.25)",
    background:
      "rgba(148,163,184,0.09)",
    color: "#cbd5e1",
    cursor: "pointer",
    fontWeight: 650,
  },

  applyButton: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "10px 14px",
    borderRadius: "10px",
    border:
      "1px solid rgba(99,102,241,0.35)",
    background:
      "rgba(99,102,241,0.16)",
    color: "#c7d2fe",
    cursor: "pointer",
    fontWeight: 700,
  },

  daysSection: {
    marginBottom: "22px",
  },

  daysHeader: {
    marginBottom: "15px",
  },

  daysGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(285px, 1fr))",
    gap: "15px",
  },

  dayCard: {
    padding: "18px",
    borderRadius: "16px",
    border: "1px solid",
    transition: "0.2s ease",
  },

  workingDayCard: {
    borderColor:
      "rgba(99,102,241,0.28)",
    background:
      "rgba(30,41,59,0.52)",
  },

  dayOffCard: {
    borderColor:
      "rgba(148,163,184,0.09)",
    background:
      "rgba(15,23,42,0.36)",
  },

  dayHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "17px",
  },

  dayToggle: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
  },

  checkbox: {
    width: "18px",
    height: "18px",
    accentColor: "#6366f1",
    cursor: "pointer",
  },

  dayName: {
    display: "block",
    marginBottom: "3px",
    fontSize: "15px",
  },

  dayStatus: {
    display: "block",
    fontSize: "11px",
  },

  copyButton: {
    width: "34px",
    height: "34px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "9px",
    border:
      "1px solid rgba(99,102,241,0.3)",
    background:
      "rgba(99,102,241,0.13)",
    color: "#a5b4fc",
    cursor: "pointer",
    fontSize: "16px",
  },

  dayFields: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },

  durationGroup: {
    gridColumn: "1 / -1",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  durationRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: "9px",
  },

  minutesLabel: {
    color: "#94a3b8",
    fontSize: "13px",
  },

  loadingBox: {
    minHeight: "220px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "16px",
    background:
      "rgba(30,41,59,0.4)",
    color: "#94a3b8",
  },

  savePanel: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    padding: "21px 24px",
    borderRadius: "16px",
    border:
      "1px solid rgba(99,102,241,0.2)",
    background:
      "rgba(30,41,59,0.55)",
  },

  saveTitle: {
    display: "block",
    marginBottom: "5px",
    fontSize: "16px",
  },

  saveDescription: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "13px",
    lineHeight: 1.45,
  },

  saveButton: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    border: "none",
    borderRadius: "11px",
    background:
      "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 750,
  },

  disabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
};

