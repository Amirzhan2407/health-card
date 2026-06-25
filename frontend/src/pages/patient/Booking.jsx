
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  RiCalendarEventLine,
  RiCheckLine,
  RiHospitalLine,
  RiInformationLine,
  RiMailLine,
  RiMapPinLine,
  RiQrCodeLine,
  RiRefreshLine,
  RiTimeLine,
  RiUserHeartLine,
} from "react-icons/ri";

import api from "../../api/api";
import { useLanguage } from "../../i18n/LanguageContext";

const TEXTS = {
  ru: {
    dateNotSelected: "Дата не выбрана",
    medicalOrganization: "Медицинская организация",
    doctor: "Врач",
    specialtyNotSpecified: "Специальность не указана",
    room: "Кабинет",

    loadOrganizationsError:
      "Не удалось загрузить список медицинских организаций.",
    loadDoctorsError:
      "Не удалось загрузить врачей выбранной организации.",
    loadScheduleError:
      "Не удалось загрузить расписание врача.",

    selectOrganizationError:
      "Выберите медицинскую организацию.",
    selectDoctorError: "Выберите врача.",
    selectDateError: "Выберите дату приёма.",
    selectTimeError: "Выберите свободное время.",
    invalidEmailError:
      "Укажите правильный адрес электронной почты.",
    reasonRequiredError:
      "Укажите причину обращения.",
    bookingCreated: "Запись успешно создана.",
    bookingCreateError:
      "Не удалось создать запись.",

    notSelectedFeminine: "Не выбрана",
    notSelectedMasculine: "Не выбран",
    notSpecifiedFeminine: "Не указана",
    notSelectedNeutral: "Не выбрано",

    title: "Запись к врачу",
    subtitle:
      "Выберите организацию, врача, дату и свободное время приёма.",
    refresh: "Обновить",

    organizationSection:
      "Медицинская организация",
    chooseClinic: "Выберите клинику",
    loadingOrganizations:
      "Загрузка организаций...",
    chooseOrganization:
      "Выберите организацию",

    doctorSection: "Врач",
    chooseDoctor: "Выберите врача",
    firstChooseOrganization:
      "Сначала выберите организацию",
    loadingDoctors: "Загрузка врачей...",
    noDoctors: "Доступных врачей нет",

    appointmentDate: "Дата приёма",
    chooseDate: "Выберите дату",

    appointmentTime: "Время приёма",
    firstChooseDoctor:
      "Сначала выберите врача.",
    loadingSchedule:
      "Загрузка расписания...",
    noFreeSlots:
      "На выбранную дату свободных интервалов нет.",
    available: "Свободно",
    busy: "Занято",
    selected: "Выбрано",
    until: "до",

    email: "Электронная почта",
    ticketEmail:
      "Почта для талона и уведомлений",
    emailHint:
      "На эту почту будет отправлен талон записи, QR-код и уведомления о приёме.",

    visitReason: "Причина обращения",
    visitReasonPlaceholder:
      "Кратко опишите причину обращения к врачу",

    creatingBooking: "Создание записи...",
    confirmBooking: "Подтвердить запись",

    electronicTicket: "Электронный талон",
    checkBeforeConfirm:
      "Проверьте данные перед подтверждением",
    organization: "Организация",
    specialty: "Специальность",
    department: "Отделение",
    roomLabel: "Кабинет",
    date: "Дата",
    time: "Время",
    qrInfo:
      "QR-код и цифровой код начала приёма создаются после успешной записи. Покажите их врачу перед началом приёма.",

    bookingReady: "Запись создана",
    bookingNumber: "Номер записи",
    startCode: "Код начала приёма",
    confirmationSentTo:
      "Подтверждение будет отправлено на:",
  },

  kk: {
    dateNotSelected: "Күн таңдалмаған",
    medicalOrganization: "Медициналық ұйым",
    doctor: "Дәрігер",
    specialtyNotSpecified:
      "Мамандығы көрсетілмеген",
    room: "Кабинет",

    loadOrganizationsError:
      "Медициналық ұйымдар тізімін жүктеу мүмкін болмады.",
    loadDoctorsError:
      "Таңдалған ұйымның дәрігерлерін жүктеу мүмкін болмады.",
    loadScheduleError:
      "Дәрігердің кестесін жүктеу мүмкін болмады.",

    selectOrganizationError:
      "Медициналық ұйымды таңдаңыз.",
    selectDoctorError: "Дәрігерді таңдаңыз.",
    selectDateError:
      "Қабылдау күнін таңдаңыз.",
    selectTimeError:
      "Бос уақытты таңдаңыз.",
    invalidEmailError:
      "Электрондық пошта мекенжайын дұрыс көрсетіңіз.",
    reasonRequiredError:
      "Жүгіну себебін көрсетіңіз.",
    bookingCreated: "Жазба сәтті жасалды.",
    bookingCreateError:
      "Жазба жасау мүмкін болмады.",

    notSelectedFeminine: "Таңдалмаған",
    notSelectedMasculine: "Таңдалмаған",
    notSpecifiedFeminine: "Көрсетілмеген",
    notSelectedNeutral: "Таңдалмаған",

    title: "Дәрігерге жазылу",
    subtitle:
      "Ұйымды, дәрігерді, күнді және қабылдаудың бос уақытын таңдаңыз.",
    refresh: "Жаңарту",

    organizationSection:
      "Медициналық ұйым",
    chooseClinic: "Клиниканы таңдаңыз",
    loadingOrganizations:
      "Ұйымдар жүктелуде...",
    chooseOrganization:
      "Ұйымды таңдаңыз",

    doctorSection: "Дәрігер",
    chooseDoctor: "Дәрігерді таңдаңыз",
    firstChooseOrganization:
      "Алдымен ұйымды таңдаңыз",
    loadingDoctors:
      "Дәрігерлер жүктелуде...",
    noDoctors: "Қолжетімді дәрігерлер жоқ",

    appointmentDate: "Қабылдау күні",
    chooseDate: "Күнді таңдаңыз",

    appointmentTime: "Қабылдау уақыты",
    firstChooseDoctor:
      "Алдымен дәрігерді таңдаңыз.",
    loadingSchedule:
      "Кесте жүктелуде...",
    noFreeSlots:
      "Таңдалған күнге бос уақыт аралықтары жоқ.",
    available: "Бос",
    busy: "Бос емес",
    selected: "Таңдалды",
    until: "дейін",

    email: "Электрондық пошта",
    ticketEmail:
      "Талон мен хабарландыруларға арналған пошта",
    emailHint:
      "Осы поштаға жазылу талоны, QR-код және қабылдау туралы хабарландырулар жіберіледі.",

    visitReason: "Жүгіну себебі",
    visitReasonPlaceholder:
      "Дәрігерге жүгіну себебін қысқаша сипаттаңыз",

    creatingBooking: "Жазба жасалуда...",
    confirmBooking: "Жазбаны растау",

    electronicTicket: "Электрондық талон",
    checkBeforeConfirm:
      "Растамас бұрын деректерді тексеріңіз",
    organization: "Ұйым",
    specialty: "Мамандығы",
    department: "Бөлімше",
    roomLabel: "Кабинет",
    date: "Күні",
    time: "Уақыты",
    qrInfo:
      "QR-код пен қабылдауды бастауға арналған цифрлық код сәтті жазылғаннан кейін жасалады. Қабылдау басталар алдында оларды дәрігерге көрсетіңіз.",

    bookingReady: "Жазба жасалды",
    bookingNumber: "Жазба нөмірі",
    startCode: "Қабылдауды бастау коды",
    confirmationSentTo:
      "Растау мына поштаға жіберіледі:",
  },
};

