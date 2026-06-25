
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  RiArchiveLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiKeyLine,
  RiLockLine,
  RiLockUnlockLine,
  RiRefreshLine,
  RiTeamLine,
  RiUserAddLine,
} from "react-icons/ri";

import api from "../../api/api";
import { useLanguage } from "../../i18n/LanguageContext";


const TEXTS = {
  ru: {
    accessNoAccess: "Доступ не выдан",
    accessActive: "Доступ активен",
    accessBlocked: "Доступ заблокирован",
    accessArchived: "В архиве",
    unknown: "Неизвестно",

    loadDoctorsError: "Не удалось загрузить врачей.",
    invalidIin: "ИИН должен состоять ровно из 12 цифр.",
    fullNameRequired: "Укажите ФИО врача.",
    emailRequired: "Укажите электронную почту врача.",
    doctorCreated:
      "Карточка врача создана. Теперь можно выдать доступ.",
    createDoctorError: "Не удалось создать врача.",
    invalidUsername:
      "Логин должен состоять из 3–30 букв, цифр или символов . _ -.",
    doctorFallback: "Врач",
    accessGranted: "Доступ врачу успешно выдан.",
    grantAccessError: "Не удалось выдать доступ врачу.",
    temporaryPasswordUpdated: "Временный пароль обновлён.",
    resetPasswordError: "Не удалось сбросить пароль.",
    accessBlockedMessage: "Доступ врача заблокирован.",
    blockAccessError: "Не удалось заблокировать доступ.",
    accessUnblockedMessage: "Доступ врача восстановлен.",
    unblockAccessError: "Не удалось восстановить доступ.",
    doctorArchived: "Врач отправлен в архив.",
    archiveDoctorError: "Не удалось отправить врача в архив.",
    doctorRestored: "Врач восстановлен из архива.",
    restoreDoctorError: "Не удалось восстановить врача.",
    doctorDeleted: "Врач полностью удалён из базы данных.",
    deleteDoctorError: "Не удалось полностью удалить врача.",
    credentialsCopied: "Данные для входа скопированы.",
    credentialsCopyError:
      "Не удалось скопировать данные. Скопируйте их вручную.",

    title: "Управление врачами",
    subtitle:
      "Создавайте карточки врачей, выдавайте доступ и управляйте входом в систему.",
    updating: "Обновление...",
    refresh: "Обновить",
    activeDoctors: "Действующие врачи",
    blockedDoctors: "Заблокированы",
    hideForm: "Скрыть форму",
    addDoctor: "Добавить врача",
    newDoctor: "Новый врач",
    newDoctorDescription:
      "Сначала создаётся карточка. Логин и временный пароль выдаются отдельно.",
    iinLabel: "ИИН *",
    iinShort: "ИИН",
    iinPlaceholder: "12 цифр",
    fullNameLabel: "ФИО *",
    fullNamePlaceholder: "Фамилия Имя Отчество",
    emailLabel: "Электронная почта *",
    phoneLabel: "Телефон",
    creating: "Создание...",
    createCard: "Создать карточку",
    clinicDoctors: "Врачи клиники",
    clinicDoctorsDescription:
      "Для входа врачу необходимо отдельно выдать доступ.",
    loadingDoctors: "Загрузка врачей...",
    noDoctors: "В организации пока нет врачей.",
    fullNameMissing: "ФИО не указано",
    notSpecifiedLower: "не указано",
    emailMissing: "Электронная почта не указана",
    login: "Логин",
    grantAccess: "Выдать доступ",
    resetPassword: "Сбросить пароль",
    block: "Заблокировать",
    unblock: "Разблокировать",
    archive: "В архив",
    deletePermanently: "Удалить полностью",
    processing: "Выполнение операции...",
    doctorLogin: "Логин врача *",
    usernameHint:
      "Разрешены буквы, цифры и символы точка, дефис, нижнее подчёркивание.",
    cancel: "Отмена",
    createAccess: "Создать доступ",
    loginData: "Данные для входа",
    temporaryPasswordWarning:
      "Временный пароль показывается только сейчас. Скопируйте и передайте его врачу через WhatsApp, Telegram или другим безопасным способом.",
    temporaryPassword: "Временный пароль",
    copy: "Скопировать",
    done: "Готово",

    confirmResetPassword: (name) =>
      `Создать новый временный пароль для врача «${name}»? Старый пароль перестанет работать.`,
    confirmBlock: (name) =>
      `Заблокировать доступ врачу «${name}»? Его активные сессии будут завершены.`,
    confirmArchive: (name) =>
      `Отправить врача «${name}» в архив? Его доступ будет заблокирован.`,
    confirmRestore: (name) =>
      `Разблокировать и восстановить врача «${name}» из архива?`,
    confirmDeleteFirst: (name) =>
      `Полностью удалить врача «${name}» из базы данных?\n\nБудут удалены карточка врача, членство в организации и учётная запись.`,
    confirmDeleteSecond:
      "Это действие нельзя отменить. Полностью удалить врача?",
    copyDoctor: "Врач",
  },

  kk: {
    accessNoAccess: "Кіру рұқсаты берілмеген",
    accessActive: "Кіру рұқсаты белсенді",
    accessBlocked: "Кіру рұқсаты бұғатталған",
    accessArchived: "Мұрағатта",
    unknown: "Белгісіз",

    loadDoctorsError: "Дәрігерлерді жүктеу мүмкін болмады.",
    invalidIin: "ЖСН дәл 12 цифрдан тұруы керек.",
    fullNameRequired: "Дәрігердің ТАӘ-сін көрсетіңіз.",
    emailRequired: "Дәрігердің электрондық поштасын көрсетіңіз.",
    doctorCreated:
      "Дәрігер карточкасы жасалды. Енді кіру рұқсатын беруге болады.",
    createDoctorError: "Дәрігерді жасау мүмкін болмады.",
    invalidUsername:
      "Логин 3–30 әріптен, саннан немесе . _ - таңбаларынан тұруы керек.",
    doctorFallback: "Дәрігер",
    accessGranted: "Дәрігерге кіру рұқсаты сәтті берілді.",
    grantAccessError: "Дәрігерге кіру рұқсатын беру мүмкін болмады.",
    temporaryPasswordUpdated: "Уақытша құпиясөз жаңартылды.",
    resetPasswordError: "Құпиясөзді қайта орнату мүмкін болмады.",
    accessBlockedMessage: "Дәрігердің кіру рұқсаты бұғатталды.",
    blockAccessError: "Кіру рұқсатын бұғаттау мүмкін болмады.",
    accessUnblockedMessage: "Дәрігердің кіру рұқсаты қалпына келтірілді.",
    unblockAccessError: "Кіру рұқсатын қалпына келтіру мүмкін болмады.",
    doctorArchived: "Дәрігер мұрағатқа жіберілді.",
    archiveDoctorError: "Дәрігерді мұрағатқа жіберу мүмкін болмады.",
    doctorRestored: "Дәрігер мұрағаттан қалпына келтірілді.",
    restoreDoctorError: "Дәрігерді қалпына келтіру мүмкін болмады.",
    doctorDeleted: "Дәрігер дерекқордан толық жойылды.",
    deleteDoctorError: "Дәрігерді толық жою мүмкін болмады.",
    credentialsCopied: "Кіру деректері көшірілді.",
    credentialsCopyError:
      "Деректерді көшіру мүмкін болмады. Оларды қолмен көшіріңіз.",

    title: "Дәрігерлерді басқару",
    subtitle:
      "Дәрігер карточкаларын жасап, кіру рұқсатын және жүйеге кіруді басқарыңыз.",
    updating: "Жаңартылуда...",
    refresh: "Жаңарту",
    activeDoctors: "Белсенді дәрігерлер",
    blockedDoctors: "Бұғатталған",
    hideForm: "Нысанды жасыру",
    addDoctor: "Дәрігер қосу",
    newDoctor: "Жаңа дәрігер",
    newDoctorDescription:
      "Алдымен дәрігер карточкасы жасалады. Логин мен уақытша құпиясөз бөлек беріледі.",
    iinLabel: "ЖСН *",
    iinShort: "ЖСН",
    iinPlaceholder: "12 цифр",
    fullNameLabel: "ТАӘ *",
    fullNamePlaceholder: "Тегі Аты Әкесінің аты",
    emailLabel: "Электрондық пошта *",
    phoneLabel: "Телефон",
    creating: "Жасалуда...",
    createCard: "Карточка жасау",
    clinicDoctors: "Клиника дәрігерлері",
    clinicDoctorsDescription:
      "Жүйеге кіру үшін дәрігерге рұқсатты бөлек беру қажет.",
    loadingDoctors: "Дәрігерлер жүктелуде...",
    noDoctors: "Ұйымда әзірге дәрігерлер жоқ.",
    fullNameMissing: "ТАӘ көрсетілмеген",
    notSpecifiedLower: "көрсетілмеген",
    emailMissing: "Электрондық пошта көрсетілмеген",
    login: "Логин",
    grantAccess: "Кіру рұқсатын беру",
    resetPassword: "Құпиясөзді қайта орнату",
    block: "Бұғаттау",
    unblock: "Бұғаттан шығару",
    archive: "Мұрағатқа",
    deletePermanently: "Толық жою",
    processing: "Операция орындалуда...",
    doctorLogin: "Дәрігер логині *",
    usernameHint:
      "Әріптер, сандар және нүкте, дефис, астыңғы сызық таңбаларына рұқсат етіледі.",
    cancel: "Бас тарту",
    createAccess: "Кіру рұқсатын жасау",
    loginData: "Кіру деректері",
    temporaryPasswordWarning:
      "Уақытша құпиясөз тек қазір көрсетіледі. Оны көшіріп, дәрігерге WhatsApp, Telegram немесе басқа қауіпсіз тәсілмен жіберіңіз.",
    temporaryPassword: "Уақытша құпиясөз",
    copy: "Көшіру",
    done: "Дайын",

    confirmResetPassword: (name) =>
      `«${name}» дәрігері үшін жаңа уақытша құпиясөз жасалсын ба? Ескі құпиясөз жұмысын тоқтатады.`,
    confirmBlock: (name) =>
      `«${name}» дәрігерінің кіру рұқсатын бұғаттау керек пе? Оның белсенді сеанстары аяқталады.`,
    confirmArchive: (name) =>
      `«${name}» дәрігерін мұрағатқа жіберу керек пе? Оның кіру рұқсаты бұғатталады.`,
    confirmRestore: (name) =>
      `«${name}» дәрігерін мұрағаттан қалпына келтіріп, бұғаттан шығару керек пе?`,
    confirmDeleteFirst: (name) =>
      `«${name}» дәрігерін дерекқордан толық жою керек пе?\n\nДәрігер карточкасы, ұйым мүшелігі және есептік жазбасы жойылады.`,
    confirmDeleteSecond:
      "Бұл әрекетті қайтару мүмкін емес. Дәрігерді толық жою керек пе?",
    copyDoctor: "Дәрігер",
  },
};

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

