import { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { useNavigate, useParams, useSearchParams, } from "react-router-dom";
import api from "../../api/api";
import { useLanguage } from "../../i18n/LanguageContext";

const KK_TRANSLATIONS = Object.freeze({
  "Произошла ошибка.": "Қате пайда болды.",
  "Не указана": "Көрсетілмеген",
  "Не указано": "Көрсетілмеген",
  "Запись создана": "Жазба жасалды",
  "Посещение подтверждено": "Қабылдау расталды",
  "Приём идёт": "Қабылдау жүріп жатыр",
  "Ожидается код завершения": "Аяқтау коды күтілуде",
  "Приём завершён": "Қабылдау аяқталды",
  "Пациент не пришёл": "Пациент келмеді",
  "Отменено пациентом": "Пациент бас тартты",
  "Отменено организацией": "Ұйым бас тартты",
  "Не указан": "Көрсетілмеген",
  "Пациент": "Пациент",
  "Мужской": "Ер",
  "Женский": "Әйел",
  "Не определена": "Анықталмаған",
  "Положительный (+)": "Оң (+)",
  "Отрицательный (-)": "Теріс (-)",
  "Не определён": "Анықталмаған",
  "Ошибка чтения localStorage:": "localStorage оқу қатесі:",
  "Ошибка записи localStorage:": "localStorage жазу қатесі:",
  "Ошибка удаления localStorage:": "localStorage өшіру қатесі:",
  "Ошибка чтения черновика:": "Жобаны оқу қатесі:",
  "Не удалось загрузить медицинскую карту.": "Медициналық картаны жүктеу мүмкін болмады.",
  "Не удалось загрузить документы.": "Құжаттарды жүктеу мүмкін болмады.",
  "Не указан идентификатор записи.": "Жазба идентификаторы көрсетілмеген.",
  "Запись на приём не найдена.": "Қабылдау жазбасы табылмады.",
  "Не удалось загрузить запись.": "Жазбаны жүктеу мүмкін болмады.",
  "Ошибка проверки статуса приёма:": "Қабылдау күйін тексеру қатесі:",
  "Разрешены PDF, изображения, Word, Excel, TXT и CSV.": "PDF, суреттер, Word, Excel, TXT және CSV файлдарына рұқсат етіледі.",
  "Размер файла не должен превышать 20 МБ.": "Файл көлемі 20 МБ-тан аспауы керек.",
  "Начать приём можно только после открытия карты за 20 минут до записи.": "Қабылдауды карта жазбаға 20 минут қалғанда ашылғаннан кейін ғана бастауға болады.",
  "Введите шестизначный код начала приёма.": "Қабылдауды бастауға арналған алты таңбалы кодты енгізіңіз.",
  "Приём успешно начат.": "Қабылдау сәтті басталды.",
  "Не удалось начать приём.": "Қабылдауды бастау мүмкін болмады.",
  "Выберите группу крови и резус-фактор.": "Қан тобын және резус-факторды таңдаңыз.",
  "Подтвердите сверку группы крови с официальным анализом пациента.": "Қан тобы мен резус-факторды пациенттің ресми талдауымен салыстырғаныңызды растаңыз.",
  "Медицинская карта сохранена.": "Медициналық карта сақталды.",
  "Не удалось сохранить медицинскую карту.": "Медициналық картаны сақтау мүмкін болмады.",
  "Заполните жалобы пациента.": "Пациенттің шағымдарын толтырыңыз.",
  "Укажите диагноз.": "Диагнозды көрсетіңіз.",
  "Укажите назначенное лечение.": "Тағайындалған емді көрсетіңіз.",
  "Данные приёма сохранены.": "Қабылдау деректері сақталды.",
  "Не удалось сохранить данные приёма.": "Қабылдау деректерін сақтау мүмкін болмады.",
  "Добавлять файлы и справки можно только во время активного приёма.": "Файлдар мен анықтамаларды тек белсенді қабылдау кезінде қосуға болады.",
  "Заполните название, тип, дату и выберите файл.": "Атауын, түрін, күнін толтырып, файлды таңдаңыз.",
  "Срок действия не может быть раньше даты выдачи.": "Жарамдылық мерзімі берілген күннен ерте болмауы керек.",
  "Не удалось загрузить файл.": "Файлды жүктеу мүмкін болмады.",
  "Открытие файла доступно во время активного приёма.": "Файлды тек белсенді қабылдау кезінде ашуға болады.",
  "Ссылка на файл не получена.": "Файл сілтемесі алынбады.",
  "Не удалось открыть файл.": "Файлды ашу мүмкін болмады.",
  "Эта запись больше не находится в активном состоянии.": "Бұл жазба енді белсенді күйде емес.",
  "Код завершения отправлен пациенту.": "Аяқтау коды пациентке жіберілді.",
  "Если код не будет введён в течение 10 минут, приём завершится автоматически.": "Егер код 10 минут ішінде енгізілмесе, қабылдау автоматты түрде аяқталады.",
  "Не удалось запросить код завершения.": "Аяқтау кодын сұрату мүмкін болмады.",
  "Введите четырёхзначный код завершения.": "Аяқтаудың төрт таңбалы кодын енгізіңіз.",
  "Приём успешно завершён.": "Қабылдау сәтті аяқталды.",
  "Не удалось завершить приём.": "Қабылдауды аяқтау мүмкін болмады.",
  "Сначала завершите текущий приём. При обновлении страницы он не пропадёт.": "Алдымен ағымдағы қабылдауды аяқтаңыз. Бетті жаңартқанда ол жоғалмайды.",
  "Сначала завершите приём": "Алдымен қабылдауды аяқтаңыз",
  "Вернуться в календарь": "Күнтізбеге оралу",
  "ИИН": "ЖСН",
  "Телефон": "Телефон",
  "Дата": "Күні",
  "Время": "Уақыты",
  "Статус": "Күйі",
  "Введите шестизначный код пациента. До правильного кода медицинская карта доступна только для просмотра.": "Пациенттің алты таңбалы кодын енгізіңіз. Дұрыс код енгізілгенге дейін медициналық карта тек қарауға қолжетімді.",
  "Карта и ввод кода откроются за 20 минут до назначенного времени.": "Карта мен код енгізу жазба уақытына 20 минут қалғанда ашылады.",
  "Проверка...": "Тексерілуде...",
  "Начать приём": "Қабылдауды бастау",
  "Откроется": "Ашылады",
  "За 20 минут": "20 минут бұрын",
  "Осталось": "Қалды",
  "П": "П",
  "не указан": "көрсетілмеген",
  "Редактирование разрешено": "Өңдеуге рұқсат берілген",
  "Только просмотр": "Тек қарау",
  "ФИО": "Аты-жөні",
  "Дата рождения": "Туған күні",
  "Пол": "Жынысы",
  "Группа крови": "Қан тобы",
  "Резус-фактор": "Резус-фактор",
  "Аллергии": "Аллергиялар",
  "Хронические заболевания": "Созылмалы аурулар",
  "Можно указать несколько заболеваний с новой строки": "Бірнеше ауруды жаңа жолдан көрсетуге болады",
  "Перенесённые операции": "Өткізілген операциялар",
  "Противопоказания": "Қарсы көрсетілімдер",
  "Дополнительная важная информация": "Қосымша маңызды ақпарат",
  "Анализы и результаты обследований": "Талдаулар және тексеру нәтижелері",
  "Сохранение...": "Сақталуда...",
  "Сохранить медицинскую карту": "Медициналық картаны сақтау",
  "Документ добавлен в медицинскую карту.": "Құжат медициналық картаға қосылды.",
  "Добавить документ в медкарту": "Құжатты медициналық картаға қосу",
  "Выберите тип": "Түрін таңдаңыз",
  "Анализ или обследование": "Талдау немесе тексеру",
  "Медицинское изображение": "Медициналық кескін",
  "Назначение или рецепт": "Тағайындау немесе рецепт",
  "Другой документ медкарты": "Медициналық картаның басқа құжаты",
  "Документы в медицинской карте": "Медициналық картадағы құжаттар",
  "Документы медицинской карты пока не добавлены.": "Медициналық картаға құжаттар әлі қосылмаған.",
  "Жалобы пациента *": "Пациенттің шағымдары *",
  "Симптомы": "Белгілер",
  "Диагноз *": "Диагноз *",
  "Назначенное лечение *": "Тағайындалған ем *",
  "Рекомендации": "Ұсынымдар",
  "Дополнительный комментарий": "Қосымша түсініктеме",
  "Сохранить данные приёма": "Қабылдау деректерін сақтау",
  "Справка добавлена пациенту.": "Анықтама пациентке қосылды.",
  "Добавить справку пациенту": "Пациентке анықтама қосу",
  "Выберите тип справки": "Анықтама түрін таңдаңыз",
  "Справка о состоянии здоровья": "Денсаулық жағдайы туралы анықтама",
  "Справка о нетрудоспособности": "Еңбекке жарамсыздық туралы анықтама",
  "Другая медицинская справка": "Басқа медициналық анықтама",
  "Справки, добавленные во время приёма": "Қабылдау кезінде қосылған анықтамалар",
  "Справки во время этого приёма ещё не добавлены.": "Осы қабылдау кезінде анықтамалар әлі қосылмаған.",
  "Отправка кода...": "Код жіберілуде...",
  "Завершить осмотр": "Қарауды аяқтау",
  "Завершение...": "Аяқталуда...",
  "Подтвердить и завершить": "Растау және аяқтау",
  "Название *": "Атауы *",
  "Введите название": "Атауын енгізіңіз",
  "Тип *": "Түрі *",
  "Дата выдачи *": "Берілген күні *",
  "Действителен до": "Жарамды мерзімі",
  "Файл *": "Файл *",
  "Загрузка...": "Жүктелуде...",
  "Загрузка файлов...": "Файлдар жүктелуде...",
  "Медицинский документ": "Медициналық құжат",
  "Открытие...": "Ашылуда...",
  "Открыть": "Ашу",
  "После начала": "Басталғаннан кейін",
  "Загрузка записи пациента...": "Пациент жазбасы жүктелуде...",
  "Приём пациента": "Пациентті қабылдау",
  "Причина обращения": "Жүгіну себебі",
  "Этап 1 из 3": "3 кезеңнің 1-кезеңі",
  "Подтверждение начала приёма": "Қабылдаудың басталуын растау",
  "Загрузка медицинской карты...": "Медициналық карта жүктелуде...",
  "Личные данные": "Жеке деректер",
  "Медицинские сведения": "Медициналық мәліметтер",
  "Файлы до 20 МБ": "20 МБ-қа дейінгі файлдар",
  "Этап 2 из 3": "3 кезеңнің 2-кезеңі",
  "Данные текущего приёма": "Ағымдағы қабылдау деректері",
  "Этап 3 из 3": "3 кезеңнің 3-кезеңі",
  "Завершение осмотра": "Қарауды аяқтау",
  "За 20 минут до записи карта доступна только для просмотра. После правильного кода врач может изменить медицинские сведения и провести приём.": "Жазбаға 20 минут қалғанда карта тек қарауға қолжетімді. Дұрыс код енгізілгеннен кейін дәрігер медициналық мәліметтерді өзгертіп, қабылдауды жүргізе алады.",
  "Личные данные доступны только для чтения. После завершения приёма редактирование карты автоматически закрывается.": "Жеке деректер тек оқуға қолжетімді. Қабылдау аяқталғаннан кейін картаны өңдеу автоматты түрде жабылады.",
  "Медицинская карта пока закрыта": "Медициналық карта әзірге жабық",
  "Карта откроется за 20 минут до начала записи.": "Карта жазба басталғанға 20 минут қалғанда ашылады.",
  "Медицинская карта пациента": "Пациенттің медициналық картасы",
  "ИИН:": "ЖСН: ",
  "Пол:": "Жынысы: ",
  "ФИО, ИИН, дата рождения, пол и Email врач изменить не может.": "Дәрігер аты-жөнін, ЖСН-ды, туған күнін, жынысын және Email-ды өзгерте алмайды.",
  "Я сверил группу крови и резус-фактор с официальным анализом пациента.": "Мен қан тобы мен резус-факторды пациенттің ресми талдауымен салыстырдым.",
  "Документы медицинской карты": "Медициналық карта құжаттары",
  "Анализы, выписки, медицинские изображения, назначения и другие файлы сохраняются в медицинской карте пациента.": "Талдаулар, үзінді көшірмелер, медициналық кескіндер, тағайындаулар және басқа файлдар пациенттің медициналық картасында сақталады.",
  "Добавление документов откроется после правильного кода начала приёма.": "Құжаттарды қосу қабылдауды бастау коды дұрыс енгізілгеннен кейін ашылады.",
  "Заполните жалобы, симптомы, диагноз, лечение, рекомендации и комментарий врача.": "Шағымдарды, белгілерді, диагнозды, емді, ұсынымдарды және дәрігер түсініктемесін толтырыңыз.",
  "Черновик этих полей автоматически сохраняется в браузере. После обновления страницы данные не пропадут.": "Бұл өрістердің жобасы браузерде автоматты түрде сақталады. Бетті жаңартқаннан кейін деректер жоғалмайды.",
  "Эта справка появится у пациента в разделе «Справки».": "Бұл анықтама пациенттің «Анықтамалар» бөлімінде пайда болады.",
  "Сначала сохраните данные приёма и необходимые документы. Затем запросите код завершения у пациента.": "Алдымен қабылдау деректерін және қажетті құжаттарды сақтаңыз. Содан кейін пациенттен аяқтау кодын сұратыңыз.",
  "Код отправлен пациенту. Введите четырёхзначный код для окончательного завершения.": "Код пациентке жіберілді. Қабылдауды түпкілікті аяқтау үшін төрт таңбалы кодты енгізіңіз."
});

let visitEditorLanguage = "ru";

function getVisitEditorLocale() {
  return visitEditorLanguage === "kk" ||
    visitEditorLanguage === "kz"
    ? "kk-KZ"
    : "ru-RU";
}

function tr(value) {
  const source = String(value ?? "");

  if (
    visitEditorLanguage === "kk" ||
    visitEditorLanguage === "kz"
  ) {
    return KK_TRANSLATIONS[source] || source;
  }

  return source;
}

const ACTIVE_VISIT_STORAGE_KEY = "clinic_os_active_visit_id";
const START_STATUSES = [
    "scheduled",
    "confirmed",
];
const ACTIVE_STATUSES = [
    "in_progress",
    "waiting_finish_confirmation",
];
const CERTIFICATE_TYPES = new Set([
    "health_status",
    "sick_leave",
    "medical_certificate",
]);
const FILE_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
    "pdf",
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "txt",
    "csv",
]);
const EMPTY_PROFILE = {
    blood_type: "",
    rh_factor: "",
    allergies: "",
    chronic_conditions: "",
    surgeries: "",
    contraindications: "",
    important_notes: "",
    analyses: "",
};
const EMPTY_UPLOAD_FORM = {
    title: "",
    type: "",
    issueDate: "",
    validUntil: "",
    file: null,
};
function clean(value) {
    return String(value ?? "").trim();
}
function safeArray(value) {
    return Array.isArray(value) ? value : [];
}
function getErrorMessage(error, fallback = tr("Произошла ошибка.")) {
    const message =
        error?.tr(response?.data?.message) ||
        error?.response?.data?.error ||
        error?.message ||
        fallback;

    return tr(message);
}
function getAppointmentFromResponse(response) {
    return (response?.data?.data ||
        response?.data ||
        null);
}
function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function formatDate(value) {
    if (!value) {
        return tr("Не указана");
    }
    const normalized = String(value).length === 10
        ? `${value}T12:00:00`
        : value;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return date.toLocaleDateString(getVisitEditorLocale(), {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}
function formatDateTime(value) {
    if (!value) {
        return tr("Не указано");
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return date.toLocaleString(getVisitEditorLocale(), {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
function formatTime(value) {
    return clean(value).slice(0, 5) || "—";
}
function formatFileSize(value) {
    const size = Number(value);
    if (!Number.isFinite(size) ||
        size <= 0) {
        return "";
    }
    if (size < 1024) {
        return `${size} Б`;
    }
    if (size < 1024 * 1024) {
        return `${Math.round(size / 1024)} КБ`;
    }
    return `${(size /
        (1024 * 1024)).toFixed(1)} МБ`;
}
function getFileExtension(fileName) {
    const parts = clean(fileName)
        .toLowerCase()
        .split(".");
    return parts.length > 1
        ? parts.at(-1)
        : "";
}
function getStatusText(status) {
    const values = {
        scheduled: tr("Запись создана"),
        confirmed: tr("Посещение подтверждено"),
        in_progress: tr("Приём идёт"),
        waiting_finish_confirmation: tr("Ожидается код завершения"),
        completed: tr("Приём завершён"),
        no_show: tr("Пациент не пришёл"),
        cancelled_by_patient: tr("Отменено пациентом"),
        cancelled_by_organization: tr("Отменено организацией"),
    };
    return (values[status] ||
        status || tr("Не указан"));
}
function getStepByStatus(status) {
    if (START_STATUSES.includes(status)) {
        return "start";
    }
    if (status === "in_progress") {
        return "edit";
    }
    if (status ===
        "waiting_finish_confirmation") {
        return "finish";
    }
    if (status === "completed") {
        return "completed";
    }
    return "closed";
}
function getPatientName(appointment) {
    return (clean(appointment?.patient?.full_name) ||
        clean(appointment?.profiles?.full_name) || tr("Пациент"));
}
function getPatientIin(appointment) {
    return (clean(appointment?.patient?.iin) ||
        clean(appointment?.profiles?.iin) || tr("Не указан"));
}
function getPatientPhone(appointment) {
    return (clean(appointment?.patient?.phone) ||
        clean(appointment?.profiles?.phone) || tr("Не указан"));
}
function getGenderText(value) {
    const normalized = clean(value).toLowerCase();
    if (normalized === "male") {
        return tr("Мужской");
    }
    if (normalized === "female") {
        return tr("Женский");
    }
    return clean(value) || tr("Не указан");
}
function getBloodText(value) {
    const labels = {
        "O(I)": "O (I)",
        "A(II)": "A (II)",
        "B(III)": "B (III)",
        "AB(IV)": "AB (IV)",
    };
    return (labels[clean(value)] ||
        clean(value) || tr("Не определена"));
}
function getRhText(value) {
    const normalized = clean(value).toLowerCase();
    if (normalized === "positive") {
        return tr("Положительный (+)");
    }
    if (normalized === "negative") {
        return tr("Отрицательный (-)");
    }
    return tr("Не определён");
}
function findCurrentVisit(visits, appointmentId) {
    return (safeArray(visits).find((visit) => String(visit?.appointment_id || "") === String(appointmentId || "")) || null);
}
function readStorage(key) {
    try {
        return (window.localStorage.getItem(key) ||
            "");
    }
    catch (error) {
        console.error(tr("Ошибка чтения localStorage:"), error);
        return "";
    }
}
function writeStorage(key, value) {
    try {
        window.localStorage.setItem(key, value);
    }
    catch (error) {
        console.error(tr("Ошибка записи localStorage:"), error);
    }
}
function removeStorage(key) {
    try {
        window.localStorage.removeItem(key);
    }
    catch (error) {
        console.error(tr("Ошибка удаления localStorage:"), error);
    }
}
export default function VisitEditor() {
    const [searchParams] = useSearchParams();
    const routeParams = useParams();
    const navigate = useNavigate();
    const { language } = useLanguage();
    visitEditorLanguage = language;
    const medicalFileRef = useRef(null);
    const certificateFileRef = useRef(null);
    const queryAppointmentId = clean(searchParams.get("apptId"));
    const routeAppointmentId = clean(routeParams.appointmentId);
    const storedAppointmentId = clean(readStorage(ACTIVE_VISIT_STORAGE_KEY));
    const appointmentId = queryAppointmentId ||
        routeAppointmentId ||
        storedAppointmentId;
    const draftStorageKey = appointmentId
        ? `clinic_os_visit_draft_${appointmentId}`
        : "";
    const [appointment, setAppointment] = useState(null);
    const [step, setStep] = useState("loading");
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [notice, setNotice] = useState({
        type: "",
        text: "",
    });
    const [startCode, setStartCode] = useState("");
    const [finishCode, setFinishCode] = useState("");
    const [card, setCard] = useState(null);
    const [cardLoading, setCardLoading] = useState(false);
    const [cardLock, setCardLock] = useState(null);
    const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
    const [originalBlood, setOriginalBlood] = useState({
        blood_type: "",
        rh_factor: "",
    });
    const [bloodVerified, setBloodVerified] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [complaints, setComplaints] = useState("");
    const [symptoms, setSymptoms] = useState("");
    const [finalDiagnosis, setFinalDiagnosis] = useState("");
    const [treatment, setTreatment] = useState("");
    const [recommendations, setRecommendations] = useState("");
    const [comment, setComment] = useState("");
    const [savingVisit, setSavingVisit] = useState(false);
    const [currentFiles, setCurrentFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [openingFileId, setOpeningFileId] = useState("");
    const [medicalDocumentForm, setMedicalDocumentForm] = useState({
        ...EMPTY_UPLOAD_FORM,
        issueDate: getLocalDateString(),
    });
    const [certificateForm, setCertificateForm] = useState({
        ...EMPTY_UPLOAD_FORM,
        issueDate: getLocalDateString(),
    });
    const [uploadingMedicalDocument, setUploadingMedicalDocument] = useState(false);
    const [uploadingCertificate, setUploadingCertificate] = useState(false);
    const patientId = clean(appointment?.patient_id);
    const currentAppointmentIsActive = ACTIVE_STATUSES.includes(appointment?.status);
    const activeAppointmentMatches = String(card?.active_appointment_id || "") === String(appointmentId || "");
    const canViewCard = Boolean(card?.permissions?.can_view);
    const canEditCard = Boolean(currentAppointmentIsActive &&
        card?.permissions?.can_edit &&
        activeAppointmentMatches);
    const canManageVisit = Boolean(currentAppointmentIsActive &&
        appointmentId &&
        patientId);
    const bloodChanged = profileForm.blood_type !==
        originalBlood.blood_type ||
        profileForm.rh_factor !==
            originalBlood.rh_factor;
    const allVisibleFiles = useMemo(() => {
        if (currentFiles.length > 0) {
            return currentFiles;
        }
        return safeArray(card?.certificates);
    }, [currentFiles, card?.certificates]);
    const medicalDocuments = useMemo(() => allVisibleFiles.filter((item) => {
        const scope = clean(item?.document_scope);
        if (scope) {
            return scope === "medical_card";
        }
        return !CERTIFICATE_TYPES.has(clean(item?.certificate_type));
    }), [allVisibleFiles]);
    const issuedCertificates = useMemo(() => allVisibleFiles.filter((item) => {
        const scope = clean(item?.document_scope);
        if (scope) {
            return scope === "certificate";
        }
        return CERTIFICATE_TYPES.has(clean(item?.certificate_type));
    }), [allVisibleFiles]);
    const applyDraft = useCallback((baseVisit = {}) => {
        let draft = null;
        if (draftStorageKey) {
            try {
                const rawDraft = readStorage(draftStorageKey);
                draft = rawDraft
                    ? JSON.parse(rawDraft)
                    : null;
            }
            catch (error) {
                console.error(tr("Ошибка чтения черновика:"), error);
            }
        }
        setComplaints(draft?.complaints ??
            baseVisit?.complaints ??
            "");
        setSymptoms(draft?.symptoms ??
            baseVisit?.symptoms ??
            "");
        setFinalDiagnosis(draft?.finalDiagnosis ??
            baseVisit?.final_diagnosis ??
            "");
        setTreatment(draft?.treatment ??
            baseVisit?.treatment ??
            "");
        setRecommendations(draft?.recommendations ??
            baseVisit?.recommendations ??
            "");
        setComment(draft?.comment ??
            baseVisit?.comment ??
            baseVisit?.additional_comment ??
            "");
    }, [draftStorageKey]);
    const applyCard = useCallback((nextCard) => {
        setCard(nextCard);
        setCardLock(null);
        const medical = nextCard?.medical_profile || {};
        setProfileForm({
            blood_type: medical.blood_type || "",
            rh_factor: medical.rh_factor || "",
            allergies: medical.allergies || "",
            chronic_conditions: medical.chronic_conditions || "",
            surgeries: medical.surgeries || "",
            contraindications: medical.contraindications || "",
            important_notes: medical.important_notes || "",
            analyses: medical.analyses || "",
        });
        setOriginalBlood({
            blood_type: medical.blood_type || "",
            rh_factor: medical.rh_factor || "",
        });
        setBloodVerified(false);
        const visit = findCurrentVisit(nextCard?.visits, appointmentId);
        applyDraft(visit || {});
    }, [appointmentId, applyDraft]);
    const loadMedicalCard = useCallback(async (loadedAppointment, silent = false) => {
        const loadedPatientId = clean(loadedAppointment?.patient_id);
        if (!loadedPatientId ||
            !appointmentId) {
            return null;
        }
        if (!silent) {
            setCardLoading(true);
        }
        try {
            const response = await api.get(`/medical-card/${loadedPatientId}`, {
                params: {
                    appointmentId,
                },
            });
            if (!response.data?.success ||
                !response.data?.data) {
                throw new Error(response.data?.message || tr("Не удалось загрузить медицинскую карту."));
            }
            applyCard(response.data.data);
            return response.data.data;
        }
        catch (error) {
            if (error?.response?.status === 403) {
                setCard(null);
                setCardLock(error?.response?.data?.data ||
                    {});
                return null;
            }
            if (!silent) {
                setCard(null);
                setNotice({
                    type: "error",
                    text: getErrorMessage(error, tr("Не удалось загрузить медицинскую карту.")),
                });
            }
            return null;
        }
        finally {
            if (!silent) {
                setCardLoading(false);
            }
        }
    }, [appointmentId, applyCard]);
    const loadCurrentFiles = useCallback(async () => {
        if (!appointmentId ||
            !currentAppointmentIsActive) {
            setCurrentFiles([]);
            return;
        }
        setLoadingFiles(true);
        try {
            const response = await api.get("/certificates", {
                params: {
                    appointmentId,
                },
            });
            setCurrentFiles(safeArray(response?.data?.data));
        }
        catch (error) {
            setCurrentFiles([]);
            setNotice({
                type: "error",
                text: getErrorMessage(error, tr("Не удалось загрузить документы.")),
            });
        }
        finally {
            setLoadingFiles(false);
        }
    }, [
        appointmentId,
        currentAppointmentIsActive,
    ]);
    const loadAppointment = useCallback(async ({ showLoading = true, keepNotice = false, } = {}) => {
        if (!appointmentId) {
            setStep("closed");
            setLoading(false);
            setNotice({
                type: "error",
                text: tr("Не указан идентификатор записи."),
            });
            return null;
        }
        if (showLoading) {
            setLoading(true);
        }
        if (!keepNotice) {
            setNotice({
                type: "",
                text: "",
            });
        }
        try {
            const response = await api.get(`/appointments/${appointmentId}`);
            const loaded = getAppointmentFromResponse(response);
            if (!loaded?.id) {
                throw new Error(tr("Запись на приём не найдена."));
            }
            setAppointment(loaded);
            const nextStep = getStepByStatus(loaded.status);
            setStep(nextStep);
            if (ACTIVE_STATUSES.includes(loaded.status)) {
                writeStorage(ACTIVE_VISIT_STORAGE_KEY, loaded.id);
            }
            else if (loaded.status === "completed") {
                if (readStorage(ACTIVE_VISIT_STORAGE_KEY) === String(loaded.id)) {
                    removeStorage(ACTIVE_VISIT_STORAGE_KEY);
                }
            }
            await loadMedicalCard(loaded);
            return loaded;
        }
        catch (error) {
            setStep("closed");
            setNotice({
                type: "error",
                text: getErrorMessage(error, tr("Не удалось загрузить запись.")),
            });
            return null;
        }
        finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }, [appointmentId, loadMedicalCard]);
    useEffect(() => {
        if (!queryAppointmentId &&
            !routeAppointmentId &&
            storedAppointmentId) {
            navigate(`/doctor/visit/${encodeURIComponent(storedAppointmentId)}`, { replace: true });
        }
    }, [
        queryAppointmentId,
        routeAppointmentId,
        storedAppointmentId,
        navigate,
    ]);
    useEffect(() => {
        loadAppointment();
    }, [loadAppointment]);
    useEffect(() => {
        if (currentAppointmentIsActive) {
            loadCurrentFiles();
        }
        else {
            setCurrentFiles([]);
        }
    }, [
        currentAppointmentIsActive,
        loadCurrentFiles,
    ]);
    useEffect(() => {
        if (!appointment ||
            canViewCard ||
            step !== "start") {
            return undefined;
        }
        const intervalId = window.setInterval(() => {
            if (document.visibilityState ===
                "visible") {
                loadMedicalCard(appointment, true);
            }
        }, 30000);
        return () => window.clearInterval(intervalId);
    }, [
        appointment,
        canViewCard,
        step,
        loadMedicalCard,
    ]);
    useEffect(() => {
        if (!draftStorageKey ||
            !currentAppointmentIsActive) {
            return;
        }
        const timeoutId = window.setTimeout(() => {
            writeStorage(draftStorageKey, JSON.stringify({
                complaints,
                symptoms,
                finalDiagnosis,
                treatment,
                recommendations,
                comment,
                savedAt: new Date().toISOString(),
            }));
        }, 250);
        return () => window.clearTimeout(timeoutId);
    }, [
        draftStorageKey,
        currentAppointmentIsActive,
        complaints,
        symptoms,
        finalDiagnosis,
        treatment,
        recommendations,
        comment,
    ]);
    useEffect(() => {
        if (appointment?.status !==
            "waiting_finish_confirmation" ||
            !appointmentId) {
            return undefined;
        }
        const intervalId = window.setInterval(async () => {
            try {
                const response = await api.get(`/appointments/${appointmentId}`);
                const currentAppointment = getAppointmentFromResponse(response);
                if (currentAppointment?.status !==
                    "completed") {
                    return;
                }
                removeStorage(ACTIVE_VISIT_STORAGE_KEY);
                if (draftStorageKey) {
                    removeStorage(draftStorageKey);
                }
                navigate(`/doctor/patient-card/${encodeURIComponent(currentAppointment.patient_id ||
                    patientId)}`, {
                    replace: true,
                });
            }
            catch (error) {
                console.error(tr("Ошибка проверки статуса приёма:"), error);
            }
        }, 10000);
        return () => window.clearInterval(intervalId);
    }, [
        appointment?.status,
        appointmentId,
        patientId,
        draftStorageKey,
        navigate,
    ]);
    function handleProfileChange(event) {
        const { name, value } = event.target;
        setProfileForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }
    function updateUploadForm(setter, name, value) {
        setter((previous) => ({
            ...previous,
            [name]: value,
        }));
    }
    function handleFileSelection(event, setter) {
        const file = event.target.files?.[0] || null;
        if (!file) {
            updateUploadForm(setter, "file", null);
            return;
        }
        const extension = getFileExtension(file.name);
        if (!ALLOWED_EXTENSIONS.has(extension)) {
            event.target.value = "";
            updateUploadForm(setter, "file", null);
            setNotice({
                type: "error",
                text: tr("Разрешены PDF, изображения, Word, Excel, TXT и CSV."),
            });
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            event.target.value = "";
            updateUploadForm(setter, "file", null);
            setNotice({
                type: "error",
                text: tr("Размер файла не должен превышать 20 МБ."),
            });
            return;
        }
        updateUploadForm(setter, "file", file);
    }
    async function startVisit() {
        if (!canViewCard) {
            setNotice({
                type: "error",
                text: tr("Начать приём можно только после открытия карты за 20 минут до записи."),
            });
            return;
        }
        if (!/^\d{6}$/.test(startCode)) {
            setNotice({
                type: "error",
                text: tr("Введите шестизначный код начала приёма."),
            });
            return;
        }
        setProcessing(true);
        setNotice({ type: "", text: "" });
        try {
            const response = await api.post(`/appointments/${appointmentId}/start`, {
                code: startCode,
            });
            const responseAppointment = getAppointmentFromResponse(response) || {};
            const updated = {
                ...appointment,
                ...responseAppointment,
                id: appointmentId,
                status: "in_progress",
            };
            writeStorage(ACTIVE_VISIT_STORAGE_KEY, appointmentId);
            setAppointment(updated);
            setStep("edit");
            setStartCode("");
            navigate(`/doctor/visit/${encodeURIComponent(appointmentId)}`, { replace: true });
            setNotice({
                type: "success",
                text: tr(response?.data?.message) || tr("Приём успешно начат."),
            });
            await loadMedicalCard(updated);
            await loadCurrentFiles();
        }
        catch (error) {
            setNotice({
                type: "error",
                text: getErrorMessage(error, tr("Не удалось начать приём.")),
            });
        }
        finally {
            setProcessing(false);
        }
    }
    async function saveMedicalProfile(event) {
        event.preventDefault();
        if (!canEditCard || !patientId) {
            return;
        }
        if (bloodChanged) {
            if (!profileForm.blood_type ||
                !profileForm.rh_factor) {
                setNotice({
                    type: "error",
                    text: tr("Выберите группу крови и резус-фактор."),
                });
                return;
            }
            if (!bloodVerified) {
                setNotice({
                    type: "error",
                    text: tr("Подтвердите сверку группы крови с официальным анализом пациента."),
                });
                return;
            }
        }
        setSavingProfile(true);
        setNotice({ type: "", text: "" });
        try {
            const response = await api.patch(`/medical-card/${patientId}/profile`, {
                appointmentId,
                bloodDataVerified: bloodVerified,
                ...profileForm,
            });
            setNotice({
                type: "success",
                text: tr(response?.data?.message) || tr("Медицинская карта сохранена."),
            });
            await loadMedicalCard(appointment);
        }
        catch (error) {
            setNotice({
                type: "error",
                text: getErrorMessage(error, tr("Не удалось сохранить медицинскую карту.")),
            });
        }
        finally {
            setSavingProfile(false);
        }
    }
    function getVisitPayload() {
        return {
            complaints,
            symptoms,
            preliminary_diagnosis: "",
            final_diagnosis: finalDiagnosis,
            treatment,
            recommendations,
            comment,
        };
    }
    function validateVisit() {
        if (!complaints.trim()) {
            return tr("Заполните жалобы пациента.");
        }
        if (!finalDiagnosis.trim()) {
            return tr("Укажите диагноз.");
        }
        if (!treatment.trim()) {
            return tr("Укажите назначенное лечение.");
        }
        return "";
    }
    async function saveVisit(event) {
        event.preventDefault();
        if (!canManageVisit) {
            return;
        }
        setSavingVisit(true);
        setNotice({ type: "", text: "" });
        try {
            const response = await api.put(`/medical-card/${patientId}/visits/${appointmentId}`, getVisitPayload());
            setNotice({
                type: "success",
                text: tr(response?.data?.message) || tr("Данные приёма сохранены."),
            });
            await loadMedicalCard(appointment);
        }
        catch (error) {
            setNotice({
                type: "error",
                text: getErrorMessage(error, tr("Не удалось сохранить данные приёма.")),
            });
        }
        finally {
            setSavingVisit(false);
        }
    }
    async function uploadRecord({ event, form, setForm, setUploading, fileRef, successMessage, documentScope, }) {
        event.preventDefault();
        if (!canManageVisit) {
            setNotice({
                type: "error",
                text: tr("Добавлять файлы и справки можно только во время активного приёма."),
            });
            return;
        }
        if (!form.title.trim() ||
            !form.type ||
            !form.issueDate ||
            !form.file) {
            setNotice({
                type: "error",
                text: tr("Заполните название, тип, дату и выберите файл."),
            });
            return;
        }
        if (form.validUntil &&
            form.validUntil < form.issueDate) {
            setNotice({
                type: "error",
                text: tr("Срок действия не может быть раньше даты выдачи."),
            });
            return;
        }
        setUploading(true);
        setNotice({ type: "", text: "" });
        try {
            const formData = new FormData();
            formData.append("appointmentId", appointmentId);
            formData.append("title", form.title.trim());
            formData.append("certificateType", form.type);
            formData.append("documentScope", documentScope);
            formData.append("issueDate", form.issueDate);
            if (form.validUntil) {
                formData.append("validUntil", form.validUntil);
            }
            formData.append("file", form.file);
            const response = await api.post("/certificates", formData);
            setForm({
                ...EMPTY_UPLOAD_FORM,
                issueDate: getLocalDateString(),
            });
            if (fileRef.current) {
                fileRef.current.value = "";
            }
            await Promise.all([
                loadCurrentFiles(),
                loadMedicalCard(appointment),
            ]);
            setNotice({
                type: "success",
                text: tr(response?.data?.message) ||
                    successMessage,
            });
        }
        catch (error) {
            setNotice({
                type: "error",
                text: getErrorMessage(error, tr("Не удалось загрузить файл.")),
            });
        }
        finally {
            setUploading(false);
        }
    }
    async function openFile(item) {
        if (!item?.id) {
            return;
        }
        if (!currentAppointmentIsActive) {
            setNotice({
                type: "info",
                text: tr("Открытие файла доступно во время активного приёма."),
            });
            return;
        }
        setOpeningFileId(item.id);
        try {
            const response = await api.get(`/certificates/${item.id}/download`);
            const signedUrl = response?.data?.data?.signedUrl;
            if (!signedUrl) {
                throw new Error(tr("Ссылка на файл не получена."));
            }
            window.open(signedUrl, "_blank", "noopener,noreferrer");
        }
        catch (error) {
            setNotice({
                type: "error",
                text: getErrorMessage(error, tr("Не удалось открыть файл.")),
            });
        }
        finally {
            setOpeningFileId("");
        }
    }
    async function requestFinish() {
        const validationError = validateVisit();
        if (validationError) {
            setNotice({
                type: "error",
                text: validationError,
            });
            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
            return;
        }
        if (!canManageVisit) {
            setNotice({
                type: "error",
                text: tr("Эта запись больше не находится в активном состоянии."),
            });
            return;
        }
        /*
         * Если врач изменил группу крови,
         * обязательно требуется подтверждение.
         */
        if (canEditCard &&
            bloodChanged) {
            if (!profileForm.blood_type ||
                !profileForm.rh_factor) {
                setNotice({
                    type: "error",
                    text: tr("Выберите группу крови и резус-фактор."),
                });
                return;
            }
            if (!bloodVerified) {
                setNotice({
                    type: "error",
                    text: tr("Подтвердите сверку группы крови с официальным анализом пациента."),
                });
                return;
            }
        }
        setProcessing(true);
        setNotice({
            type: "",
            text: "",
        });
        try {
            /*
             * Сохраняем изменения медицинской карты.
             */
            if (canEditCard) {
                await api.patch(`/medical-card/${patientId}/profile`, {
                    appointmentId,
                    bloodDataVerified: bloodVerified,
                    ...profileForm,
                });
            }
            /*
             * Обязательно сохраняем все данные
             * текущего приёма до отправки кода.
             */
            await api.put(`/medical-card/${patientId}/visits/${appointmentId}`, getVisitPayload());
            /*
             * После этого создаём код завершения.
             */
            const response = await api.post(`/appointments/${appointmentId}/request-finish`);
            const updated = {
                ...appointment,
                status: "waiting_finish_confirmation",
            };
            setAppointment(updated);
            setStep("finish");
            writeStorage(ACTIVE_VISIT_STORAGE_KEY, appointmentId);
            setNotice({
                type: "success",
                text: `${tr(response?.data?.message) ||
                    tr("Код завершения отправлен пациенту.")} ${tr("Если код не будет введён в течение 10 минут, приём завершится автоматически.")}`,
            });
            await loadMedicalCard(updated);
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: "smooth",
            });
        }
        catch (error) {
            setNotice({
                type: "error",
                text: getErrorMessage(error, tr("Не удалось запросить код завершения.")),
            });
        }
        finally {
            setProcessing(false);
        }
    }
    async function finishVisit() {
        if (!/^\d{4}$/.test(finishCode)) {
            setNotice({
                type: "error",
                text: tr("Введите четырёхзначный код завершения."),
            });
            return;
        }
        const validationError = validateVisit();
        if (validationError) {
            setNotice({
                type: "error",
                text: validationError,
            });
            return;
        }
        setProcessing(true);
        setNotice({ type: "", text: "" });
        try {
            const response = await api.post(`/appointments/${appointmentId}/finish`, {
                code: finishCode,
                complaints: complaints.trim(),
                symptoms: symptoms.trim(),
                preliminaryDiagnosis: "",
                finalDiagnosis: finalDiagnosis.trim(),
                treatment: treatment.trim(),
                recommendations: recommendations.trim(),
                comment: comment.trim(),
            });
            removeStorage(ACTIVE_VISIT_STORAGE_KEY);
            if (draftStorageKey) {
                removeStorage(draftStorageKey);
            }
            setFinishCode("");
            setCard(null);
            setCurrentFiles([]);
            setStep("completed");
            setNotice({
                type: "success",
                text: tr(response?.data?.message) || tr("Приём успешно завершён."),
            });
            navigate(`/doctor/patient-card/${encodeURIComponent(patientId)}`, { replace: true });
        }
        catch (error) {
            setNotice({
                type: "error",
                text: getErrorMessage(error, tr("Не удалось завершить приём.")),
            });
        }
        finally {
            setProcessing(false);
        }
    }
    function goBackToCalendar() {
        if (currentAppointmentIsActive) {
            setNotice({
                type: "info",
                text: tr("Сначала завершите текущий приём. При обновлении страницы он не пропадёт."),
            });
            return;
        }
        navigate("/doctor");
    }
    if (loading) {
        return (<div style={styles.page}>
        <div style={styles.card}>{tr("Загрузка записи пациента...")}</div>
      </div>);
    }
    const profile = card?.profile || {};
    return (<div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>{tr("Приём пациента")}</h1>

          <p style={styles.subtitle}>{tr("За 20 минут до записи карта доступна только для просмотра. После правильного кода врач может изменить медицинские сведения и провести приём.")}</p>
        </div>

        <button type="button" onClick={goBackToCalendar} style={{
            ...styles.secondaryButton,
            ...(currentAppointmentIsActive
                ? styles.disabledButton
                : {}),
        }}>
          {currentAppointmentIsActive
            ? tr("Сначала завершите приём") : tr("Вернуться в календарь")}
        </button>
      </header>

      {notice.text && (<div style={{
                ...styles.alert,
                ...(notice.type === "error"
                    ? styles.errorAlert
                    : notice.type === "info"
                        ? styles.infoAlert
                        : styles.successAlert),
            }}>
          {notice.text}
        </div>)}

      {appointment && (<div style={styles.layout}>
          <aside style={styles.ticket}>
            <div style={styles.avatar}>
              {getPatientName(appointment)
                .slice(0, 1)
                .toUpperCase()}
            </div>

            <h2 style={styles.patientName}>
              {getPatientName(appointment)}
            </h2>

            <InfoRow label={tr("ИИН")} value={getPatientIin(appointment)}/>

            <InfoRow label={tr("Телефон")} value={getPatientPhone(appointment)}/>

            <InfoRow label={tr("Дата")} value={formatDate(appointment.date)}/>

            <InfoRow label={tr("Время")} value={formatTime(appointment.time)}/>

            <InfoRow label={tr("Статус")} value={getStatusText(appointment.status)}/>

            <div style={styles.reasonBox}>
              <span style={styles.smallLabel}>{tr("Причина обращения")}</span>

              <p style={styles.reasonText}>
                {clean(appointment.reason) || tr("Не указана")}
              </p>
            </div>

            <div style={styles.warningBox}>{tr("Личные данные доступны только для чтения. После завершения приёма редактирование карты автоматически закрывается.")}</div>
          </aside>

          <main style={styles.mainColumn}>
            {step === "start" && (<section style={styles.card}>
                <span style={styles.stepBadge}>{tr("Этап 1 из 3")}</span>

                <h2 style={styles.sectionTitle}>{tr("Подтверждение начала приёма")}</h2>

                <p style={styles.subtitle}>
                  {canViewCard
                    ? tr("Введите шестизначный код пациента. До правильного кода медицинская карта доступна только для просмотра.") : tr("Карта и ввод кода откроются за 20 минут до назначенного времени.")}
                </p>

                <div style={styles.codeRow}>
                  <input value={startCode} onChange={(event) => setStartCode(event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6))} inputMode="numeric" placeholder="000000" style={styles.codeInput}/>

                  <button type="button" onClick={startVisit} disabled={processing ||
                    startCode.length !== 6 ||
                    !canViewCard} style={{
                    ...styles.primaryButton,
                    ...(processing ||
                        startCode.length !== 6 ||
                        !canViewCard
                        ? styles.disabledButton
                        : {}),
                }}>
                    {processing
                    ? tr("Проверка...") : tr("Начать приём")}
                  </button>
                </div>
              </section>)}

            {cardLoading ? (<section style={styles.card}>{tr("Загрузка медицинской карты...")}</section>) : cardLock ? (<section style={styles.lockedCard}>
                <div style={styles.lockIcon}>
                  🔒
                </div>

                <h2 style={styles.sectionTitle}>{tr("Медицинская карта пока закрыта")}</h2>

                <p style={styles.subtitle}>{tr("Карта откроется за 20 минут до начала записи.")}</p>

                <div style={styles.lockInfo}>
                  <InfoRow label={tr("Дата")} value={formatDate(appointment.date)}/>

                  <InfoRow label={tr("Время")} value={formatTime(appointment.time)}/>

                  <InfoRow label={tr("Откроется")} value={cardLock?.view_available_at
                    ? formatDateTime(cardLock.view_available_at)
                    : tr("За 20 минут")}/>

                  {Number(cardLock?.minutes_until_view) > 0 && (<InfoRow label={tr("Осталось")} value={`${cardLock.minutes_until_view} мин.`}/>)}
                </div>
              </section>) : card ? (<>
                <section style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div style={styles.avatar}>
                      {clean(profile.full_name)
                    .slice(0, 1)
                    .toUpperCase() || tr("П")}
                    </div>

                    <div style={{ flex: 1 }}>
                      <h2 style={{
                    margin: "0 0 4px",
                }}>{tr("Медицинская карта пациента")}</h2>

                      <strong>
                        {profile.full_name || tr("Пациент")}
                      </strong>

                      <div style={styles.patientMeta}>
                        <span>{tr("ИИН:")}{profile.iin || tr("не указан")}
                        </span>

                        <span>{tr("Пол:")}{getGenderText(profile.gender)}
                        </span>
                      </div>
                    </div>

                    <span style={{
                    ...styles.accessBadge,
                    ...(canEditCard
                        ? styles.editAccessBadge
                        : styles.viewAccessBadge),
                }}>
                      {canEditCard
                    ? tr("Редактирование разрешено") : tr("Только просмотр")}
                    </span>
                  </div>

                  <div style={styles.sectionBlock}>
                    <h3 style={styles.sectionTitle}>{tr("Личные данные")}</h3>

                    <p style={styles.subtitle}>{tr("ФИО, ИИН, дата рождения, пол и Email врач изменить не может.")}</p>

                    <div style={styles.infoGrid}>
                      <ReadOnlyField label={tr("ФИО")} value={profile.full_name}/>

                      <ReadOnlyField label={tr("ИИН")} value={profile.iin}/>

                      <ReadOnlyField label={tr("Дата рождения")} value={formatDate(profile.birth_date)}/>

                      <ReadOnlyField label={tr("Пол")} value={getGenderText(profile.gender)}/>

                      <ReadOnlyField label="Email" value={profile.email}/>
                    </div>
                  </div>

                  <form onSubmit={saveMedicalProfile} style={styles.sectionBlock}>
                    <h3 style={styles.sectionTitle}>{tr("Медицинские сведения")}</h3>

                    <div style={styles.twoColumnGrid}>
                      {canEditCard ? (<>
                          <SelectField label={tr("Группа крови")} name="blood_type" value={profileForm.blood_type} onChange={handleProfileChange} options={[
                        ["", tr("Не определена")],
                        ["O(I)", "O (I)"],
                        ["A(II)", "A (II)"],
                        ["B(III)", "B (III)"],
                        ["AB(IV)", "AB (IV)"],
                    ]}/>

                          <SelectField label={tr("Резус-фактор")} name="rh_factor" value={profileForm.rh_factor} onChange={handleProfileChange} options={[
                        ["", tr("Не определён")],
                        [
                            "positive",
                            tr("Положительный (+)"),
                        ],
                        [
                            "negative",
                            tr("Отрицательный (-)"),
                        ],
                    ]}/>
                        </>) : (<>
                          <ReadOnlyField label={tr("Группа крови")} value={getBloodText(profileForm.blood_type)}/>

                          <ReadOnlyField label={tr("Резус-фактор")} value={getRhText(profileForm.rh_factor)}/>
                        </>)}
                    </div>

                    {canEditCard &&
                    bloodChanged && (<label style={styles.verificationBox}>
                          <input type="checkbox" checked={bloodVerified} onChange={(event) => setBloodVerified(event.target.checked)}/>

                          <span>{tr("Я сверил группу крови и резус-фактор с официальным анализом пациента.")}</span>
                        </label>)}

                    <TextField label={tr("Аллергии")} name="allergies" value={profileForm.allergies} onChange={handleProfileChange} disabled={!canEditCard}/>

                    <TextField label={tr("Хронические заболевания")} name="chronic_conditions" value={profileForm.chronic_conditions} onChange={handleProfileChange} disabled={!canEditCard} placeholder={tr("Можно указать несколько заболеваний с новой строки")}/>

                    <TextField label={tr("Перенесённые операции")} name="surgeries" value={profileForm.surgeries} onChange={handleProfileChange} disabled={!canEditCard}/>

                    <TextField label={tr("Противопоказания")} name="contraindications" value={profileForm.contraindications} onChange={handleProfileChange} disabled={!canEditCard}/>

                    <TextField label={tr("Дополнительная важная информация")} name="important_notes" value={profileForm.important_notes} onChange={handleProfileChange} disabled={!canEditCard}/>

                    <TextField label={tr("Анализы и результаты обследований")} name="analyses" value={profileForm.analyses} onChange={handleProfileChange} disabled={!canEditCard} rows={6}/>

                    {canEditCard && (<button type="submit" disabled={savingProfile} style={{
                        ...styles.saveButton,
                        ...(savingProfile
                            ? styles.disabledButton
                            : {}),
                    }}>
                        {savingProfile
                        ? tr("Сохранение...") : tr("Сохранить медицинскую карту")}
                      </button>)}
                  </form>
                </section>

                <section style={styles.card}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <h2 style={styles.sectionTitle}>{tr("Документы медицинской карты")}</h2>

                      <p style={styles.subtitle}>{tr("Анализы, выписки, медицинские изображения, назначения и другие файлы сохраняются в медицинской карте пациента.")}</p>
                    </div>

                    <span style={styles.fileBadge}>{tr("Файлы до 20 МБ")}</span>
                  </div>

                  {canEditCard ? (<UploadForm form={medicalDocumentForm} setForm={setMedicalDocumentForm} fileRef={medicalFileRef} onFileChange={(event) => handleFileSelection(event, setMedicalDocumentForm)} onSubmit={(event) => uploadRecord({
                        event,
                        form: medicalDocumentForm,
                        setForm: setMedicalDocumentForm,
                        setUploading: setUploadingMedicalDocument,
                        fileRef: medicalFileRef,
                        successMessage: tr("Документ добавлен в медицинскую карту."),
                        documentScope: "medical_card",
                    })} uploading={uploadingMedicalDocument} submitText={tr("Добавить документ в медкарту")} typeOptions={[
                        [
                            "",
                            tr("Выберите тип"),
                        ],
                        [
                            "examination_result",
                            tr("Анализ или обследование"),
                        ],
                        [
                            "image",
                            tr("Медицинское изображение"),
                        ],
                        [
                            "prescription",
                            tr("Назначение или рецепт"),
                        ],
                        [
                            "other",
                            tr("Другой документ медкарты"),
                        ],
                    ]}/>) : (<div style={styles.readOnlyNotice}>{tr("Добавление документов откроется после правильного кода начала приёма.")}</div>)}

                  <FileList title={tr("Документы в медицинской карте")} items={medicalDocuments} loading={loadingFiles} canOpen={currentAppointmentIsActive} openingFileId={openingFileId} onOpen={openFile} emptyText={tr("Документы медицинской карты пока не добавлены.")}/>
                </section>

                {canManageVisit && (<>
                    <form onSubmit={saveVisit} style={styles.card}>
                      <span style={styles.stepBadge}>{tr("Этап 2 из 3")}</span>

                      <h2 style={styles.sectionTitle}>{tr("Данные текущего приёма")}</h2>

                      <p style={styles.subtitle}>{tr("Заполните жалобы, симптомы, диагноз, лечение, рекомендации и комментарий врача.")}</p>

                      <TextField label={tr("Жалобы пациента *")} value={complaints} onChange={(event) => setComplaints(event.target.value)}/>

                      <TextField label={tr("Симптомы")} value={symptoms} onChange={(event) => setSymptoms(event.target.value)}/>

                      <TextField label={tr("Диагноз *")} value={finalDiagnosis} onChange={(event) => setFinalDiagnosis(event.target.value)}/>

                      <TextField label={tr("Назначенное лечение *")} value={treatment} onChange={(event) => setTreatment(event.target.value)}/>

                      <TextField label={tr("Рекомендации")} value={recommendations} onChange={(event) => setRecommendations(event.target.value)}/>

                      <TextField label={tr("Дополнительный комментарий")} value={comment} onChange={(event) => setComment(event.target.value)}/>

                      <button type="submit" disabled={savingVisit} style={{
                        ...styles.saveButton,
                        ...(savingVisit
                            ? styles.disabledButton
                            : {}),
                    }}>
                        {savingVisit
                        ? tr("Сохранение...") : tr("Сохранить данные приёма")}
                      </button>

                      <p style={styles.draftText}>{tr("Черновик этих полей автоматически сохраняется в браузере. После обновления страницы данные не пропадут.")}</p>
                    </form>

                    <section style={styles.card}>
                      <div style={styles.sectionHeader}>
                        <div>
                          <h2 style={styles.sectionTitle}>{tr("Добавить справку пациенту")}</h2>

                          <p style={styles.subtitle}>{tr("Эта справка появится у пациента в разделе «Справки».")}</p>
                        </div>
                      </div>

                      <UploadForm form={certificateForm} setForm={setCertificateForm} fileRef={certificateFileRef} onFileChange={(event) => handleFileSelection(event, setCertificateForm)} onSubmit={(event) => uploadRecord({
                        event,
                        form: certificateForm,
                        setForm: setCertificateForm,
                        setUploading: setUploadingCertificate,
                        fileRef: certificateFileRef,
                        successMessage: tr("Справка добавлена пациенту."),
                        documentScope: "certificate",
                    })} uploading={uploadingCertificate} submitText={tr("Добавить справку пациенту")} typeOptions={[
                        [
                            "",
                            tr("Выберите тип справки"),
                        ],
                        [
                            "health_status",
                            tr("Справка о состоянии здоровья"),
                        ],
                        [
                            "sick_leave",
                            tr("Справка о нетрудоспособности"),
                        ],
                        [
                            "medical_certificate",
                            tr("Другая медицинская справка"),
                        ],
                    ]}/>

                      <FileList title={tr("Справки, добавленные во время приёма")} items={issuedCertificates} loading={loadingFiles} canOpen={currentAppointmentIsActive} openingFileId={openingFileId} onOpen={openFile} emptyText={tr("Справки во время этого приёма ещё не добавлены.")}/>
                    </section>

                    <section style={styles.finishCard}>
                      <div>
                        <span style={styles.stepBadge}>{tr("Этап 3 из 3")}</span>

                        <h2 style={{
                        margin: "0 0 6px",
                    }}>{tr("Завершение осмотра")}</h2>

                        <p style={styles.subtitle}>{tr("Сначала сохраните данные приёма и необходимые документы. Затем запросите код завершения у пациента.")}</p>
                      </div>

                      {step === "edit" ? (<button type="button" onClick={requestFinish} disabled={processing} style={{
                            ...styles.saveButton,
                            ...(processing
                                ? styles.disabledButton
                                : {}),
                        }}>
                          {processing
                            ? tr("Отправка кода...") : tr("Завершить осмотр")}
                        </button>) : (<div style={styles.finishCodeBox}>
                          <p style={styles.subtitle}>{tr("Код отправлен пациенту. Введите четырёхзначный код для окончательного завершения.")}</p>

                          <div style={styles.codeRow}>
                            <input value={finishCode} onChange={(event) => setFinishCode(event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 4))} inputMode="numeric" placeholder="0000" style={styles.codeInput}/>

                            <button type="button" onClick={finishVisit} disabled={processing ||
                            finishCode.length !== 4} style={{
                            ...styles.saveButton,
                            ...(processing ||
                                finishCode.length !== 4
                                ? styles.disabledButton
                                : {}),
                        }}>
                              {processing
                            ? tr("Завершение...") : tr("Подтвердить и завершить")}
                            </button>
                          </div>
                        </div>)}
                    </section>
                  </>)}
              </>) : null}
          </main>
        </div>)}
    </div>);
}
function InfoRow({ label, value }) {
    return (<div style={styles.infoRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>);
}
function ReadOnlyField({ label, value, }) {
    return (<div style={styles.readOnlyField}>
      <span style={styles.smallLabel}>
        {label}
      </span>

      <strong>{value || tr("Не указано")}</strong>
    </div>);
}
function Field({ label, children }) {
    return (<label style={styles.field}>
      <span>{label}</span>
      {children}
    </label>);
}
function InputField({ label, ...props }) {
    return (<Field label={label}>
      <input {...props} style={styles.input}/>
    </Field>);
}
function SelectField({ label, options, ...props }) {
    return (<Field label={label}>
      <select {...props} style={styles.input}>
        {options.map(([value, text]) => (<option key={value || "empty"} value={value}>
            {text}
          </option>))}
      </select>
    </Field>);
}
function TextField({ label, rows = 4, disabled = false, ...props }) {
    return (<Field label={label}>
      <textarea rows={rows} maxLength={5000} disabled={disabled} {...props} style={{
            ...styles.textarea,
            ...(disabled
                ? styles.disabledInput
                : {}),
        }}/>
    </Field>);
}
function UploadForm({ form, setForm, fileRef, onFileChange, onSubmit, uploading, submitText, typeOptions, }) {
    return (<form onSubmit={onSubmit} style={styles.uploadForm}>
      <div style={styles.twoColumnGrid}>
        <InputField label={tr("Название *")} value={form.title} onChange={(event) => setForm((previous) => ({
            ...previous,
            title: event.target.value,
        }))} placeholder={tr("Введите название")}/>

        <SelectField label={tr("Тип *")} value={form.type} onChange={(event) => setForm((previous) => ({
            ...previous,
            type: event.target.value,
        }))} options={typeOptions}/>

        <InputField label={tr("Дата выдачи *")} type="date" value={form.issueDate} onChange={(event) => setForm((previous) => ({
            ...previous,
            issueDate: event.target.value,
        }))}/>

        <InputField label={tr("Действителен до")} type="date" min={form.issueDate} value={form.validUntil} onChange={(event) => setForm((previous) => ({
            ...previous,
            validUntil: event.target.value,
        }))}/>
      </div>

      <Field label={tr("Файл *")}>
        <input ref={fileRef} type="file" accept={FILE_ACCEPT} onChange={onFileChange} style={styles.fileInput}/>

        {form.file && (<small style={styles.fileMeta}>
            {form.file.name} ·{" "}
            {formatFileSize(form.file.size)}
          </small>)}
      </Field>

      <button type="submit" disabled={uploading} style={{
            ...styles.primaryButton,
            ...(uploading
                ? styles.disabledButton
                : {}),
        }}>
        {uploading
            ? tr("Загрузка...") : submitText}
      </button>
    </form>);
}
function FileList({ title, items, loading, canOpen, openingFileId, onOpen, emptyText, }) {
    return (<div style={styles.fileListBlock}>
      <div style={styles.divider}/>

      <h3 style={styles.sectionTitle}>
        {title}
      </h3>

      {loading ? (<EmptyState text={tr("Загрузка файлов...")}/>) : items.length === 0 ? (<EmptyState text={emptyText}/>) : (<div style={styles.documentList}>
          {items.map((item) => (<article key={item.id} style={styles.documentItem}>
              <div style={{
                    flex: 1,
                    minWidth: 0,
                }}>
                <strong>
                  {item.title || tr("Медицинский документ")}
                </strong>

                <span style={styles.fileMeta}>
                  {formatDate(item.issue_date ||
                    item.created_at)}

                  {item.file_name
                    ? ` · ${item.file_name}`
                    : ""}
                </span>
              </div>

              <button type="button" onClick={() => onOpen(item)} disabled={!canOpen ||
                    openingFileId === item.id} style={{
                    ...styles.secondaryButton,
                    ...(!canOpen
                        ? styles.disabledButton
                        : {}),
                }}>
                {openingFileId === item.id
                    ? tr("Открытие...") : canOpen
                    ? tr("Открыть") : tr("После начала")}
              </button>
            </article>))}
        </div>)}
    </div>);
}
function EmptyState({ text }) {
    return (<div style={styles.emptyState}>
      {text}
    </div>);
}
const styles = {
    page: {
        padding: "34px",
        color: "#ffffff",
        fontFamily: "'Outfit', 'Inter', sans-serif",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: "18px",
        marginBottom: "20px",
    },
    title: {
        margin: "0 0 6px",
        fontSize: "32px",
        fontWeight: 800,
    },
    subtitle: {
        margin: 0,
        color: "#94a3b8",
        fontSize: "13px",
        lineHeight: 1.55,
    },
    layout: {
        display: "grid",
        gridTemplateColumns: "minmax(270px, 340px) minmax(0, 1fr)",
        gap: "20px",
        alignItems: "start",
        maxWidth: "1450px",
    },
    mainColumn: {
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: "18px",
    },
    ticket: {
        position: "sticky",
        top: "18px",
        padding: "22px",
        borderRadius: "18px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(30,41,59,0.5)",
    },
    avatar: {
        width: "56px",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        borderRadius: "16px",
        background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
        fontSize: "24px",
        fontWeight: 800,
    },
    patientName: {
        margin: "14px 0 16px",
        fontSize: "19px",
    },
    infoRow: {
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        padding: "9px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        color: "#cbd5e1",
        fontSize: "12px",
    },
    reasonBox: {
        marginTop: "15px",
        padding: "13px",
        borderRadius: "11px",
        background: "rgba(2,6,23,0.28)",
    },
    reasonText: {
        margin: "7px 0 0",
        color: "#cbd5e1",
        fontSize: "13px",
    },
    warningBox: {
        marginTop: "14px",
        padding: "12px",
        borderRadius: "10px",
        border: "1px solid rgba(245,158,11,0.24)",
        background: "rgba(245,158,11,0.08)",
        color: "#fde68a",
        fontSize: "11px",
        lineHeight: 1.5,
    },
    card: {
        padding: "24px",
        borderRadius: "18px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(30,41,59,0.5)",
    },
    lockedCard: {
        padding: "34px",
        borderRadius: "18px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(30,41,59,0.5)",
        textAlign: "center",
    },
    lockIcon: {
        marginBottom: "12px",
        fontSize: "42px",
    },
    lockInfo: {
        maxWidth: "500px",
        margin: "20px auto 0",
    },
    cardHeader: {
        display: "flex",
        alignItems: "center",
        gap: "14px",
        flexWrap: "wrap",
        paddingBottom: "20px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
    },
    patientMeta: {
        display: "flex",
        flexWrap: "wrap",
        gap: "6px 16px",
        marginTop: "5px",
        color: "#94a3b8",
        fontSize: "11px",
    },
    accessBadge: {
        marginLeft: "auto",
        padding: "6px 10px",
        borderRadius: "999px",
        border: "1px solid",
        fontSize: "10px",
        fontWeight: 800,
    },
    editAccessBadge: {
        color: "#6ee7b7",
        borderColor: "rgba(52,211,153,0.35)",
        background: "rgba(5,150,105,0.13)",
    },
    viewAccessBadge: {
        color: "#cbd5e1",
        borderColor: "rgba(148,163,184,0.25)",
        background: "rgba(100,116,139,0.1)",
    },
    sectionBlock: {
        marginTop: "18px",
        padding: "18px",
        borderRadius: "14px",
        background: "rgba(15,23,42,0.28)",
    },
    sectionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: "14px",
    },
    sectionTitle: {
        margin: "0 0 8px",
        fontSize: "21px",
    },
    infoGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "10px",
        marginTop: "16px",
    },
    twoColumnGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "12px",
    },
    readOnlyField: {
        minHeight: "60px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "5px",
        padding: "12px",
        borderRadius: "10px",
        border: "1px solid rgba(148,163,184,0.12)",
        background: "rgba(15,23,42,0.5)",
        color: "#e2e8f0",
    },
    smallLabel: {
        color: "#64748b",
        fontSize: "9px",
        fontWeight: 800,
        textTransform: "uppercase",
    },
    field: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        marginBottom: "14px",
        color: "#cbd5e1",
        fontSize: "12px",
        fontWeight: 700,
    },
    input: {
        width: "100%",
        minHeight: "42px",
        boxSizing: "border-box",
        padding: "10px 12px",
        borderRadius: "9px",
        border: "1px solid rgba(148,163,184,0.13)",
        outline: "none",
        background: "#11182e",
        color: "#ffffff",
        colorScheme: "dark",
    },
    textarea: {
        width: "100%",
        boxSizing: "border-box",
        padding: "11px 12px",
        borderRadius: "9px",
        border: "1px solid rgba(148,163,184,0.13)",
        outline: "none",
        resize: "vertical",
        background: "#11182e",
        color: "#ffffff",
        fontFamily: "inherit",
        lineHeight: 1.5,
    },
    disabledInput: {
        opacity: 0.88,
        cursor: "not-allowed",
        background: "rgba(15,23,42,0.6)",
    },
    verificationBox: {
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        marginBottom: "14px",
        padding: "11px",
        borderRadius: "9px",
        border: "1px solid rgba(52,211,153,0.22)",
        background: "rgba(5,150,105,0.09)",
        color: "#a7f3d0",
        fontSize: "11px",
        lineHeight: 1.5,
    },
    uploadForm: {
        marginTop: "18px",
        padding: "17px",
        borderRadius: "13px",
        background: "rgba(15,23,42,0.28)",
    },
    fileInput: {
        width: "100%",
        boxSizing: "border-box",
        padding: "11px",
        borderRadius: "9px",
        border: "1px dashed rgba(56,189,248,0.35)",
        background: "rgba(2,6,23,0.25)",
        color: "#cbd5e1",
    },
    fileBadge: {
        padding: "7px 11px",
        borderRadius: "999px",
        background: "rgba(56,189,248,0.12)",
        color: "#bae6fd",
        fontSize: "11px",
        fontWeight: 700,
    },
    fileMeta: {
        display: "block",
        marginTop: "4px",
        color: "#94a3b8",
        fontSize: "10px",
        overflowWrap: "anywhere",
    },
    fileListBlock: {
        marginTop: "20px",
    },
    readOnlyNotice: {
        marginTop: "16px",
        padding: "13px",
        borderRadius: "10px",
        border: "1px solid rgba(148,163,184,0.17)",
        background: "rgba(100,116,139,0.08)",
        color: "#94a3b8",
        fontSize: "12px",
    },
    divider: {
        height: "1px",
        margin: "24px 0",
        background: "rgba(255,255,255,0.07)",
    },
    documentList: {
        display: "flex",
        flexDirection: "column",
        gap: "9px",
    },
    documentItem: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "13px",
        borderRadius: "11px",
        border: "1px solid rgba(148,163,184,0.08)",
        background: "rgba(15,23,42,0.43)",
    },
    emptyState: {
        padding: "24px",
        borderRadius: "10px",
        background: "rgba(2,6,23,0.24)",
        color: "#94a3b8",
        textAlign: "center",
    },
    stepBadge: {
        display: "inline-block",
        marginBottom: "12px",
        padding: "5px 9px",
        borderRadius: "999px",
        background: "rgba(99,102,241,0.16)",
        color: "#c7d2fe",
        fontSize: "11px",
        fontWeight: 700,
    },
    codeRow: {
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        marginTop: "18px",
    },
    codeInput: {
        width: "280px",
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: "15px",
        borderRadius: "11px",
        border: "1px solid rgba(99,102,241,0.4)",
        outline: "none",
        background: "#11182e",
        color: "#ffffff",
        fontSize: "26px",
        letterSpacing: "9px",
        textAlign: "center",
    },
    primaryButton: {
        minHeight: "44px",
        padding: "0 18px",
        border: "none",
        borderRadius: "10px",
        background: "linear-gradient(90deg,#4f46e5,#6366f1)",
        color: "#ffffff",
        fontWeight: 800,
        cursor: "pointer",
    },
    secondaryButton: {
        minHeight: "40px",
        padding: "0 14px",
        borderRadius: "9px",
        border: "1px solid rgba(99,102,241,0.3)",
        background: "rgba(99,102,241,0.1)",
        color: "#c7d2fe",
        cursor: "pointer",
    },
    saveButton: {
        minHeight: "44px",
        padding: "0 18px",
        border: "none",
        borderRadius: "10px",
        background: "linear-gradient(90deg,#059669,#10b981)",
        color: "#ffffff",
        fontWeight: 800,
        cursor: "pointer",
    },
    disabledButton: {
        opacity: 0.5,
        cursor: "not-allowed",
    },
    finishCard: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "18px",
        padding: "23px",
        borderRadius: "18px",
        border: "1px solid rgba(16,185,129,0.28)",
        background: "linear-gradient(135deg,rgba(16,185,129,0.11),rgba(30,41,59,0.48))",
    },
    finishCodeBox: {
        minWidth: "320px",
        maxWidth: "620px",
    },
    draftText: {
        margin: "12px 0 0",
        color: "#64748b",
        fontSize: "10px",
        lineHeight: 1.5,
    },
    alert: {
        marginBottom: "18px",
        padding: "12px 15px",
        borderRadius: "10px",
        border: "1px solid",
    },
    errorAlert: {
        color: "#fca5a5",
        borderColor: "rgba(239,68,68,0.3)",
        background: "rgba(239,68,68,0.1)",
    },
    successAlert: {
        color: "#6ee7b7",
        borderColor: "rgba(16,185,129,0.3)",
        background: "rgba(16,185,129,0.1)",
    },
    infoAlert: {
        color: "#bae6fd",
        borderColor: "rgba(56,189,248,0.3)",
        background: "rgba(56,189,248,0.1)",
    },
};