function clean(value) {
  return String(value ?? "").trim();
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

function extractProfileEmail(response) {
  const body =
    response?.data?.data ??
    response?.data ??
    {};

  const profile =
    body?.profile ??
    body?.user ??
    body;

  return clean(
    profile?.email ||
      body?.email ||
      body?.profile_email
  );
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
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

function formatDate(
  dateString,
  text,
  locale
) {
  if (!dateString) {
    return text.dateNotSelected;
  }

  const parsedDate = new Date(
    `${dateString}T12:00:00`
  );

  if (
    Number.isNaN(parsedDate.getTime())
  ) {
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
  ).format(parsedDate);
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    clean(value)
  );
}

function getOrganizationName(organization, text) {
  return (
    clean(organization?.name) ||
    clean(
      organization?.organization_name
    ) ||
    text.medicalOrganization
  );
}

function getDoctorName(doctor, text) {
  return (
    clean(doctor?.fullName) ||
    clean(doctor?.full_name) ||
    clean(doctor?.profile?.full_name) ||
    text.doctor
  );
}

function getSpecialtyName(
  doctor,
  text,
  isKazakh
) {
  const specialty =
    doctor?.specialty ||
    doctor?.specialties ||
    {};

  return (
    clean(
      isKazakh
        ? specialty?.name_kk ||
            specialty?.name_kz
        : specialty?.name_ru
    ) ||
    clean(specialty?.name) ||
    clean(
      doctor?.specialty_name
    ) ||
    text.specialtyNotSpecified
  );
}

function getDepartmentName(
  doctor,
  isKazakh
) {
  const department =
    doctor?.department || {};

  return (
    clean(
      isKazakh
        ? department?.name_kk ||
            department?.name_kz
        : department?.name_ru
    ) ||
    clean(department?.name) ||
    clean(
      doctor?.department_name
    )
  );
}

function getRoomName(doctor, text) {
  const room =
    doctor?.room || doctor?.rooms;

  const roomNumber =
    clean(room?.number) ||
    clean(doctor?.room_number);

  const roomName =
    clean(room?.name) ||
    clean(doctor?.room_name);

  if (roomNumber && roomName) {
    return `${text.room} ${roomNumber} — ${roomName}`;
  }

  if (roomNumber) {
    return `${text.room} ${roomNumber}`;
  }

  return roomName;
}

function getAppointmentData(response) {
  const body =
    response?.data?.data ??
    response?.data ??
    {};

  return (
    body?.appointment ||
    body
  );
}

export default function Booking() {
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

  const [
    organizations,
    setOrganizations,
  ] = useState([]);

  const [
    selectedOrg,
    setSelectedOrg,
  ] = useState("");

  const [doctors, setDoctors] =
    useState([]);

  const [
    selectedDoc,
    setSelectedDoc,
  ] = useState("");

  const [date, setDate] = useState(
    getLocalDateString()
  );

  const [slots, setSlots] =
    useState([]);

  const [
    selectedSlot,
    setSelectedSlot,
  ] = useState("");

  const [reason, setReason] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [
    loadingOrganizations,
    setLoadingOrganizations,
  ] = useState(true);

  const [
    loadingDoctors,
    setLoadingDoctors,
  ] = useState(false);

  const [
    loadingSlots,
    setLoadingSlots,
  ] = useState(false);

  const [
    loadingProfile,
    setLoadingProfile,
  ] = useState(true);

  const [booking, setBooking] =
    useState(false);

  const [message, setMessage] =
    useState({
      type: "",
      text: "",
    });

  const [
    bookingResult,
    setBookingResult,
  ] = useState(null);

  const [isMobile, setIsMobile] =
    useState(
      window.innerWidth < 1050
    );

  useEffect(() => {
    function handleResize() {
      setIsMobile(
        window.innerWidth < 1050
      );
    }

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);

  const selectedOrganization =
    useMemo(() => {
      return (
        organizations.find(
          (organization) =>
            String(organization.id) ===
            String(selectedOrg)
        ) || null
      );
    }, [
      organizations,
      selectedOrg,
    ]);

  const selectedDoctor =
    useMemo(() => {
      return (
        doctors.find(
          (doctor) =>
            String(doctor.id) ===
            String(selectedDoc)
        ) || null
      );
    }, [doctors, selectedDoc]);

  const availableSlots =
    useMemo(() => {
      return slots.filter(
        (slot) =>
          slot.isAvailable === true ||
          slot.status === "available"
      );
    }, [slots]);

  const busySlots = useMemo(() => {
    return slots.filter(
      (slot) =>
        slot.isAvailable === false ||
        slot.status === "busy"
    );
  }, [slots]);

  const loadProfile =
    useCallback(async () => {
      setLoadingProfile(true);

      try {
        const response =
          await api.get("/auth/me");

        const profileEmail =
          extractProfileEmail(response);

        if (profileEmail) {
          setEmail(profileEmail);
        }
      } catch (error) {
        console.error(
          "Ошибка загрузки профиля:",
          error
        );
      } finally {
        setLoadingProfile(false);
      }
    }, []);

  const loadOrganizations =
    useCallback(async () => {
      setLoadingOrganizations(true);

      try {
        const response =
          await api.get(
            "/organizations/active/list"
          );

        const list =
          extractArray(response);

        setOrganizations(list);

        if (list.length === 1) {
          setSelectedOrg(
            String(list[0].id)
          );
        }
      } catch (error) {
        setOrganizations([]);

        setMessage({
          type: "error",
          text: getErrorMessage(
            error,
            text.loadOrganizationsError
          ),
        });
      } finally {
        setLoadingOrganizations(false);
      }
    }, [text]);

  const loadDoctors =
    useCallback(
      async (organizationId) => {
        if (!organizationId) {
          setDoctors([]);
          return;
        }

        setLoadingDoctors(true);

        try {
          const response =
            await api.get("/doctors", {
              params: {
                organizationId,
              },
            });

          const list =
            extractArray(
              response
            ).filter(
              (doctor) =>
                doctor.status !==
                  "archived" &&
                doctor.status !==
                  "blocked"
            );

          setDoctors(list);
        } catch (error) {
          setDoctors([]);

          setMessage({
            type: "error",
            text: getErrorMessage(
              error,
              text.loadDoctorsError
            ),
          });
        } finally {
          setLoadingDoctors(false);
        }
      },
      [text]
    );

  const loadSlots =
    useCallback(
      async (
        doctorId,
        selectedDate
      ) => {
        if (
          !doctorId ||
          !selectedDate
        ) {
          setSlots([]);
          return;
        }

        setLoadingSlots(true);

        try {
          const response =
            await api.get(
              "/schedules/slots",
              {
                params: {
                  doctorId,
                  date: selectedDate,
                },
              }
            );

          setSlots(
            extractArray(response)
          );
        } catch (error) {
          setSlots([]);

          setMessage({
            type: "error",
            text: getErrorMessage(
              error,
              text.loadScheduleError
            ),
          });
        } finally {
          setLoadingSlots(false);
        }
      },
      [text]
    );

  useEffect(() => {
    loadProfile();
    loadOrganizations();
  }, [
    loadProfile,
    loadOrganizations,
  ]);

  useEffect(() => {
    setSelectedDoc("");
    setSelectedSlot("");
    setSlots([]);
    setBookingResult(null);

    if (selectedOrg) {
      loadDoctors(selectedOrg);
    } else {
      setDoctors([]);
    }
  }, [selectedOrg, loadDoctors]);

  useEffect(() => {
    setSelectedSlot("");
    setBookingResult(null);

    if (selectedDoc && date) {
      loadSlots(
        selectedDoc,
        date
      );
    } else {
      setSlots([]);
    }
  }, [
    selectedDoc,
    date,
    loadSlots,
  ]);

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage({
      type: "",
      text: "",
    });

    if (!selectedOrg) {
      setMessage({
        type: "error",
        text:
          text.selectOrganizationError,
      });

      return;
    }

    if (!selectedDoc) {
      setMessage({
        type: "error",
        text:
          text.selectDoctorError,
      });

      return;
    }

    if (!date) {
      setMessage({
        type: "error",
        text:
          text.selectDateError,
      });

      return;
    }

    if (!selectedSlot) {
      setMessage({
        type: "error",
        text:
          text.selectTimeError,
      });

      return;
    }

    if (!validateEmail(email)) {
      setMessage({
        type: "error",
        text:
          text.invalidEmailError,
      });

      return;
    }

    if (!reason.trim()) {
      setMessage({
        type: "error",
        text:
          text.reasonRequiredError,
      });

      return;
    }

    setBooking(true);

    try {
      const response =
        await api.post(
          "/appointments",
          {
            organizationId:
              selectedOrg,

            doctorId:
              selectedDoc,

            date,

            time:
              selectedSlot,

            reason:
              reason.trim(),

            notificationEmail:
              email.trim(),
          }
        );

      const appointment =
        getAppointmentData(
          response
        );

      const startCode =
        clean(
          appointment?.start_code
        ) ||
        clean(
          appointment?.startCode
        ) ||
        clean(
          appointment?.booking_code
        ) ||
        clean(
          appointment?.bookingCode
        ) ||
        clean(
          appointment?.qr_token
        );

      setBookingResult({
        id:
          appointment?.id || "",

        organization:
          getOrganizationName(
            selectedOrganization,
            text
          ),

        doctor:
          getDoctorName(
            selectedDoctor,
            text
          ),

        specialty:
          getSpecialtyName(
            selectedDoctor,
            text,
            isKazakh
          ),

        department:
          getDepartmentName(
            selectedDoctor,
            isKazakh
          ),

        room:
          getRoomName(
            selectedDoctor,
            text
          ),

        date,
        time:
          selectedSlot,

        email:
          email.trim(),

        status:
          appointment?.status ||
          "scheduled",

        startCode,
      });

      setMessage({
        type: "success",
        text:
          text.bookingCreated,
      });

      setReason("");
      setSelectedSlot("");

      await loadSlots(
        selectedDoc,
        date
      );
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(
          error,
          text.bookingCreateError
        ),
      });

      await loadSlots(
        selectedDoc,
        date
      );
    } finally {
      setBooking(false);
    }
  }

  const organizationName =
    selectedOrganization
      ? getOrganizationName(
          selectedOrganization,
          text
        )
      : text.notSelectedFeminine;

  const doctorName =
    selectedDoctor
      ? getDoctorName(
          selectedDoctor,
          text
        )
      : text.notSelectedMasculine;

  const specialtyName =
    selectedDoctor
      ? getSpecialtyName(
          selectedDoctor,
          text,
          isKazakh
        )
      : text.notSpecifiedFeminine;

  const departmentName =
    selectedDoctor
      ? getDepartmentName(
          selectedDoctor,
          isKazakh
        )
      : "";

  const roomName =
    selectedDoctor
      ? getRoomName(
          selectedDoctor,
          text
        )
      : "";

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>
            {text.title}
          </h1>

          <p style={styles.subtitle}>
            {text.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadProfile();
            loadOrganizations();

            if (
              selectedDoc &&
              date
            ) {
              loadSlots(
                selectedDoc,
                date
              );
            }
          }}
          style={styles.refreshButton}
        >
          <RiRefreshLine />
          {text.refresh}
        </button>
      </header>

      {message.text && (
        <div
          style={{
            ...styles.alert,

            ...(message.type ===
            "error"
              ? styles.errorAlert
              : styles.successAlert),
          }}
        >
          {message.text}
        </div>
      )}

      <div
        style={{
          ...styles.pageGrid,

          gridTemplateColumns:
            isMobile
              ? "1fr"
              : "minmax(0, 1.55fr) minmax(320px, 0.8fr)",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={styles.formCard}
        >
          <SectionTitle
            icon={
              <RiHospitalLine />
            }
            title={text.organizationSection}
          />

          <Field
            label={text.chooseClinic}
          >
            <select
              value={selectedOrg}
              onChange={(event) =>
                setSelectedOrg(
                  event.target.value
                )
              }
              disabled={
                loadingOrganizations
              }
              style={styles.control}
            >
              <option value="">
                {loadingOrganizations
                  ? text.loadingOrganizations
                  : text.chooseOrganization}
              </option>

              {organizations.map(
                (organization) => (
                  <option
                    key={
                      organization.id
                    }
                    value={
                      organization.id
                    }
                  >
                    {getOrganizationName(
                      organization,
                      text
                    )}

                    {organization.city
                      ? ` — ${organization.city}`
                      : ""}
                  </option>
                )
              )}
            </select>
          </Field>

          <Divider />

          <SectionTitle
            icon={
              <RiUserHeartLine />
            }
            title={text.doctorSection}
          />

          <Field label={text.chooseDoctor}>
            <select
              value={selectedDoc}
              onChange={(event) =>
                setSelectedDoc(
                  event.target.value
                )
              }
              disabled={
                !selectedOrg ||
                loadingDoctors
              }
              style={styles.control}
            >
              <option value="">
                {!selectedOrg
                  ? text.firstChooseOrganization
                  : loadingDoctors
                  ? text.loadingDoctors
                  : doctors.length === 0
                  ? text.noDoctors
                  : text.chooseDoctor}
              </option>

              {doctors.map(
                (doctor) => (
                  <option
                    key={doctor.id}
                    value={doctor.id}
                  >
                    {getDoctorName(
                      doctor,
                      text
                    )}
                    {" — "}
                    {getSpecialtyName(
                      doctor,
                      text,
                      isKazakh
                    )}
                  </option>
                )
              )}
            </select>
          </Field>

          {selectedDoctor && (
            <div
              style={
                styles.doctorPreview
              }
            >
              <div
                style={
                  styles.doctorIcon
                }
              >
                <RiUserHeartLine />
              </div>

              <div>
                <strong>
                  {doctorName}
                </strong>

                <span
                  style={
                    styles.previewMeta
                  }
                >
                  {specialtyName}
                </span>

                {departmentName && (
                  <span
                    style={
                      styles.previewMeta
                    }
                  >
                    {departmentName}
                  </span>
                )}

                {roomName && (
                  <span
                    style={
                      styles.previewMeta
                    }
                  >
                    {roomName}
                  </span>
                )}
              </div>
            </div>
          )}

          <Divider />

          <SectionTitle
            icon={
              <RiCalendarEventLine />
            }
            title={text.appointmentDate}
          />

          <Field label={text.chooseDate}>
            <input
              type="date"
              value={date}
              min={
                getLocalDateString()
              }
              onChange={(event) =>
                setDate(
                  event.target.value
                )
              }
              disabled={!selectedDoc}
              style={{
                ...styles.control,
                colorScheme: "dark",
              }}
            />

            <span
              style={
                styles.helperText
              }
            >
              {formatDate(date, text, locale)}
            </span>
          </Field>

          <Divider />

          <SectionTitle
            icon={<RiTimeLine />}
            title={text.appointmentTime}
          />

          {!selectedDoc ? (
            <EmptyState text={text.firstChooseDoctor} />
          ) : loadingSlots ? (
            <EmptyState text={text.loadingSchedule} />
          ) : slots.length === 0 ? (
            <EmptyState text={text.noFreeSlots} />
          ) : (
            <>
              <div
                style={styles.legend}
              >
                <Legend
                  color="#10b981"
                  text={text.available}
                />

                <Legend
                  color="#64748b"
                  text={text.busy}
                />
              </div>

              <div
                style={
                  styles.slotsGrid
                }
              >
                {slots.map((slot) => {
                  const startTime =
                    clean(
                      slot.startTime ||
                        slot.time
                    ).slice(0, 5);

                  const endTime =
                    clean(
                      slot.endTime
                    ).slice(0, 5);

                  const isAvailable =
                    slot.isAvailable ===
                      true ||
                    slot.status ===
                      "available";

                  const isSelected =
                    selectedSlot ===
                    startTime;

                  return (
                    <button
                      key={`${startTime}-${endTime}`}
                      type="button"
                      disabled={
                        !isAvailable
                      }
                      onClick={() =>
                        setSelectedSlot(
                          startTime
                        )
                      }
                      style={{
                        ...styles.slot,

                        ...(isAvailable
                          ? styles.freeSlot
                          : styles.busySlot),

                        ...(isSelected
                          ? styles.selectedSlot
                          : {}),
                      }}
                    >
                      <strong>
                        {startTime}
                      </strong>

                      {endTime && (
                        <small>
                          {text.until}{" "}
                          {endTime}
                        </small>
                      )}

                      <span>
                        {isAvailable
                          ? isSelected
                            ? text.selected
                            : text.available
                          : text.busy}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p
                style={
                  styles.slotsCounter
                }
              >
                {text.available}:{" "}
                <strong>
                  {
                    availableSlots.length
                  }
                </strong>
                {" · "}
                {text.busy}:{" "}
                <strong>
                  {busySlots.length}
                </strong>
              </p>
            </>
          )}

          <Divider />

          <SectionTitle
            icon={<RiMailLine />}
            title={text.email}
          />

          <Field label={text.ticketEmail}>
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              disabled={
                loadingProfile
              }
              placeholder="example@mail.com"
              style={styles.control}
            />

            <span
              style={
                styles.helperText
              }
            >
              {text.emailHint}
            </span>
          </Field>

          <Divider />

          <Field label={text.visitReason}>
            <textarea
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target.value
                )
              }
              rows={5}
              maxLength={1000}
              placeholder={text.visitReasonPlaceholder}
              style={styles.textarea}
            />

            <span
              style={
                styles.characterCount
              }
            >
              {reason.length}/1000
            </span>
          </Field>

          <button
            type="submit"
            disabled={
              booking ||
              !selectedOrg ||
              !selectedDoc ||
              !selectedSlot ||
              !reason.trim() ||
              !validateEmail(email)
            }
            style={{
              ...styles.submitButton,

              ...(booking ||
              !selectedOrg ||
              !selectedDoc ||
              !selectedSlot ||
              !reason.trim() ||
              !validateEmail(email)
                ? styles.disabled
                : {}),
            }}
          >
            <RiCheckLine />

            {booking
              ? text.creatingBooking
              : text.confirmBooking}
          </button>
        </form>

        <aside
          style={{
            ...styles.sidebar,

            position: isMobile
              ? "static"
              : "sticky",

            top: isMobile
              ? "auto"
              : "20px",
          }}
        >
          <div
            style={
              styles.ticketHeader
            }
          >
            <div
              style={
                styles.qrIcon
              }
            >
              <RiQrCodeLine />
            </div>

            <div>
              <h2
                style={
                  styles.ticketTitle
                }
              >
                {text.electronicTicket}
              </h2>

              <p
                style={
                  styles.ticketSubtitle
                }
              >
                {text.checkBeforeConfirm}
              </p>
            </div>
          </div>

          <SummaryRow
            label={text.organization}
            value={organizationName}
          />

          <SummaryRow
            label={text.doctor}
            value={doctorName}
          />

          <SummaryRow
            label={text.specialty}
            value={specialtyName}
          />

          {departmentName && (
            <SummaryRow
              label={text.department}
              value={departmentName}
            />
          )}

          {roomName && (
            <SummaryRow
              label={text.roomLabel}
              value={roomName}
            />
          )}

          <SummaryRow
            label={text.date}
            value={formatDate(date, text, locale)}
          />

          <SummaryRow
            label={text.time}
            value={
              selectedSlot ||
              text.notSelectedNeutral
            }
          />

          <SummaryRow
            label={text.email}
            value={
              email ||
              text.notSpecifiedFeminine
            }
          />

          <div
            style={
              styles.infoBox
            }
          >
            <RiInformationLine />

            <span>
              {text.qrInfo}
            </span>
          </div>

          {bookingResult && (
            <div
              style={
                styles.successTicket
              }
            >
              <div
                style={
                  styles.successHeading
                }
              >
                <RiCheckLine />
                {text.bookingReady}
              </div>

              {bookingResult.id && (
                <SummaryRow
                  label={text.bookingNumber}
                  value={
                    bookingResult.id
                  }
                  compact
                />
              )}

              {bookingResult.startCode && (
                <div
                  style={
                    styles.codeBox
                  }
                >
                  <span>
                    {text.startCode}
                  </span>

                  <strong>
                    {
                      bookingResult.startCode
                    }
                  </strong>
                </div>
              )}

              <p
                style={
                  styles.successText
                }
              >
                {text.confirmationSentTo}
              </p>

              <strong
                style={
                  styles.successEmail
                }
              >
                {bookingResult.email}
              </strong>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
}) {
  return (
    <div style={styles.sectionTitle}>
      {icon}
      <span>{title}</span>
    </div>
  );
}

function Field({
  label,
  children,
}) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {label}
      </label>

      {children}
    </div>
  );
}

function Divider() {
  return (
    <div style={styles.divider} />
  );
}

function EmptyState({ text }) {
  return (
    <div style={styles.emptyState}>
      {text}
    </div>
  );
}

function Legend({
  color,
  text,
}) {
  return (
    <div style={styles.legendItem}>
      <span
        style={{
          ...styles.legendDot,
          background: color,
        }}
      />

      {text}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  compact = false,
}) {
  return (
    <div
      style={{
        ...styles.summaryRow,
        padding: compact
          ? "9px 0"
          : "13px 0",
      }}
    >
      <span
        style={
          styles.summaryLabel
        }
      >
        {label}
      </span>

      <strong
        style={
          styles.summaryValue
        }
      >
        {value}
      </strong>
    </div>
  );
}

const styles = {
  container: {
    padding: "32px",
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
    fontSize: "14px",
  },

  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 15px",
    border:
      "1px solid rgba(99,102,241,0.35)",
    borderRadius: "10px",
    background:
      "rgba(99,102,241,0.12)",
    color: "#c7d2fe",
    cursor: "pointer",
    fontWeight: 700,
  },

  alert: {
    marginBottom: "20px",
    padding: "13px 16px",
    border: "1px solid",
    borderRadius: "12px",
  },

  errorAlert: {
    color: "#fca5a5",
    borderColor:
      "rgba(239,68,68,0.3)",
    background:
      "rgba(239,68,68,0.11)",
  },

  successAlert: {
    color: "#6ee7b7",
    borderColor:
      "rgba(16,185,129,0.3)",
    background:
      "rgba(16,185,129,0.11)",
  },

  pageGrid: {
    display: "grid",
    alignItems: "start",
    gap: "22px",
  },

  formCard: {
    padding: "26px",
    border:
      "1px solid rgba(255,255,255,0.07)",
    borderRadius: "18px",
    background:
      "rgba(30,41,59,0.42)",
  },

  sidebar: {
    padding: "24px",
    border:
      "1px solid rgba(99,102,241,0.22)",
    borderRadius: "18px",
    background:
      "linear-gradient(180deg, rgba(30,41,59,0.72), rgba(15,23,42,0.72))",
  },

  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginBottom: "14px",
    color: "#c7d2fe",
    fontSize: "16px",
    fontWeight: 750,
  },

  divider: {
    height: "1px",
    margin: "23px 0",
    background:
      "rgba(255,255,255,0.07)",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  label: {
    color: "#cbd5e1",
    fontSize: "12px",
    fontWeight: 700,
  },

  control: {
    width: "100%",
    minHeight: "45px",
    boxSizing: "border-box",
    padding: "11px 14px",
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px",
    outline: "none",
    background: "#172033",
    color: "#ffffff",
    fontSize: "14px",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",
    padding: "13px 14px",
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px",
    outline: "none",
    background: "#121a2c",
    color: "#ffffff",
    fontFamily: "inherit",
  },

  helperText: {
    color: "#64748b",
    fontSize: "11px",
  },

  characterCount: {
    alignSelf: "flex-end",
    color: "#64748b",
    fontSize: "10px",
  },

  doctorPreview: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    marginTop: "13px",
    padding: "13px",
    border:
      "1px solid rgba(99,102,241,0.26)",
    borderRadius: "11px",
    background:
      "rgba(99,102,241,0.1)",
  },

  doctorIcon: {
    width: "42px",
    height: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "11px",
    background:
      "rgba(99,102,241,0.22)",
    color: "#a5b4fc",
    fontSize: "21px",
  },

  previewMeta: {
    display: "block",
    marginTop: "2px",
    color: "#94a3b8",
    fontSize: "11px",
  },

  legend: {
    display: "flex",
    gap: "17px",
    marginBottom: "12px",
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#94a3b8",
    fontSize: "11px",
  },

  legendDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },

  slotsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(105px, 1fr))",
    gap: "9px",
  },

  slot: {
    minHeight: "75px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "3px",
    padding: "10px",
    border: "1px solid",
    borderRadius: "10px",
    color: "#ffffff",
    textAlign: "left",
  },

  freeSlot: {
    borderColor:
      "rgba(16,185,129,0.3)",
    background:
      "rgba(16,185,129,0.08)",
    cursor: "pointer",
  },

  busySlot: {
    borderColor:
      "rgba(100,116,139,0.2)",
    background:
      "rgba(100,116,139,0.08)",
    color: "#64748b",
    cursor: "not-allowed",
  },

  selectedSlot: {
    borderColor: "#818cf8",
    background:
      "rgba(99,102,241,0.24)",
    boxShadow:
      "0 0 0 2px rgba(99,102,241,0.12)",
  },

  slotsCounter: {
    margin: "11px 0 0",
    color: "#94a3b8",
    fontSize: "11px",
  },

  emptyState: {
    padding: "22px",
    borderRadius: "11px",
    background:
      "rgba(2,6,23,0.24)",
    color: "#94a3b8",
    textAlign: "center",
    fontSize: "12px",
  },

  submitButton: {
    width: "100%",
    minHeight: "46px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginTop: "22px",
    border: "none",
    borderRadius: "10px",
    background:
      "linear-gradient(90deg, #4f46e5, #6366f1)",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 750,
  },

  disabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },

  ticketHeader: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    marginBottom: "17px",
  },

  qrIcon: {
    width: "48px",
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "13px",
    background:
      "rgba(99,102,241,0.2)",
    color: "#a5b4fc",
    fontSize: "25px",
  },

  ticketTitle: {
    margin: "0 0 3px",
    fontSize: "19px",
  },

  ticketSubtitle: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "11px",
  },

  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    borderBottom:
      "1px solid rgba(255,255,255,0.06)",
  },

  summaryLabel: {
    color: "#64748b",
    fontSize: "11px",
  },

  summaryValue: {
    maxWidth: "65%",
    color: "#e2e8f0",
    fontSize: "11px",
    textAlign: "right",
    overflowWrap: "anywhere",
  },

  infoBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "9px",
    marginTop: "19px",
    padding: "13px",
    border:
      "1px solid rgba(56,189,248,0.18)",
    borderRadius: "11px",
    background:
      "rgba(56,189,248,0.07)",
    color: "#bae6fd",
    fontSize: "11px",
    lineHeight: 1.5,
  },

  successTicket: {
    marginTop: "18px",
    padding: "16px",
    border:
      "1px solid rgba(16,185,129,0.3)",
    borderRadius: "12px",
    background:
      "rgba(16,185,129,0.1)",
  },

  successHeading: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    marginBottom: "9px",
    color: "#6ee7b7",
    fontWeight: 800,
  },

  codeBox: {
    marginTop: "13px",
    padding: "14px",
    borderRadius: "10px",
    background:
      "rgba(2,6,23,0.35)",
    textAlign: "center",
  },

  successText: {
    margin: "13px 0 4px",
    color: "#94a3b8",
    fontSize: "11px",
  },

  successEmail: {
    color: "#d1fae5",
    fontSize: "12px",
    overflowWrap: "anywhere",
  },
};