function getAccessStatusLabel(status, text) {
  const labels = {
    no_access: text.accessNoAccess,
    active: text.accessActive,
    blocked: text.accessBlocked,
    archived: text.accessArchived,
  };

  return labels[status] || text.unknown;
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
  const languageContext = useLanguage();

  const rawLanguage =
    typeof languageContext === "string"
      ? languageContext
      : languageContext?.language ??
        languageContext?.currentLanguage ??
        languageContext?.selectedLanguage ??
        languageContext?.lang ??
        languageContext?.locale ??
        "ru";

  const normalizedLanguage = String(rawLanguage)
    .trim()
    .toLowerCase();

  const isKazakh =
    normalizedLanguage === "kk" ||
    normalizedLanguage === "kz" ||
    normalizedLanguage === "kaz" ||
    normalizedLanguage === "kazakh" ||
    normalizedLanguage === "қаз" ||
    normalizedLanguage.startsWith("kk-") ||
    normalizedLanguage.startsWith("kz-");

  const text = isKazakh ? TEXTS.kk : TEXTS.ru;

  const localizedResponseMessage = (
    response,
    fallback
  ) =>
    isKazakh
      ? fallback
      : response?.data?.message ||
        fallback;

  const localizedErrorMessage = (
    error,
    fallback
  ) =>
    isKazakh
      ? fallback
      : getErrorMessage(
          error,
          fallback
        );

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
          text: localizedErrorMessage(
            error,
            text.loadDoctorsError
          ),
        });
      } finally {
        setLoading(false);
      }
    }, [
      text.loadDoctorsError,
      isKazakh,
    ]);

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
        text: text.invalidIin,
      });

      return;
    }

    if (!fullName.trim()) {
      setMessage({
        type: "error",
        text: text.fullNameRequired,
      });

      return;
    }

    if (!email.trim()) {
      setMessage({
        type: "error",
        text: text.emailRequired,
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
            localizedResponseMessage(
              response,
              text.doctorCreated
            ),
        });

        await loadDoctors();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: localizedErrorMessage(
          error,
          text.createDoctorError
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
        text: text.invalidUsername,
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
          text.doctorFallback,

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
          localizedResponseMessage(
            response,
            text.accessGranted
          ),
      });

      await loadDoctors();
    } catch (error) {
      setMessage({
        type: "error",
        text: localizedErrorMessage(
          error,
          text.grantAccessError
        ),
      });
    } finally {
      setActiveAction("");
    }
  }

  async function resetPassword(doctor) {
    const confirmed = window.confirm(
      text.confirmResetPassword(doctor.fullName)
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
          doctor.fullName || text.doctorFallback,

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
          localizedResponseMessage(
            response,
            text.temporaryPasswordUpdated
          ),
      });

      await loadDoctors();
    } catch (error) {
      setMessage({
        type: "error",
        text: localizedErrorMessage(
          error,
          text.resetPasswordError
        ),
      });
    } finally {
      setActiveAction("");
    }
  }

  async function blockAccess(doctor) {
    const confirmed = window.confirm(
      text.confirmBlock(doctor.fullName)
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
          localizedResponseMessage(
            response,
            text.accessBlockedMessage
          ),
      });

      await loadDoctors();
    } catch (error) {
      setMessage({
        type: "error",
        text: localizedErrorMessage(
          error,
          text.blockAccessError
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
          localizedResponseMessage(
            response,
            text.accessUnblockedMessage
          ),
      });

      await loadDoctors();
    } catch (error) {
      setMessage({
        type: "error",
        text: localizedErrorMessage(
          error,
          text.unblockAccessError
        ),
      });
    } finally {
      setActiveAction("");
    }
  }

  async function archiveDoctor(doctor) {
    const confirmed = window.confirm(
      text.confirmArchive(doctor.fullName)
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
          localizedResponseMessage(
            response,
            text.doctorArchived
          ),
      });

      await loadDoctors();
    } catch (error) {
      setMessage({
        type: "error",
        text: localizedErrorMessage(
          error,
          text.archiveDoctorError
        ),
      });
    } finally {
      setActiveAction("");
    }
  }

  async function restoreArchivedDoctor(
    doctor
  ) {
    const confirmed = window.confirm(
      text.confirmRestore(doctor.fullName)
    );

    if (!confirmed) {
      return;
    }

    setActiveAction(
      `restore:${doctor.id}`
    );

    setMessage({
      type: "",
      text: "",
    });

    try {
      const response = await api.patch(
        `/doctors/${doctor.id}/restore`
      );

      setMessage({
        type: "success",
        text:
          localizedResponseMessage(
            response,
            text.doctorRestored
          ),
      });

      await loadDoctors();
    } catch (error) {
      setMessage({
        type: "error",
        text: localizedErrorMessage(
          error,
          text.restoreDoctorError
        ),
      });
    } finally {
      setActiveAction("");
    }
  }

  async function deleteDoctorPermanently(
    doctor
  ) {
    const firstConfirmation =
      window.confirm(
        text.confirmDeleteFirst(doctor.fullName)
      );

    if (!firstConfirmation) {
      return;
    }

    const secondConfirmation =
      window.confirm(
        text.confirmDeleteSecond
      );

    if (!secondConfirmation) {
      return;
    }

    setActiveAction(
      `delete:${doctor.id}`
    );

    setMessage({
      type: "",
      text: "",
    });

    try {
      const response = await api.delete(
        `/doctors/${doctor.id}/permanent`
      );

      setMessage({
        type: "success",
        text:
          localizedResponseMessage(
            response,
            text.doctorDeleted
          ),
      });

      await loadDoctors();
    } catch (error) {
      setMessage({
        type: "error",
        text: localizedErrorMessage(
          error,
          text.deleteDoctorError
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

    const credentialsText = [
      `${text.copyDoctor}: ${credentials.doctorName}`,
      `${text.login}: ${credentials.username}`,
      `${text.temporaryPassword}: ${credentials.temporaryPassword}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(
        credentialsText
      );

      setMessage({
        type: "success",
        text: text.credentialsCopied,
      });
    } catch {
      setMessage({
        type: "error",
        text: text.credentialsCopyError,
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
            {text.title}
          </h1>

          <p style={styles.sub}>
            {text.subtitle}
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
            ? text.updating
            : text.refresh}
        </button>
      </header>

      {message.text && (
        <div
          style={{
            ...styles.alert,

            ...(message.type === "error"
              ? styles.errorAlert
              : message.type === "success"
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
            {text.activeDoctors}
          </span>

          <strong style={styles.statValue}>
            {activeDoctors.length}
          </strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>
            {text.accessNoAccess}
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
            {text.blockedDoctors}
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
            {text.accessArchived}
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
            ? text.hideForm
            : text.addDoctor}
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
                {text.newDoctor}
              </h2>

              <p style={styles.cardSubtitle}>
                {text.newDoctorDescription}
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
                {text.iinLabel}
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
                placeholder={text.iinPlaceholder}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                {text.fullNameLabel}
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
                placeholder={text.fullNamePlaceholder}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                {text.emailLabel}
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
                {text.phoneLabel}
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
              ? text.creating
              : text.createCard}
          </button>
        </form>
      )}

      <section style={styles.listCard}>
        <div style={styles.listHeader}>
          <div>
            <h2 style={styles.cardTitle}>
              {text.clinicDoctors}
            </h2>

            <p style={styles.cardSubtitle}>
              {text.clinicDoctorsDescription}
            </p>
          </div>

          <span style={styles.countBadge}>
            {doctors.length}
          </span>
        </div>

        {loading ? (
          <div style={styles.emptyState}>
            {text.loadingDoctors}
          </div>
        ) : doctors.length === 0 ? (
          <div style={styles.emptyState}>
            {text.noDoctors}
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
                  <div style={styles.doctorMain}>
                    <div style={styles.avatar}>
                      <RiTeamLine />
                    </div>

                    <div
                      style={styles.doctorDetails}
                    >
                      <h3
                        style={styles.doctorName}
                      >
                        {doctor.fullName ||
                          text.fullNameMissing}
                      </h3>

                      <p
                        style={styles.doctorMeta}
                      >
                        {text.iinShort}:{" "}
                        {doctor.iin ||
                          text.notSpecifiedLower}
                      </p>

                      <p
                        style={styles.doctorMeta}
                      >
                        {doctor.email ||
                          text.emailMissing}

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
                          {text.login}:{" "}
                          <strong>
                            {doctor.username}
                          </strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    style={styles.doctorControls}
                  >
                    <span
                      style={{
                        ...styles.statusBadge,
                        ...badgeStyle,
                      }}
                    >
                      {getAccessStatusLabel(
                        accessStatus,
                        text
                      )}
                    </span>

                    <div style={styles.buttonsRow}>
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
                          {text.grantAccess}
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
                            {text.resetPassword}
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
                          {text.block}
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
                          {text.unblock}
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
                          {text.archive}
                        </button>
                      )}

                      {accessStatus ===
                        "archived" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              restoreArchivedDoctor(
                                doctor
                              )
                            }
                            disabled={busy}
                            style={
                              styles.successButton
                            }
                          >
                            <RiLockUnlockLine />
                            {text.unblock}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteDoctorPermanently(
                                doctor
                              )
                            }
                            disabled={busy}
                            style={
                              styles.permanentDeleteButton
                            }
                          >
                            <RiDeleteBinLine />
                            {text.deletePermanently}
                          </button>
                        </>
                      )}
                    </div>

                    {busy && (
                      <span
                        style={
                          styles.processingText
                        }
                      >
                        {text.processing}
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
                  {text.grantAccess}
                </h2>

                <p
                  style={styles.modalSubtitle}
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
                {text.doctorLogin}
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
                {text.usernameHint}
              </small>
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={closeAccessModal}
                disabled={Boolean(
                  activeAction
                )}
                style={styles.cancelButton}
              >
                {text.cancel}
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
                  ? text.creating
                  : text.createAccess}
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
                  {text.loginData}
                </h2>

                <p
                  style={styles.modalSubtitle}
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
              {text.temporaryPasswordWarning}
            </div>

            <div style={styles.credentialBox}>
              <div>
                <span
                  style={
                    styles.credentialLabel
                  }
                >
                  {text.login}
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
                  {text.temporaryPassword}
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
                {text.copy}
              </button>

              <button
                type="button"
                onClick={() =>
                  setCredentials(null)
                }
                style={styles.accessButton}
              >
                {text.done}
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
    opacity: 0.72,
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

  permanentDeleteButton: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 12px",
    borderRadius: "9px",
    border:
      "1px solid rgba(239,68,68,0.4)",
    background:
      "rgba(127,29,29,0.3)",
    color: "#fecaca",
    cursor: "pointer",
    fontWeight: 700,
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

