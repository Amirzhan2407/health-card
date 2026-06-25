
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../api/api";
import { useLanguage } from "../../i18n/LanguageContext";

import {
  RiCalendarLine,
  RiEditLine,
  RiFileTextLine,
  RiHeartPulseLine,
  RiHospitalLine,
  RiLockLine,
  RiRefreshLine,
  RiSaveLine,
  RiSearchLine,
  RiStethoscopeLine,
  RiTimeLine,
  RiUserHeartLine,
} from "react-icons/ri";


const KAZAKH_TRANSLATIONS = {
  "Запись создана": "Жазба жасалды",
  "Посещение подтверждено": "Қабылдау расталды",
  "Приём идёт": "Қабылдау жүріп жатыр",
  "Ожидается завершение": "Аяқтау расталуын күтуде",
  "Приём завершён": "Қабылдау аяқталды",
  "Неявка": "Келмеді",
  "Запись отменена": "Жазба жойылды",
  "Отменена пациентом": "Пациент бас тартты",
  "Отменена организацией": "Ұйым бас тартты",
  "Произошла ошибка.": "Қате пайда болды.",
  "Не указано": "Көрсетілмеген",
  "Не указана": "Көрсетілмеген",
  "не указан": "көрсетілмеген",
  "Не определена": "Анықталмаған",
  "Не определён": "Анықталмаған",
  "Не определено": "Анықталмаған",
  "Положительный (+)": "Оң (+)",
  "Отрицательный (-)": "Теріс (-)",
  "Мужской": "Ер",
  "Женский": "Әйел",
  "Врач не указан": "Дәрігер көрсетілмеген",
  "Специальность не указана": "Мамандық көрсетілмеген",
  "Организация не указана": "Ұйым көрсетілмеген",
  "Причина обращения не указана": "Жүгіну себебі көрсетілмеген",
  "Нет данных": "Деректер жоқ",
  "Рост": "Бойы",
  "Вес": "Салмағы",
  "Индекс массы тела": "Дене салмағының индексі",
  "Сахар в крови": "Қандағы қант",
  "Гемоглобин": "Гемоглобин",
  "Артериальное давление": "Қан қысымы",
  "Зрение": "Көру қабілеті",
  "Статус не указан": "Мәртебе көрсетілмеген",

  "Не удалось загрузить пациентов.": "Пациенттерді жүктеу мүмкін болмады.",
  "Ошибка загрузки пациентов врача:": "Дәрігер пациенттерін жүктеу қатесі:",
  "Не удалось загрузить медицинскую карту.": "Медициналық картаны жүктеу мүмкін болмады.",
  "Ошибка загрузки медкарты:": "Медициналық картаны жүктеу қатесі:",
  "Для сохранения выберите и группу крови, и резус-фактор.": "Сақтау үшін қан тобын және резус-факторды таңдаңыз.",
  "Подтвердите, что вы сверили группу крови и резус-фактор с документом пациента.": "Қан тобы мен резус-факторды пациенттің құжатымен салыстырғаныңызды растаңыз.",
  "Не удалось сохранить общие данные.": "Жалпы деректерді сақтау мүмкін болмады.",
  "Общие данные медицинской карты сохранены.": "Медициналық картаның жалпы деректері сақталды.",
  "Не удалось сохранить общие данные медицинской карты.": "Медициналық картаның жалпы деректерін сақтау мүмкін болмады.",
  "Не удалось сохранить данные приёма.": "Қабылдау деректерін сақтау мүмкін болмады.",
  "Данные приёма сохранены в медицинской карте.": "Қабылдау деректері медициналық картада сақталды.",
  "Не удалось сохранить данные текущего приёма.": "Ағымдағы қабылдау деректерін сақтау мүмкін болмады.",

  "Общие данные": "Жалпы деректер",
  "Показатели": "Көрсеткіштер",
  "История приёмов": "Қабылдаулар тарихы",
  "Справки": "Анықтамалар",
  "Текущий приём": "Ағымдағы қабылдау",

  "Медицинские карты": "Медициналық карталар",
  "Пациенты, которые записывались к вам. Просмотр доступен всегда, изменение — только во время активного приёма.": "Сізге жазылған пациенттер. Қарау әрқашан қолжетімді, өзгерту тек белсенді қабылдау кезінде мүмкін.",
  "Пациенты, которые записывались к вам.": "Сізге жазылған пациенттер.",
  "Просмотр доступен всегда, изменение —": "Қарау әрқашан қолжетімді, өзгерту",
  "только во время активного приёма.": "тек белсенді қабылдау кезінде мүмкін.",
  "Обновить": "Жаңарту",
  "ФИО или ИИН пациента": "Пациенттің аты-жөні немесе ЖСН",
  "Найти": "Іздеу",
  "Пациенты": "Пациенттер",
  "Загрузка пациентов...": "Пациенттер жүктелуде...",
  "Пациенты не найдены": "Пациенттер табылмады",
  "Здесь появятся пациенты, которые записывались к вам.": "Мұнда сізге жазылған пациенттер көрсетіледі.",
  "Здесь появятся пациенты,": "Мұнда сізге жазылған пациенттер",
  "которые записывались к вам.": "көрсетіледі.",
  "Пациент": "Пациент",
  "ИИН": "ЖСН",
  "Возраст не указан": "Жасы көрсетілмеген",
  "Возраст": "Жасы",
  "Записей": "Жазбалар",
  "Идёт приём": "Қабылдау жүріп жатыр",
  "Запись": "Жазба",
  "Только просмотр": "Тек қарау",
  "Выберите пациента": "Пациентті таңдаңыз",
  "После выбора здесь появится медицинская карта.": "Таңдағаннан кейін мұнда медициналық карта көрсетіледі.",
  "После выбора здесь появится": "Таңдағаннан кейін мұнда",
  "медицинская карта.": "медициналық карта көрсетіледі.",
  "Загрузка медицинской карты...": "Медициналық карта жүктелуде...",
  "Медицинская карта недоступна.": "Медициналық карта қолжетімсіз.",
  "Пол": "Жынысы",
  "Редактирование разрешено": "Өзгертуге рұқсат берілген",
  "Идёт активный приём. Изменения будут сохранены в медицинской карте.": "Белсенді қабылдау жүріп жатыр. Өзгерістер медициналық картада сақталады.",
  "Идёт активный приём.": "Белсенді қабылдау жүріп жатыр.",
  "Изменения будут сохранены": "Өзгерістер сақталады",
  "в медицинской карте.": "медициналық картада.",
  "Режим просмотра": "Қарау режимі",
  "Изменять медицинскую карту можно только во время активного приёма этого пациента.": "Медициналық картаны тек осы пациенттің белсенді қабылдауы кезінде өзгертуге болады.",
  "Основная информация": "Негізгі ақпарат",
  "ФИО": "Аты-жөні",
  "Дата рождения": "Туған күні",
  "Обновление карты": "Картаның жаңартылуы",

  "Группа крови и резус-фактор": "Қан тобы және резус-фактор",
  "Врач вносит данные во время активного приёма на основании результата анализа, который показывает пациент.": "Дәрігер деректерді белсенді қабылдау кезінде пациент көрсеткен талдау нәтижесінің негізінде енгізеді.",
  "Врач вносит данные во время": "Дәрігер деректерді",
  "активного приёма на основании": "белсенді қабылдау кезінде",
  "результата анализа, который": "пациент көрсеткен талдау",
  "показывает пациент.": "нәтижесінің негізінде енгізеді.",
  "Данные внесены": "Деректер енгізілді",
  "Перед внесением данных попросите пациента показать официальный результат анализа на бумаге или в электронном виде.": "Деректерді енгізбес бұрын пациенттен ресми талдау нәтижесін қағаз немесе электрондық түрде көрсетуін сұраңыз.",
  "Перед внесением данных": "Деректерді енгізбес бұрын",
  "попросите пациента показать": "пациенттен көрсетуін сұраңыз:",
  "официальный результат анализа": "ресми талдау нәтижесін",
  "на бумаге или в электронном": "қағаз немесе электрондық",
  "виде.": "түрде.",
  "Изменение группы крови и резус-фактора доступно только во время активного приёма.": "Қан тобы мен резус-факторды өзгерту тек белсенді қабылдау кезінде қолжетімді.",
  "Изменение группы крови и": "Қан тобы мен",
  "резус-фактора доступно только": "резус-факторды өзгерту тек",
  "во время активного приёма.": "белсенді қабылдау кезінде қолжетімді.",
  "Группа крови": "Қан тобы",
  "Резус-фактор": "Резус-фактор",
  "Я сверил группу крови и резус-фактор с официальным результатом анализа, предоставленным пациентом.": "Қан тобы мен резус-факторды пациент ұсынған ресми талдау нәтижесімен салыстырдым.",
  "Я сверил группу крови и": "Қан тобы мен",
  "резус-фактор с официальным": "резус-факторды ресми",
  "результатом анализа,": "талдау нәтижесімен",
  "предоставленным пациентом.": "салыстырдым.",
  "Последнее изменение": "Соңғы өзгеріс",

  "Аллергии": "Аллергиялар",
  "Аллергии пациента": "Пациенттің аллергиялары",
  "Хронические заболевания": "Созылмалы аурулар",
  "Перенесённые операции": "Өткізілген операциялар",
  "Противопоказания": "Қарсы көрсетілімдер",
  "Медицинские противопоказания": "Медициналық қарсы көрсетілімдер",
  "Дополнительная важная информация": "Қосымша маңызды ақпарат",
  "Дополнительные важные сведения": "Қосымша маңызды мәліметтер",
  "Анализы и результаты обследований": "Талдаулар және тексеру нәтижелері",
  "Например:\nОбщий анализ крови от 24.06.2026\nГемоглобин — 135 г/л\nГлюкоза — 5,1 ммоль/л": "Мысалы:\n24.06.2026 күнгі жалпы қан талдауы\nГемоглобин — 135 г/л\nГлюкоза — 5,1 ммоль/л",
  "Сохранение...": "Сақталуда...",
  "Сохранить общие данные": "Жалпы деректерді сақтау",

  "Текущий медицинский приём": "Ағымдағы медициналық қабылдау",
  "Все заполненные данные станут частью медицинской карты пациента.": "Барлық толтырылған деректер пациенттің медициналық картасының бөлігі болады.",
  "Все заполненные данные": "Барлық толтырылған деректер",
  "станут частью медицинской": "пациенттің медициналық",
  "карты пациента.": "картасының бөлігі болады.",
  "Дата": "Күні",
  "Время": "Уақыты",
  "Причина обращения": "Жүгіну себебі",
  "Жалобы пациента": "Пациенттің шағымдары",
  "Опишите жалобы пациента": "Пациенттің шағымдарын сипаттаңыз",
  "Симптомы": "Белгілер",
  "Укажите симптомы": "Белгілерді көрсетіңіз",
  "Результаты осмотра": "Қарау нәтижелері",
  "Результаты медицинского осмотра": "Медициналық қарау нәтижелері",
  "Предварительный диагноз": "Алдын ала диагноз",
  "Окончательный диагноз": "Қорытынды диагноз",
  "Назначенное лечение": "Тағайындалған ем",
  "Рекомендации": "Ұсынымдар",
  "Рекомендации пациенту": "Пациентке арналған ұсынымдар",
  "Дополнительный комментарий": "Қосымша түсініктеме",
  "Дополнительная информация": "Қосымша ақпарат",
  "Сохранить данные приёма": "Қабылдау деректерін сақтау",

  "Последние показатели здоровья": "Соңғы денсаулық көрсеткіштері",
  "Данные берутся из раздела показателей здоровья пациента.": "Деректер пациенттің денсаулық көрсеткіштері бөлімінен алынады.",
  "Данные берутся из раздела": "Деректер пациенттің",
  "показателей здоровья пациента.": "денсаулық көрсеткіштері бөлімінен алынады.",

  "История медицинских приёмов": "Медициналық қабылдаулар тарихы",
  "Здесь отображаются записи всех врачей, проводивших приём пациента.": "Мұнда пациентті қабылдаған барлық дәрігерлердің жазбалары көрсетіледі.",
  "Здесь отображаются записи": "Мұнда жазбалар көрсетіледі:",
  "всех врачей, проводивших": "пациентті қабылдаған барлық",
  "приём пациента.": "дәрігерлер.",
  "История приёмов пока отсутствует.": "Қабылдаулар тарихы әзірге жоқ.",
  "История приёмов пока": "Қабылдаулар тарихы әзірге",
  "отсутствует.": "жоқ.",
  "Жалобы": "Шағымдар",
  "Лечение": "Ем",
  "Комментарий": "Түсініктеме",
  "Документы": "Құжаттар",
  "Открыть документ": "Құжатты ашу",

  "Медицинские справки": "Медициналық анықтамалар",
  "Медицинские справки отсутствуют.": "Медициналық анықтамалар жоқ.",
  "Медицинская справка": "Медициналық анықтама",
  "Выдана": "Берілген күні",
  "Открыть": "Ашу",
  "Врач": "Дәрігер",

  "мм рт. ст.": "мм сын. бағ.",
  "Л:": "С:",
  "П:": "О:",
  "лет": "жас",
  "в": "сағат",
};

const KAZAKH_REPLACEMENTS = Object.entries(
  KAZAKH_TRANSLATIONS
).sort(
  ([first], [second]) =>
    second.length - first.length
);

let ACTIVE_LOCALE = "ru-RU";
let ACTIVE_IS_KAZAKH = false;

function translateUiText(value, isKazakh) {
  if (
    !isKazakh ||
    typeof value !== "string"
  ) {
    return value;
  }

  const match = value.match(
    /^(\s*)([\s\S]*?)(\s*)$/
  );

  const leading = match?.[1] || "";
  const core = match?.[2] || value;
  const trailing = match?.[3] || "";

  if (!core) {
    return value;
  }

  let translated =
    KAZAKH_TRANSLATIONS[core] ||
    core;

  if (translated === core) {
    for (const [
      russian,
      kazakh,
    ] of KAZAKH_REPLACEMENTS) {
      if (
        russian.length <= 1 ||
        !translated.includes(russian)
      ) {
        continue;
      }

      translated = translated
        .split(russian)
        .join(kazakh);
    }
  }

  translated = translated
    .replace(
      /^(\d+)\s+лет$/,
      "$1 жас"
    )
    .replace(
      /^Пациенты:\s*(\d+)$/,
      "Пациенттер: $1"
    )
    .replace(
      /^Записей:\s*(\d+)$/,
      "Жазбалар: $1"
    )
    .replace(
      /^Запись\s+(.+?)\s+в\s+(.+)$/,
      "$1 күні сағат $2 жазба"
    )
    .replace(
      /^Запись назначена на (.+?) в (.+?)\. После ввода кода и начала приёма редактирование откроется автоматически\.$/,
      "$1 күні сағат $2-ге жазба тағайындалды. Код енгізіліп, қабылдау басталғаннан кейін өзгерту автоматты түрде ашылады."
    )
    .replace(
      /\bмм рт\. ст\.\b/g,
      "мм сын. бағ."
    )
    .replace(
      /\bЛ:\s*/g,
      "С: "
    )
    .replace(
      /\bП:\s*/g,
      "О: "
    );

  return `${leading}${translated}${trailing}`;
}

function translateReactNode(
  node,
  isKazakh
) {
  if (
    typeof node === "string"
  ) {
    return translateUiText(
      node,
      isKazakh
    );
  }

  if (
    node === null ||
    node === undefined ||
    typeof node === "boolean" ||
    typeof node === "number"
  ) {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map((child) =>
      translateReactNode(
        child,
        isKazakh
      )
    );
  }

  if (!isValidElement(node)) {
    return node;
  }

  const translatedProps = {};

  for (const propName of [
    "placeholder",
    "title",
    "aria-label",
    "label",
  ]) {
    if (
      typeof node.props?.[propName] ===
      "string"
    ) {
      translatedProps[propName] =
        translateUiText(
          node.props[propName],
          isKazakh
        );
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(
      node.props || {},
      "children"
    )
  ) {
    translatedProps.children =
      Children.map(
        node.props.children,
        (child) =>
          translateReactNode(
            child,
            isKazakh
          )
      );
  }

  return cloneElement(
    node,
    translatedProps
  );
}

function LocalizedContent({
  children,
}) {
  const { language } = useLanguage();

  const isKazakh =
    language === "kk" ||
    language === "kz";

  return translateReactNode(
    children,
    isKazakh
  );
}

const EMPTY_PROFILE_FORM = {
  blood_type: "",
  rh_factor: "",
  allergies: "",
  chronic_conditions: "",
  surgeries: "",
  contraindications: "",
  important_notes: "",
   analyses: "",
};

const EMPTY_VISIT_FORM = {
  complaints: "",
  symptoms: "",
  examination_results: "",
  preliminary_diagnosis: "",
  final_diagnosis: "",
  treatment: "",
  recommendations: "",
  comment: "",
};

const VISIT_STATUS_INFO = {
  scheduled: {
    label: "Запись создана",
    color: "#38bdf8",
  },

  confirmed: {
    label: "Посещение подтверждено",
    color: "#34d399",
  },

  in_progress: {
    label: "Приём идёт",
    color: "#22d3ee",
  },

  waiting_finish_confirmation: {
    label: "Ожидается завершение",
    color: "#f59e0b",
  },

  completed: {
    label: "Приём завершён",
    color: "#cbd5e1",
  },

  no_show: {
    label: "Неявка",
    color: "#fb7185",
  },

  cancelled: {
    label: "Запись отменена",
    color: "#fb7185",
  },

  cancelled_by_patient: {
    label: "Отменена пациентом",
    color: "#fb7185",
  },

  cancelled_by_organization: {
    label: "Отменена организацией",
    color: "#ef4444",
  },
};

function clean(value) {
  return String(value ?? "").trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getErrorMessage(
  error,
  fallback = "Произошла ошибка."
) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function formatDate(value) {
  if (!value) {
    return "Не указано";
  }

  const normalizedValue =
    String(value).length === 10
      ? `${value}T00:00:00`
      : value;

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(ACTIVE_LOCALE, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(value) {
  if (!value) {
    return "—";
  }

  const normalizedValue =
    String(value).length === 10
      ? `${value}T00:00:00`
      : value;

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(ACTIVE_LOCALE);
}

function formatDateTime(value) {
  if (!value) {
    return "Не указано";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString(ACTIVE_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value) {
  if (!value) {
    return "—";
  }

  return String(value).slice(0, 5);
}

function getBloodTypeLabel(value) {
  const normalized = clean(value);

  const labels = {
    "O(I)": "O (I)",
    "A(II)": "A (II)",
    "B(III)": "B (III)",
    "AB(IV)": "AB (IV)",
  };

  return (
    labels[normalized] ||
    normalized ||
    "Не определена"
  );
}

function getRhFactorLabel(value) {
  const normalized =
    clean(value).toLowerCase();

  if (normalized === "positive") {
    return "Положительный (+)";
  }

  if (normalized === "negative") {
    return "Отрицательный (-)";
  }

  return "Не определён";
}

function calculateAge(birthDate) {
  if (!birthDate) {
    return null;
  }

  const birth = new Date(
    `${birthDate}T00:00:00`
  );

  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const today = new Date();

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const monthDifference =
    today.getMonth() -
    birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function getPatientAge(patient) {
  if (
    patient?.age !== null &&
    patient?.age !== undefined
  ) {
    return patient.age;
  }

  return calculateAge(patient?.birth_date);
}

function getGenderLabel(gender) {
  const value = clean(gender).toLowerCase();

  if (value === "male") {
    return "Мужской";
  }

  if (value === "female") {
    return "Женский";
  }

  return clean(gender) || "Не указан";
}

function getDoctorName(visit) {
  return (
    clean(
      visit?.doctor?.organization_members
        ?.profiles?.full_name
    ) ||
    clean(
      visit?.doctor?.profile?.full_name
    ) ||
    clean(visit?.doctor_name) ||
    "Врач не указан"
  );
}

function getSpecialtyName(visit) {
  return (
    (ACTIVE_IS_KAZAKH
      ? clean(
          visit?.doctor?.specialties
            ?.name_kk ||
            visit?.doctor?.specialties
              ?.name_kz ||
            visit?.doctor?.specialty
              ?.name_kk ||
            visit?.doctor?.specialty
              ?.name_kz
        )
      : "") ||
    clean(
      visit?.doctor?.specialties?.name_ru
    ) ||
    clean(
      visit?.doctor?.specialty?.name_ru
    ) ||
    clean(visit?.specialty_name) ||
    "Специальность не указана"
  );
}

function getOrganizationName(visit) {
  return (
    (ACTIVE_IS_KAZAKH
      ? clean(
          visit?.organization?.name_kk ||
            visit?.organization?.name_kz ||
            visit?.organizations?.name_kk ||
            visit?.organizations?.name_kz
        )
      : "") ||
    clean(visit?.organization?.name) ||
    clean(visit?.organizations?.name) ||
    clean(visit?.organization_name) ||
    "Организация не указана"
  );
}

function getAppointmentIdFromVisit(visit) {
  return clean(
    visit?.appointment_id ||
      visit?.appointment?.id ||
      visit?.appointments?.id
  );
}

function findCurrentVisit(
  visits,
  appointmentId
) {
  if (!appointmentId) {
    return null;
  }

  return (
    safeArray(visits).find(
      (visit) =>
        getAppointmentIdFromVisit(visit) ===
        String(appointmentId)
    ) || null
  );
}

function getVisitDate(visit) {
  return (
    visit?.appointment?.date ||
    visit?.appointments?.date ||
    visit?.date ||
    String(visit?.created_at || "").slice(
      0,
      10
    )
  );
}

function getVisitTime(visit) {
  return (
    visit?.appointment?.time ||
    visit?.appointments?.time ||
    visit?.time ||
    ""
  );
}

function getVisitReason(visit) {
  return (
    clean(visit?.appointment?.reason) ||
    clean(visit?.appointments?.reason) ||
    clean(visit?.reason) ||
    "Причина обращения не указана"
  );
}

function getVisitStatus(visit) {
  return (
    clean(visit?.appointment?.status) ||
    clean(visit?.appointments?.status) ||
    clean(visit?.status) ||
    "completed"
  );
}

function getLatestMetric(
  metrics,
  metricTypes
) {
  const types = Array.isArray(metricTypes)
    ? metricTypes
    : [metricTypes];

  return [...safeArray(metrics)]
    .filter((metric) =>
      types.includes(metric.metric_type)
    )
    .sort((first, second) => {
      const firstTime = new Date(
        first.measured_at ||
          first.created_at ||
          0
      ).getTime();

      const secondTime = new Date(
        second.measured_at ||
          second.created_at ||
          0
      ).getTime();

      return secondTime - firstTime;
    })[0];
}

function formatMetricValue(
  metric,
  fallbackUnit = ""
) {
  if (!metric) {
    return "Нет данных";
  }

  const numericValue = Number(metric.value);

  const value = Number.isFinite(numericValue)
    ? new Intl.NumberFormat(ACTIVE_LOCALE, {
        maximumFractionDigits: 2,
      }).format(numericValue)
    : clean(metric.value);

  const unit =
    clean(metric.unit) ||
    fallbackUnit;

  return `${value}${
    unit ? ` ${unit}` : ""
  }`;
}

function buildHealthCards(metrics) {
  const height = getLatestMetric(
    metrics,
    "height"
  );

  const weight = getLatestMetric(
    metrics,
    "weight"
  );

  const bmi = getLatestMetric(
    metrics,
    "bmi"
  );

  const sugar = getLatestMetric(
    metrics,
    "blood_sugar"
  );

  const hemoglobin = getLatestMetric(
    metrics,
    "hemoglobin"
  );

  const systolic = getLatestMetric(
    metrics,
    [
      "systolic_pressure",
      "blood_pressure_systolic",
    ]
  );

  const diastolic = getLatestMetric(
    metrics,
    [
      "diastolic_pressure",
      "blood_pressure_diastolic",
    ]
  );

  const visionLeft = getLatestMetric(
    metrics,
    "vision_left"
  );

  const visionRight = getLatestMetric(
    metrics,
    "vision_right"
  );

  const pressureValue =
    systolic && diastolic
      ? `${formatMetricValue(
          systolic
        ).split(" ")[0]}/${formatMetricValue(
          diastolic
        ).split(" ")[0]} мм рт. ст.`
      : "Нет данных";

  const visionValue =
    visionLeft || visionRight
      ? `Л: ${
          visionLeft
            ? formatMetricValue(
                visionLeft
              ).split(" ")[0]
            : "—"
        } · П: ${
          visionRight
            ? formatMetricValue(
                visionRight
              ).split(" ")[0]
            : "—"
        }`
      : "Нет данных";

  return [
    {
      key: "height",
      icon: "📏",
      label: "Рост",
      value: formatMetricValue(
        height,
        "см"
      ),
    },
    {
      key: "weight",
      icon: "⚖️",
      label: "Вес",
      value: formatMetricValue(
        weight,
        "кг"
      ),
    },
    {
      key: "bmi",
      icon: "📊",
      label: "Индекс массы тела",
      value: formatMetricValue(
        bmi,
        "кг/м²"
      ),
    },
    {
      key: "blood_sugar",
      icon: "🩸",
      label: "Сахар в крови",
      value: formatMetricValue(
        sugar,
        "ммоль/л"
      ),
    },
    {
      key: "hemoglobin",
      icon: "🧬",
      label: "Гемоглобин",
      value: formatMetricValue(
        hemoglobin,
        "г/л"
      ),
    },
    {
      key: "pressure",
      icon: "❤️",
      label: "Артериальное давление",
      value: pressureValue,
    },
    {
      key: "vision",
      icon: "👁️",
      label: "Зрение",
      value: visionValue,
    },
  ];
}

function getStatusInfo(status) {
  return (
    VISIT_STATUS_INFO[status] || {
      label: status || "Статус не указан",
      color: "#cbd5e1",
    }
  );
}

function StatusBadge({ status }) {
  const info = getStatusInfo(status);

  return (
    <LocalizedContent>
      <span
      style={{
        ...styles.statusBadge,
        color: info.color,
        borderColor: info.color,
        background: `${info.color}18`,
      }}
    >
        {info.label}
      </span>
    </LocalizedContent>
  );
}

function PersonalInfo({
  icon,
  label,
  value,
}) {
  return (
    <LocalizedContent>
      <div style={styles.personalInfo}>
        <div style={styles.personalIcon}>
        {icon}
      </div>

      <div>
        <span style={styles.personalLabel}>
          {label}
        </span>

        <strong style={styles.personalValue}>
          {value || "Не указано"}
        </strong>
        </div>
      </div>
    </LocalizedContent>
  );
}

function MedicalTextField({
  label,
  name,
  value,
  onChange,
  disabled,
  rows = 4,
  placeholder,
}) {
  return (
    <LocalizedContent>
      <div style={styles.formGroup}>
        <label style={styles.formLabel}>
        {label}
      </label>

      <textarea
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        style={{
          ...styles.textarea,
          ...(disabled
            ? styles.disabledInput
            : {}),
        }}
        />
      </div>
    </LocalizedContent>
  );
}

export default function PatientCard() {
  const { language } = useLanguage();

  const isKazakh =
    language === "kk" ||
    language === "kz";

  ACTIVE_IS_KAZAKH = isKazakh;
  ACTIVE_LOCALE = isKazakh
    ? "kk-KZ"
    : "ru-RU";

  const [patients, setPatients] =
    useState([]);

  const [
    selectedPatientId,
    setSelectedPatientId,
  ] = useState("");

  const [card, setCard] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [activeSection, setActiveSection] =
    useState("profile");

  const [profileForm, setProfileForm] =
    useState(EMPTY_PROFILE_FORM);

  const [visitForm, setVisitForm] =
    useState(EMPTY_VISIT_FORM);

  const [patientsLoading, setPatientsLoading] =
    useState(true);

  const [cardLoading, setCardLoading] =
    useState(false);

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [savingVisit, setSavingVisit] =
    useState(false);

  const [
    bloodVerificationConfirmed,
    setBloodVerificationConfirmed,
  ] = useState(false);

  const [
    originalBloodData,
    setOriginalBloodData,
  ] = useState({
    blood_type: "",
    rh_factor: "",
  });

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const showSuccess = useCallback(
    (message) => {
      setSuccess(message);

      window.setTimeout(() => {
        setSuccess("");
      }, 3500);
    },
    []
  );

  const loadPatients = useCallback(
    async (searchValue = "") => {
      setPatientsLoading(true);
      setError("");

      try {
        const response = await api.get(
          "/medical-card/doctor/patients",
          {
            params: {
              search:
                clean(searchValue) ||
                undefined,
            },
          }
        );

        if (!response.data?.success) {
          throw new Error(
            response.data?.message ||
              "Не удалось загрузить пациентов."
          );
        }

        const nextPatients = safeArray(
          response.data.data
        );

        setPatients(nextPatients);

        setSelectedPatientId(
          (previousId) => {
            const patientStillExists =
              nextPatients.some(
                (patient) =>
                  String(patient.id) ===
                  String(previousId)
              );

            if (patientStillExists) {
              return previousId;
            }

            return nextPatients[0]?.id || "";
          }
        );
      } catch (requestError) {
        console.error(
          "Ошибка загрузки пациентов врача:",
          requestError
        );

        setPatients([]);
        setSelectedPatientId("");

        setError(
          getErrorMessage(
            requestError,
            "Не удалось загрузить пациентов."
          )
        );
      } finally {
        setPatientsLoading(false);
      }
    },
    []
  );

  const loadMedicalCard = useCallback(
    async (
      patientId,
      options = {}
    ) => {
      const silent =
        Boolean(options?.silent);

      if (!patientId) {
        setCard(null);
        return;
      }

      if (!silent) {
        setCardLoading(true);
        setError("");
      }

      try {
        const response = await api.get(
          `/medical-card/${patientId}`
        );

        if (!response.data?.success) {
          throw new Error(
            response.data?.message ||
              "Не удалось загрузить медицинскую карту."
          );
        }

        const nextCard =
          response.data.data;

        setCard(nextCard);

        const medicalProfile =
          nextCard?.medical_profile || {};

        setProfileForm({
  blood_type:
    medicalProfile.blood_type || "",
  rh_factor:
    medicalProfile.rh_factor || "",
  allergies:
    medicalProfile.allergies || "",
  chronic_conditions:
    medicalProfile.chronic_conditions ||
    "",
  surgeries:
    medicalProfile.surgeries || "",
  contraindications:
    medicalProfile.contraindications ||
    "",
  important_notes:
    medicalProfile.important_notes ||
    "",
  analyses:
    medicalProfile.analyses || "",
});

        setOriginalBloodData({
          blood_type:
            medicalProfile.blood_type || "",
          rh_factor:
            medicalProfile.rh_factor || "",
        });

        setBloodVerificationConfirmed(false);

        const currentVisit =
          findCurrentVisit(
            nextCard?.visits,
            nextCard?.active_appointment_id
          );

        setVisitForm({
          complaints:
            currentVisit?.complaints || "",
          symptoms:
            currentVisit?.symptoms || "",
          examination_results:
            currentVisit
              ?.examination_results ||
            "",
          preliminary_diagnosis:
            currentVisit
              ?.preliminary_diagnosis ||
            "",
          final_diagnosis:
            currentVisit
              ?.final_diagnosis ||
            "",
          treatment:
            currentVisit?.treatment || "",
          recommendations:
            currentVisit
              ?.recommendations || "",
          comment:
            currentVisit?.comment ||
            currentVisit
              ?.additional_comment ||
            "",
        });
      } catch (requestError) {
        console.error(
          "Ошибка загрузки медкарты:",
          requestError
        );

        if (!silent) {
          setCard(null);

          setError(
            getErrorMessage(
              requestError,
              "Не удалось загрузить медицинскую карту."
            )
          );
        }
      } finally {
        if (!silent) {
          setCardLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    if (selectedPatientId) {
      loadMedicalCard(
        selectedPatientId
      );
    } else {
      setCard(null);
    }
  }, [
    selectedPatientId,
    loadMedicalCard,
  ]);

  const canEdit = Boolean(
    card?.permissions?.can_edit &&
      card?.active_appointment_id
  );

  const bloodDataChanged =
    profileForm.blood_type !==
      originalBloodData.blood_type ||
    profileForm.rh_factor !==
      originalBloodData.rh_factor;

  const bloodDataComplete = Boolean(
    profileForm.blood_type &&
      profileForm.rh_factor
  );

  const bloodDataAlreadySaved = Boolean(
    card?.medical_profile?.blood_type &&
      card?.medical_profile?.rh_factor
  );

  const activeAppointment =
    card?.active_appointment || null;


  useEffect(() => {
    if (
      !selectedPatientId ||
      canEdit
    ) {
      return undefined;
    }

    const intervalId =
      window.setInterval(() => {
        if (
          document.visibilityState !==
          "visible"
        ) {
          return;
        }

        loadMedicalCard(
          selectedPatientId,
          {
            silent: true,
          }
        );
      }, 5000);

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [
    selectedPatientId,
    canEdit,
    loadMedicalCard,
  ]);

  const healthCards = useMemo(
    () =>
      buildHealthCards(
        card?.metrics || []
      ),
    [card?.metrics, language]
  );

  const visits = useMemo(
    () =>
      safeArray(card?.visits).sort(
        (first, second) => {
          const firstTime = new Date(
            first?.created_at || 0
          ).getTime();

          const secondTime = new Date(
            second?.created_at || 0
          ).getTime();

          return secondTime - firstTime;
        }
      ),
    [card?.visits]
  );

  const selectedPatient =
    patients.find(
      (patient) =>
        String(patient.id) ===
        String(selectedPatientId)
    ) || null;

  useEffect(() => {
    if (
      !canEdit &&
      activeSection === "current_visit"
    ) {
      setActiveSection("profile");
    }
  }, [canEdit, activeSection]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    loadPatients(search);
  }

  async function handleRefresh() {
    await loadPatients(search);

    if (selectedPatientId) {
      await loadMedicalCard(
        selectedPatientId
      );
    }
  }

  function handleProfileChange(event) {
    const { name, value } =
      event.target;

    setProfileForm(
      (previousForm) => ({
        ...previousForm,
        [name]: value,
      })
    );
  }

  function handleVisitChange(event) {
    const { name, value } =
      event.target;

    setVisitForm(
      (previousForm) => ({
        ...previousForm,
        [name]: value,
      })
    );
  }

  async function saveMedicalProfile(
    event
  ) {
    event.preventDefault();

    if (
      !selectedPatientId ||
      !canEdit
    ) {
      return;
    }
    if (bloodDataChanged) {
      if (!bloodDataComplete) {
        setError(
          "Для сохранения выберите и группу крови, и резус-фактор."
        );
        return;
      }

      if (!bloodVerificationConfirmed) {
        setError(
          "Подтвердите, что вы сверили группу крови и резус-фактор с документом пациента."
        );
        return;
      }
    }

    setSavingProfile(true);
    setError("");

    try {
      const response = await api.patch(
        `/medical-card/${selectedPatientId}/profile`,
        {
          appointmentId:
            card.active_appointment_id,

          bloodDataVerified:
            bloodVerificationConfirmed,

          ...profileForm,
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Не удалось сохранить общие данные."
        );
      }

      showSuccess(
        response.data?.message ||
          "Общие данные медицинской карты сохранены."
      );

      await loadMedicalCard(
        selectedPatientId
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Не удалось сохранить общие данные медицинской карты."
        )
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveCurrentVisit(
    event
  ) {
    event.preventDefault();

    if (
      !selectedPatientId ||
      !canEdit ||
      !card?.active_appointment_id
    ) {
      return;
    }

    setSavingVisit(true);
    setError("");

    try {
      const response = await api.put(
        `/medical-card/${selectedPatientId}/visits/${card.active_appointment_id}`,
        visitForm
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Не удалось сохранить данные приёма."
        );
      }

      showSuccess(
        response.data?.message ||
          "Данные приёма сохранены в медицинской карте."
      );

      await loadMedicalCard(
        selectedPatientId
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Не удалось сохранить данные текущего приёма."
        )
      );
    } finally {
      setSavingVisit(false);
    }
  }

  const sections = [
    {
      id: "profile",
      label: "Общие данные",
      icon: <RiUserHeartLine />,
    },
    {
      id: "metrics",
      label: "Показатели",
      icon: <RiHeartPulseLine />,
    },
    {
      id: "history",
      label: "История приёмов",
      icon: <RiFileTextLine />,
    },
    {
      id: "certificates",
      label: "Справки",
      icon: <RiFileTextLine />,
    },
  ];

  if (canEdit) {
    sections.splice(1, 0, {
      id: "current_visit",
      label: "Текущий приём",
      icon: <RiEditLine />,
    });
  }

  return (
    <LocalizedContent>
      <div style={styles.container}>
        <header style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>
            Медицинские карты
          </h1>

          <p style={styles.subtitle}>
            Пациенты, которые записывались к вам.
            Просмотр доступен всегда, изменение —
            только во время активного приёма.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={
            patientsLoading ||
            cardLoading
          }
          style={{
            ...styles.refreshButton,
            ...(patientsLoading ||
            cardLoading
              ? styles.disabledButton
              : {}),
          }}
        >
          <RiRefreshLine />
          Обновить
        </button>
      </header>

      {error && (
        <div style={styles.errorAlert}>
          {error}
        </div>
      )}

      {success && (
        <div style={styles.successAlert}>
          {success}
        </div>
      )}

      <div style={styles.layout}>
        <aside style={styles.patientPanel}>
          <form
            onSubmit={handleSearchSubmit}
            style={styles.searchForm}
          >
            <div
              style={styles.searchInputWrapper}
            >
              <RiSearchLine
                style={styles.searchIcon}
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="ФИО или ИИН пациента"
                style={styles.searchInput}
              />
            </div>

            <button
              type="submit"
              disabled={patientsLoading}
              style={styles.searchButton}
            >
              Найти
            </button>
          </form>

          <div style={styles.patientCount}>
            Пациенты: {patients.length}
          </div>

          {patientsLoading ? (
            <div style={styles.listEmpty}>
              Загрузка пациентов...
            </div>
          ) : patients.length === 0 ? (
            <div style={styles.listEmpty}>
              <RiUserHeartLine
                style={styles.emptyIcon}
              />

              <strong>
                Пациенты не найдены
              </strong>

              <span>
                Здесь появятся пациенты,
                которые записывались к вам.
              </span>
            </div>
          ) : (
            <div style={styles.patientList}>
              {patients.map((patient) => {
                const selected =
                  String(
                    selectedPatientId
                  ) ===
                  String(patient.id);

                return (
                  <button
                    type="button"
                    key={patient.id}
                    onClick={() => {
                      setSelectedPatientId(
                        patient.id
                      );

                      setActiveSection(
                        "profile"
                      );
                    }}
                    style={{
                      ...styles.patientItem,
                      ...(selected
                        ? styles.selectedPatient
                        : {}),
                    }}
                  >
                    <div
                      style={styles.patientItemTop}
                    >
                      <div
                        style={styles.patientAvatar}
                      >
                        {clean(
                          patient.full_name
                        )
                          .slice(0, 1)
                          .toUpperCase() ||
                          "П"}
                      </div>

                      <div
                        style={
                          styles.patientItemContent
                        }
                      >
                        <strong
                          style={
                            styles.patientName
                          }
                        >
                          {patient.full_name ||
                            "Пациент"}
                        </strong>

                        <span
                          style={
                            styles.patientIin
                          }
                        >
                          ИИН:{" "}
                          {patient.iin ||
                            "не указан"}
                        </span>
                      </div>
                    </div>

                    <div
                      style={
                        styles.patientMeta
                      }
                    >
                      <span>
                        {getPatientAge(
                          patient
                        ) !== null
                          ? `${getPatientAge(
                              patient
                            )} лет`
                          : "Возраст не указан"}
                      </span>

                      <span>
                        Записей:{" "}
                        {patient.appointment_count ||
                          0}
                      </span>
                    </div>

                    {patient.can_edit ? (
                      <span
                        style={
                          styles.editableBadge
                        }
                      >
                        <RiEditLine />
                        Идёт приём
                      </span>
                    ) : (
                      <span
                        style={
                          styles.readOnlyBadge
                        }
                      >
                        <RiLockLine />
                        Только просмотр
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <main style={styles.cardPanel}>
          {!selectedPatientId ? (
            <div style={styles.cardEmpty}>
              <RiUserHeartLine
                style={styles.cardEmptyIcon}
              />

              <h3>
                Выберите пациента
              </h3>

              <p>
                После выбора здесь появится
                медицинская карта.
              </p>
            </div>
          ) : cardLoading ? (
            <div style={styles.cardEmpty}>
              Загрузка медицинской карты...
            </div>
          ) : !card ? (
            <div style={styles.cardEmpty}>
              Медицинская карта недоступна.
            </div>
          ) : (
            <>
              <section style={styles.patientHeader}>
                <div
                  style={
                    styles.largePatientAvatar
                  }
                >
                  {clean(
                    card.profile?.full_name
                  )
                    .slice(0, 1)
                    .toUpperCase() || "П"}
                </div>

                <div
                  style={
                    styles.patientHeaderContent
                  }
                >
                  <h2
                    style={
                      styles.patientHeaderName
                    }
                  >
                    {card.profile?.full_name ||
                      selectedPatient
                        ?.full_name ||
                      "Пациент"}
                  </h2>

                  <div
                    style={
                      styles.patientHeaderMeta
                    }
                  >
                    <span>
                      ИИН:{" "}
                      {card.profile?.iin ||
                        "не указан"}
                    </span>

                    <span>
                      Возраст:{" "}
                      {card.profile?.age ??
                        getPatientAge(
                          card.profile
                        ) ??
                        "не указан"}
                    </span>

                    <span>
                      Пол:{" "}
                      {getGenderLabel(
                        card.profile?.gender
                      )}
                    </span>
                  </div>
                </div>
              </section>

              <div
                style={{
                  ...styles.accessBanner,
                  ...(canEdit
                    ? styles.editBanner
                    : styles.viewBanner),
                }}
              >
                {canEdit ? (
                  <>
                    <RiEditLine />

                    <div>
                      <strong>
                        Редактирование разрешено
                      </strong>

                      <span>
                        Идёт активный приём.
                        Изменения будут сохранены
                        в медицинской карте.
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <RiLockLine />

                    <div>
                      <strong>
                        Режим просмотра
                      </strong>

                      <span>
                        Медицинская карта доступна для просмотра без ограничения по времени. Изменять данные можно только во время активного приёма этого пациента.
                      </span>
                    </div>
                  </>
                )}
              </div>

              <nav style={styles.sections}>
                {sections.map((section) => (
                  <button
                    type="button"
                    key={section.id}
                    onClick={() =>
                      setActiveSection(
                        section.id
                      )
                    }
                    style={{
                      ...styles.sectionButton,
                      ...(activeSection ===
                      section.id
                        ? styles.activeSection
                        : {}),
                    }}
                  >
                    {section.icon}
                    {section.label}
                  </button>
                ))}
              </nav>

              {activeSection ===
                "profile" && (
                <section>
                  <h3 style={styles.sectionTitle}>
                    Основная информация
                  </h3>

                  <div
                    style={
                      styles.personalInfoGrid
                    }
                  >
                    <PersonalInfo
                      icon={<RiUserHeartLine />}
                      label="ФИО"
                      value={
                        card.profile
                          ?.full_name
                      }
                    />

                    <PersonalInfo
                      icon={<RiCalendarLine />}
                      label="Дата рождения"
                      value={formatDate(
                        card.profile
                          ?.birth_date
                      )}
                    />

                    <PersonalInfo
                      icon={<RiUserHeartLine />}
                      label="Возраст"
                      value={
                        card.profile?.age ??
                        getPatientAge(
                          card.profile
                        ) ??
                        "Не указан"
                      }
                    />

                    <PersonalInfo
                      icon={<RiFileTextLine />}
                      label="ИИН"
                      value={
                        card.profile?.iin
                      }
                    />

                    <PersonalInfo
                      icon={<RiUserHeartLine />}
                      label="Пол"
                      value={getGenderLabel(
                        card.profile?.gender
                      )}
                    />

                    <PersonalInfo
                      icon={<RiTimeLine />}
                      label="Обновление карты"
                      value={formatDateTime(
                        card.medical_profile
                          ?.updated_at
                      )}
                    />
                  </div>

                  <form
                    onSubmit={
                      saveMedicalProfile
                    }
                    style={
                      styles.medicalProfileForm
                    }
                  >
                    <div
                      style={
                        styles.bloodVerificationCard
                      }
                    >
                      <div
                        style={
                          styles.bloodVerificationHeader
                        }
                      >
                        <div>
                          <h4
                            style={
                              styles.bloodVerificationTitle
                            }
                          >
                            Группа крови и резус-фактор
                          </h4>

                          <p
                            style={
                              styles.bloodVerificationText
                            }
                          >
                            Врач вносит данные во время
                            активного приёма на основании
                            результата анализа, который
                            показывает пациент.
                          </p>
                        </div>

                        <span
                          style={{
                            ...styles.bloodStatusBadge,
                            ...(bloodDataAlreadySaved
                              ? styles.bloodStatusConfirmed
                              : styles.bloodStatusUnknown),
                          }}
                        >
                          {bloodDataAlreadySaved
                            ? "Данные внесены"
                            : "Не определено"}
                        </span>
                      </div>

                      {canEdit ? (
                        <div
                          style={
                            styles.bloodEditNotice
                          }
                        >
                          <RiFileTextLine />

                          <span>
                            Перед внесением данных
                            попросите пациента показать
                            официальный результат анализа
                            на бумаге или в электронном
                            виде.
                          </span>
                        </div>
                      ) : (
                        <div
                          style={
                            styles.bloodReadOnlyNotice
                          }
                        >
                          <RiLockLine />

                          <span>
                            Изменение группы крови и
                            резус-фактора доступно только
                            во время активного приёма.
                          </span>
                        </div>
                      )}

                      {canEdit ? (
                        <div
                          style={
                            styles.twoColumnGrid
                          }
                        >
                          <div
                            style={
                              styles.formGroup
                            }
                          >
                            <label
                              style={
                                styles.formLabel
                              }
                            >
                              Группа крови
                            </label>

                            <select
                              name="blood_type"
                              value={
                                profileForm.blood_type
                              }
                              onChange={
                                handleProfileChange
                              }
                              style={{
                                ...styles.input,
                                colorScheme:
                                  "dark",
                              }}
                            >
                              <option value="">
                                Не определена
                              </option>

                              <option value="O(I)">
                                O (I)
                              </option>

                              <option value="A(II)">
                                A (II)
                              </option>

                              <option value="B(III)">
                                B (III)
                              </option>

                              <option value="AB(IV)">
                                AB (IV)
                              </option>
                            </select>
                          </div>

                          <div
                            style={
                              styles.formGroup
                            }
                          >
                            <label
                              style={
                                styles.formLabel
                              }
                            >
                              Резус-фактор
                            </label>

                            <select
                              name="rh_factor"
                              value={
                                profileForm.rh_factor
                              }
                              onChange={
                                handleProfileChange
                              }
                              style={{
                                ...styles.input,
                                colorScheme:
                                  "dark",
                              }}
                            >
                              <option value="">
                                Не определён
                              </option>

                              <option value="positive">
                                Положительный (+)
                              </option>

                              <option value="negative">
                                Отрицательный (-)
                              </option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={
                            styles.twoColumnGrid
                          }
                        >
                          <div
                            style={
                              styles.readOnlyMedicalValue
                            }
                          >
                            <span
                              style={
                                styles.readOnlyMedicalLabel
                              }
                            >
                              Группа крови
                            </span>

                            <strong
                              style={
                                styles.readOnlyMedicalText
                              }
                            >
                              {getBloodTypeLabel(
                                profileForm.blood_type
                              )}
                            </strong>
                          </div>

                          <div
                            style={
                              styles.readOnlyMedicalValue
                            }
                          >
                            <span
                              style={
                                styles.readOnlyMedicalLabel
                              }
                            >
                              Резус-фактор
                            </span>

                            <strong
                              style={
                                styles.readOnlyMedicalText
                              }
                            >
                              {getRhFactorLabel(
                                profileForm.rh_factor
                              )}
                            </strong>
                          </div>
                        </div>
                      )}

                      {canEdit &&
                        bloodDataChanged && (
                          <label
                            style={
                              styles.verificationCheckbox
                            }
                          >
                            <input
                              type="checkbox"
                              checked={
                                bloodVerificationConfirmed
                              }
                              onChange={(event) =>
                                setBloodVerificationConfirmed(
                                  event.target.checked
                                )
                              }
                              style={
                                styles.checkboxInput
                              }
                            />

                            <span>
                              Я сверил группу крови и
                              резус-фактор с официальным
                              результатом анализа,
                              предоставленным пациентом.
                            </span>
                          </label>
                        )}

                      {bloodDataAlreadySaved &&
                        card?.medical_profile
                          ?.updated_at && (
                          <div
                            style={
                              styles.bloodUpdatedInfo
                            }
                          >
                            Последнее изменение:{" "}
                            {formatDateTime(
                              card.medical_profile
                                .updated_at
                            )}
                          </div>
                        )}
                    </div>

                    <MedicalTextField
                      label="Аллергии"
                      name="allergies"
                      value={
                        profileForm.allergies
                      }
                      onChange={
                        handleProfileChange
                      }
                      disabled={!canEdit}
                      placeholder="Аллергии пациента"
                    />

                    <MedicalTextField
                      label="Хронические заболевания"
                      name="chronic_conditions"
                      value={
                        profileForm.chronic_conditions
                      }
                      onChange={
                        handleProfileChange
                      }
                      disabled={!canEdit}
                      placeholder="Хронические заболевания"
                    />

                    <MedicalTextField
                      label="Перенесённые операции"
                      name="surgeries"
                      value={
                        profileForm.surgeries
                      }
                      onChange={
                        handleProfileChange
                      }
                      disabled={!canEdit}
                      placeholder="Перенесённые операции"
                    />

                    <MedicalTextField
                      label="Противопоказания"
                      name="contraindications"
                      value={
                        profileForm.contraindications
                      }
                      onChange={
                        handleProfileChange
                      }
                      disabled={!canEdit}
                      placeholder="Медицинские противопоказания"
                    />

                    <MedicalTextField
                      label="Дополнительная важная информация"
                      name="important_notes"
                      value={
                        profileForm.important_notes
                      }
                      onChange={
                        handleProfileChange
                      }
                      disabled={!canEdit}
                      placeholder="Дополнительные важные сведения"
                    />
                    <MedicalTextField
  label="Анализы и результаты обследований"
  name="analyses"
  value={profileForm.analyses}
  onChange={handleProfileChange}
  disabled={!canEdit}
  rows={7}
  placeholder={
    "Например:\nОбщий анализ крови от 24.06.2026\nГемоглобин — 135 г/л\nГлюкоза — 5,1 ммоль/л"
  }
/>

                    {canEdit && (
                      <button
                        type="submit"
                        disabled={savingProfile}
                        style={{
                          ...styles.saveButton,
                          ...(savingProfile
                            ? styles.disabledButton
                            : {}),
                        }}
                      >
                        <RiSaveLine />

                        {savingProfile
                          ? "Сохранение..."
                          : "Сохранить общие данные"}
                      </button>
                    )}
                  </form>
                </section>
              )}

              {activeSection ===
                "current_visit" &&
                canEdit && (
                  <section>
                    <div
                      style={
                        styles.currentVisitHeader
                      }
                    >
                      <div>
                        <h3
                          style={
                            styles.sectionTitle
                          }
                        >
                          Текущий медицинский приём
                        </h3>

                        <p
                          style={
                            styles.sectionSubtitle
                          }
                        >
                          Все заполненные данные
                          станут частью медицинской
                          карты пациента.
                        </p>
                      </div>

                      <StatusBadge
                        status={
                          activeAppointment
                            ?.status
                        }
                      />
                    </div>

                    <div
                      style={
                        styles.appointmentInfoGrid
                      }
                    >
                      <PersonalInfo
                        icon={
                          <RiCalendarLine />
                        }
                        label="Дата"
                        value={formatDate(
                          activeAppointment?.date
                        )}
                      />

                      <PersonalInfo
                        icon={<RiTimeLine />}
                        label="Время"
                        value={formatTime(
                          activeAppointment?.time
                        )}
                      />

                      <PersonalInfo
                        icon={
                          <RiHospitalLine />
                        }
                        label="Причина обращения"
                        value={
                          activeAppointment?.reason ||
                          "Не указана"
                        }
                      />
                    </div>

                    <form
                      onSubmit={
                        saveCurrentVisit
                      }
                      style={
                        styles.currentVisitForm
                      }
                    >
                      <MedicalTextField
                        label="Жалобы пациента"
                        name="complaints"
                        value={
                          visitForm.complaints
                        }
                        onChange={
                          handleVisitChange
                        }
                        disabled={false}
                        placeholder="Опишите жалобы пациента"
                      />

                      <MedicalTextField
                        label="Симптомы"
                        name="symptoms"
                        value={
                          visitForm.symptoms
                        }
                        onChange={
                          handleVisitChange
                        }
                        disabled={false}
                        placeholder="Укажите симптомы"
                      />

                      <MedicalTextField
                        label="Результаты осмотра"
                        name="examination_results"
                        value={
                          visitForm.examination_results
                        }
                        onChange={
                          handleVisitChange
                        }
                        disabled={false}
                        placeholder="Результаты медицинского осмотра"
                      />

                      <div
                        style={
                          styles.twoColumnGrid
                        }
                      >
                        <MedicalTextField
                          label="Предварительный диагноз"
                          name="preliminary_diagnosis"
                          value={
                            visitForm.preliminary_diagnosis
                          }
                          onChange={
                            handleVisitChange
                          }
                          disabled={false}
                          placeholder="Предварительный диагноз"
                        />

                        <MedicalTextField
                          label="Окончательный диагноз"
                          name="final_diagnosis"
                          value={
                            visitForm.final_diagnosis
                          }
                          onChange={
                            handleVisitChange
                          }
                          disabled={false}
                          placeholder="Окончательный диагноз"
                        />
                      </div>

                      <MedicalTextField
                        label="Назначенное лечение"
                        name="treatment"
                        value={
                          visitForm.treatment
                        }
                        onChange={
                          handleVisitChange
                        }
                        disabled={false}
                        placeholder="Назначенное лечение"
                      />

                      <MedicalTextField
                        label="Рекомендации"
                        name="recommendations"
                        value={
                          visitForm.recommendations
                        }
                        onChange={
                          handleVisitChange
                        }
                        disabled={false}
                        placeholder="Рекомендации пациенту"
                      />

                      <MedicalTextField
                        label="Дополнительный комментарий"
                        name="comment"
                        value={
                          visitForm.comment
                        }
                        onChange={
                          handleVisitChange
                        }
                        disabled={false}
                        placeholder="Дополнительная информация"
                      />

                      <button
                        type="submit"
                        disabled={savingVisit}
                        style={{
                          ...styles.saveButton,
                          ...(savingVisit
                            ? styles.disabledButton
                            : {}),
                        }}
                      >
                        <RiSaveLine />

                        {savingVisit
                          ? "Сохранение..."
                          : "Сохранить данные приёма"}
                      </button>
                    </form>
                  </section>
                )}

              {activeSection ===
                "metrics" && (
                <section>
                  <h3 style={styles.sectionTitle}>
                    Последние показатели здоровья
                  </h3>

                  <p
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Данные берутся из раздела
                    показателей здоровья пациента.
                  </p>

                  <div
                    style={
                      styles.healthMetricsGrid
                    }
                  >
                    {healthCards.map(
                      (metric) => (
                        <article
                          key={metric.key}
                          style={
                            styles.healthMetricCard
                          }
                        >
                          <div
                            style={
                              styles.healthMetricIcon
                            }
                          >
                            {metric.icon}
                          </div>

                          <span
                            style={
                              styles.healthMetricLabel
                            }
                          >
                            {metric.label}
                          </span>

                          <strong
                            style={
                              styles.healthMetricValue
                            }
                          >
                            {metric.value}
                          </strong>
                        </article>
                      )
                    )}
                  </div>
                </section>
              )}

              {activeSection ===
                "history" && (
                <section>
                  <h3 style={styles.sectionTitle}>
                    История медицинских приёмов
                  </h3>

                  <p
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Здесь отображаются записи
                    всех врачей, проводивших
                    приём пациента.
                  </p>

                  {visits.length === 0 ? (
                    <div
                      style={
                        styles.sectionEmpty
                      }
                    >
                      История приёмов пока
                      отсутствует.
                    </div>
                  ) : (
                    <div
                      style={
                        styles.visitHistory
                      }
                    >
                      {visits.map((visit) => {
                        const status =
                          getVisitStatus(
                            visit
                          );

                        return (
                          <article
                            key={visit.id}
                            style={
                              styles.visitCard
                            }
                          >
                            <div
                              style={
                                styles.visitHeader
                              }
                            >
                              <div>
                                <h4
                                  style={
                                    styles.visitTitle
                                  }
                                >
                                  {getDoctorName(
                                    visit
                                  )}
                                </h4>

                                <p
                                  style={
                                    styles.visitSpecialty
                                  }
                                >
                                  {getSpecialtyName(
                                    visit
                                  )}
                                </p>
                              </div>

                              <StatusBadge
                                status={status}
                              />
                            </div>

                            <div
                              style={
                                styles.visitMeta
                              }
                            >
                              <span>
                                <RiCalendarLine />
                                {formatDate(
                                  getVisitDate(
                                    visit
                                  )
                                )}
                              </span>

                              <span>
                                <RiTimeLine />
                                {formatTime(
                                  getVisitTime(
                                    visit
                                  )
                                )}
                              </span>

                              <span>
                                <RiHospitalLine />
                                {getOrganizationName(
                                  visit
                                )}
                              </span>
                            </div>

                            <div
                              style={
                                styles.visitFields
                              }
                            >
                              <DetailRow
                                label="Причина обращения"
                                value={getVisitReason(
                                  visit
                                )}
                              />

                              <DetailRow
                                label="Жалобы"
                                value={
                                  visit.complaints
                                }
                              />

                              <DetailRow
                                label="Симптомы"
                                value={
                                  visit.symptoms
                                }
                              />

                              <DetailRow
                                label="Результаты осмотра"
                                value={
                                  visit.examination_results
                                }
                              />

                              <DetailRow
                                label="Предварительный диагноз"
                                value={
                                  visit.preliminary_diagnosis
                                }
                              />

                              <DetailRow
                                label="Окончательный диагноз"
                                value={
                                  visit.final_diagnosis
                                }
                              />

                              <DetailRow
                                label="Лечение"
                                value={
                                  visit.treatment
                                }
                              />

                              <DetailRow
                                label="Рекомендации"
                                value={
                                  visit.recommendations
                                }
                              />

                              <DetailRow
                                label="Комментарий"
                                value={
                                  visit.comment ||
                                  visit.additional_comment
                                }
                              />
                            </div>

                            {safeArray(
                              visit.visit_documents
                            ).length > 0 && (
                              <div
                                style={
                                  styles.documents
                                }
                              >
                                <strong>
                                  Документы
                                </strong>

                                {visit.visit_documents.map(
                                  (document) => (
                                    <a
                                      key={
                                        document.id
                                      }
                                      href={
                                        document.file_url
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      style={
                                        styles.documentLink
                                      }
                                    >
                                      <RiFileTextLine />
                                      {document.file_name ||
                                        "Открыть документ"}
                                    </a>
                                  )
                                )}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {activeSection ===
                "certificates" && (
                <section>
                  <h3 style={styles.sectionTitle}>
                    Медицинские справки
                  </h3>

                  {safeArray(
                    card.certificates
                  ).length === 0 ? (
                    <div
                      style={
                        styles.sectionEmpty
                      }
                    >
                      Медицинские справки
                      отсутствуют.
                    </div>
                  ) : (
                    <div
                      style={
                        styles.certificateList
                      }
                    >
                      {card.certificates.map(
                        (certificate) => (
                          <article
                            key={
                              certificate.id
                            }
                            style={
                              styles.certificateCard
                            }
                          >
                            <RiFileTextLine
                              style={
                                styles.certificateIcon
                              }
                            />

                            <div
                              style={{
                                flex: 1,
                              }}
                            >
                              <strong>
                                {certificate.title ||
                                  certificate.certificate_type ||
                                  "Медицинская справка"}
                              </strong>

                              <span
                                style={
                                  styles.certificateDate
                                }
                              >
                                Выдана:{" "}
                                {formatDate(
                                  certificate.issue_date ||
                                    certificate.created_at
                                )}
                              </span>
                            </div>

                            {(certificate.file_url ||
                              certificate.pdf_url) && (
                              <a
                                href={
                                  certificate.file_url ||
                                  certificate.pdf_url
                                }
                                target="_blank"
                                rel="noreferrer"
                                style={
                                  styles.openButton
                                }
                              >
                                Открыть
                              </a>
                            )}
                          </article>
                        )
                      )}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>
      </div>
    </LocalizedContent>
  );
}

function DetailRow({ label, value }) {
  if (!clean(value)) {
    return null;
  }

  return (
    <LocalizedContent>
      <div style={styles.detailRow}>
        <span style={styles.detailLabel}>
        {label}
      </span>

      <p style={styles.detailValue}>
        {value}
        </p>
      </div>
    </LocalizedContent>
  );
}

const styles = {
  container: {
    maxWidth: "1700px",
    margin: "0 auto",
    padding: "30px",
    color: "#ffffff",
    fontFamily: "'Outfit', sans-serif",
  },

  pageHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "20px",
    marginBottom: "24px",
  },

  title: {
    margin: "0 0 8px",
    fontSize: "32px",
    fontWeight: 800,
  },

  subtitle: {
    maxWidth: "760px",
    margin: 0,
    color: "#94a3b8",
    fontSize: "15px",
    lineHeight: 1.5,
  },

  refreshButton: {
    minHeight: "42px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 16px",
    border: "1px solid rgba(129,140,248,0.35)",
    borderRadius: "11px",
    background: "rgba(99,102,241,0.13)",
    color: "#c7d2fe",
    fontWeight: 700,
    cursor: "pointer",
  },

  errorAlert: {
    marginBottom: "17px",
    padding: "13px 15px",
    borderRadius: "11px",
    border: "1px solid rgba(251,113,133,0.3)",
    background: "rgba(190,18,60,0.12)",
    color: "#fecdd3",
  },

  successAlert: {
    marginBottom: "17px",
    padding: "13px 15px",
    borderRadius: "11px",
    border: "1px solid rgba(52,211,153,0.3)",
    background: "rgba(5,150,105,0.12)",
    color: "#a7f3d0",
  },

  layout: {
    display: "grid",
    gridTemplateColumns:
      "minmax(300px, 390px) minmax(0, 1fr)",
    gap: "22px",
    alignItems: "start",
  },

  patientPanel: {
    minHeight: "680px",
    padding: "17px",
    borderRadius: "18px",
    border: "1px solid rgba(148,163,184,0.1)",
    background: "rgba(30,41,59,0.42)",
  },

  searchForm: {
    display: "flex",
    gap: "8px",
    marginBottom: "13px",
  },

  searchInputWrapper: {
    position: "relative",
    flex: 1,
  },

  searchIcon: {
    position: "absolute",
    top: "50%",
    left: "12px",
    transform: "translateY(-50%)",
    color: "#64748b",
  },

  searchInput: {
    width: "100%",
    minHeight: "42px",
    boxSizing: "border-box",
    padding: "10px 12px 10px 37px",
    border: "1px solid rgba(148,163,184,0.13)",
    borderRadius: "10px",
    outline: "none",
    background: "#11182e",
    color: "#ffffff",
  },

  searchButton: {
    padding: "0 14px",
    border: "none",
    borderRadius: "10px",
    background: "#6366f1",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },

  patientCount: {
    marginBottom: "12px",
    color: "#64748b",
    fontSize: "11px",
  },

  patientList: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
    maxHeight: "610px",
    overflowY: "auto",
  },

  patientItem: {
    width: "100%",
    padding: "13px",
    textAlign: "left",
    borderRadius: "13px",
    border: "1px solid rgba(148,163,184,0.09)",
    background: "rgba(15,23,42,0.48)",
    color: "#ffffff",
    cursor: "pointer",
  },

  selectedPatient: {
    borderColor: "#6366f1",
    background: "rgba(99,102,241,0.14)",
  },

  patientItemTop: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },

  patientAvatar: {
    width: "38px",
    height: "38px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "11px",
    background:
      "linear-gradient(135deg,#4f46e5,#7c3aed)",
    fontWeight: 800,
  },

  patientItemContent: {
    minWidth: 0,
  },

  patientName: {
    display: "block",
    overflow: "hidden",
    color: "#f8fafc",
    fontSize: "13px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  patientIin: {
    display: "block",
    marginTop: "3px",
    color: "#64748b",
    fontSize: "10px",
  },

  patientMeta: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    margin: "11px 0",
    color: "#94a3b8",
    fontSize: "10px",
  },

  editableBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 8px",
    borderRadius: "999px",
    background: "rgba(5,150,105,0.14)",
    color: "#6ee7b7",
    fontSize: "10px",
    fontWeight: 700,
  },

  upcomingBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 8px",
    borderRadius: "999px",
    background:
      "rgba(14,165,233,0.13)",
    color: "#7dd3fc",
    fontSize: "10px",
    fontWeight: 700,
  },

  readOnlyBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 8px",
    borderRadius: "999px",
    background: "rgba(100,116,139,0.14)",
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: 700,
  },

  listEmpty: {
    minHeight: "300px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: "9px",
    padding: "20px",
    color: "#64748b",
    textAlign: "center",
    lineHeight: 1.5,
  },

  emptyIcon: {
    fontSize: "42px",
    color: "#6366f1",
  },

  cardPanel: {
    minHeight: "680px",
    padding: "25px",
    borderRadius: "18px",
    border: "1px solid rgba(148,163,184,0.1)",
    background: "rgba(30,41,59,0.42)",
  },

  cardEmpty: {
    minHeight: "620px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    color: "#64748b",
    textAlign: "center",
  },

  cardEmptyIcon: {
    marginBottom: "12px",
    color: "#6366f1",
    fontSize: "50px",
  },

  patientHeader: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    paddingBottom: "20px",
    marginBottom: "17px",
    borderBottom: "1px solid rgba(148,163,184,0.1)",
  },

  largePatientAvatar: {
    width: "58px",
    height: "58px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "16px",
    background:
      "linear-gradient(135deg,#4f46e5,#7c3aed)",
    fontSize: "24px",
    fontWeight: 800,
  },

  patientHeaderContent: {
    minWidth: 0,
  },

  patientHeaderName: {
    margin: "0 0 7px",
    fontSize: "23px",
  },

  patientHeaderMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 18px",
    color: "#94a3b8",
    fontSize: "12px",
  },

  accessBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "11px",
    marginBottom: "18px",
    padding: "13px 15px",
    border: "1px solid",
    borderRadius: "12px",
    lineHeight: 1.45,
  },

  editBanner: {
    color: "#a7f3d0",
    borderColor: "rgba(52,211,153,0.3)",
    background: "rgba(5,150,105,0.1)",
  },

  viewBanner: {
    color: "#cbd5e1",
    borderColor: "rgba(148,163,184,0.2)",
    background: "rgba(100,116,139,0.09)",
  },

  sections: {
    display: "flex",
    flexWrap: "wrap",
    gap: "7px",
    marginBottom: "24px",
  },

  sectionButton: {
    minHeight: "40px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "0 13px",
    borderRadius: "9px",
    border: "1px solid rgba(148,163,184,0.1)",
    background: "rgba(15,23,42,0.4)",
    color: "#94a3b8",
    fontWeight: 700,
    cursor: "pointer",
  },

  activeSection: {
    color: "#ffffff",
    borderColor: "#6366f1",
    background: "rgba(99,102,241,0.18)",
  },

  sectionTitle: {
    margin: "0 0 6px",
    fontSize: "20px",
  },

  sectionSubtitle: {
    margin: "0 0 18px",
    color: "#64748b",
    fontSize: "12px",
  },

  personalInfoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(190px,1fr))",
    gap: "10px",
    margin: "17px 0 22px",
  },

  personalInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "13px",
    borderRadius: "12px",
    border: "1px solid rgba(148,163,184,0.08)",
    background: "rgba(15,23,42,0.45)",
  },

  personalIcon: {
    width: "34px",
    height: "34px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    borderRadius: "9px",
    color: "#818cf8",
    background: "rgba(99,102,241,0.14)",
  },

  personalLabel: {
    display: "block",
    marginBottom: "3px",
    color: "#64748b",
    fontSize: "9px",
    textTransform: "uppercase",
  },

  personalValue: {
    display: "block",
    color: "#e2e8f0",
    fontSize: "12px",
    lineHeight: 1.4,
  },

  bloodVerificationCard: {
    marginBottom: "18px",
    padding: "17px",
    borderRadius: "14px",
    border:
      "1px solid rgba(129,140,248,0.18)",
    background:
      "rgba(99,102,241,0.06)",
  },

  bloodVerificationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "14px",
  },

  bloodVerificationTitle: {
    margin: "0 0 5px",
    color: "#f8fafc",
    fontSize: "15px",
  },

  bloodVerificationText: {
    maxWidth: "680px",
    margin: 0,
    color: "#94a3b8",
    fontSize: "11px",
    lineHeight: 1.55,
  },

  bloodStatusBadge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "27px",
    padding: "3px 10px",
    border: "1px solid",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: 800,
  },

  bloodStatusConfirmed: {
    borderColor:
      "rgba(52,211,153,0.35)",
    background:
      "rgba(5,150,105,0.13)",
    color: "#6ee7b7",
  },

  bloodStatusUnknown: {
    borderColor:
      "rgba(245,158,11,0.3)",
    background:
      "rgba(245,158,11,0.1)",
    color: "#fcd34d",
  },

  bloodEditNotice: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    marginBottom: "15px",
    padding: "11px 12px",
    borderRadius: "10px",
    border:
      "1px solid rgba(56,189,248,0.2)",
    background:
      "rgba(14,165,233,0.08)",
    color: "#bae6fd",
    fontSize: "11px",
    lineHeight: 1.5,
  },

  bloodReadOnlyNotice: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    marginBottom: "15px",
    padding: "11px 12px",
    borderRadius: "10px",
    border:
      "1px solid rgba(148,163,184,0.17)",
    background:
      "rgba(100,116,139,0.08)",
    color: "#94a3b8",
    fontSize: "11px",
    lineHeight: 1.5,
  },

  verificationCheckbox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "9px",
    marginTop: "3px",
    padding: "12px",
    borderRadius: "10px",
    border:
      "1px solid rgba(52,211,153,0.22)",
    background:
      "rgba(5,150,105,0.09)",
    color: "#a7f3d0",
    fontSize: "11px",
    lineHeight: 1.5,
    cursor: "pointer",
  },

  checkboxInput: {
    width: "17px",
    height: "17px",
    marginTop: "1px",
    flexShrink: 0,
    accentColor: "#10b981",
    cursor: "pointer",
  },

  bloodUpdatedInfo: {
    marginTop: "10px",
    color: "#64748b",
    fontSize: "10px",
  },

  readOnlyMedicalValue: {
    minHeight: "62px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "6px",
    marginBottom: "14px",
    padding: "12px 14px",
    boxSizing: "border-box",
    border:
      "1px solid rgba(148,163,184,0.13)",
    borderRadius: "9px",
    background:
      "rgba(15,23,42,0.6)",
  },

  readOnlyMedicalLabel: {
    color: "#64748b",
    fontSize: "9px",
    fontWeight: 800,
    textTransform: "uppercase",
  },

  readOnlyMedicalText: {
    color: "#e2e8f0",
    fontSize: "13px",
    lineHeight: 1.4,
  },

  medicalProfileForm: {
    padding: "18px",
    borderRadius: "14px",
    background: "rgba(15,23,42,0.28)",
  },

  currentVisitForm: {
    padding: "18px",
    borderRadius: "14px",
    background: "rgba(15,23,42,0.28)",
  },

  currentVisitHeader: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "15px",
    marginBottom: "15px",
  },

  appointmentInfoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(190px,1fr))",
    gap: "10px",
    marginBottom: "17px",
  },

  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(240px,1fr))",
    gap: "12px",
  },

  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    marginBottom: "14px",
  },

  formLabel: {
    color: "#cbd5e1",
    fontSize: "11px",
    fontWeight: 700,
  },

  input: {
    minHeight: "43px",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid rgba(148,163,184,0.13)",
    borderRadius: "9px",
    outline: "none",
    background: "#11182e",
    color: "#ffffff",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 13px",
    border: "1px solid rgba(148,163,184,0.13)",
    borderRadius: "9px",
    outline: "none",
    resize: "vertical",
    background: "#11182e",
    color: "#ffffff",
    fontFamily: "inherit",
    lineHeight: 1.55,
  },

  disabledInput: {
    opacity: 0.85,
    cursor: "not-allowed",
    color: "#cbd5e1",
    background: "rgba(15,23,42,0.6)",
  },

  saveButton: {
    minHeight: "44px",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 18px",
    border: "none",
    borderRadius: "10px",
    background:
      "linear-gradient(135deg,#059669,#10b981)",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  },

  disabledButton: {
    opacity: 0.55,
    cursor: "not-allowed",
  },

  healthMetricsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(170px,1fr))",
    gap: "11px",
  },

  healthMetricCard: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    padding: "16px",
    borderRadius: "13px",
    border: "1px solid rgba(148,163,184,0.08)",
    background: "rgba(15,23,42,0.45)",
  },

  healthMetricIcon: {
    fontSize: "23px",
  },

  healthMetricLabel: {
    color: "#94a3b8",
    fontSize: "10px",
  },

  healthMetricValue: {
    color: "#f8fafc",
    fontSize: "16px",
  },

  visitHistory: {
    display: "flex",
    flexDirection: "column",
    gap: "13px",
  },

  visitCard: {
    padding: "17px",
    borderRadius: "14px",
    border: "1px solid rgba(148,163,184,0.09)",
    background: "rgba(15,23,42,0.43)",
  },

  visitHeader: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "14px",
    marginBottom: "12px",
  },

  visitTitle: {
    margin: "0 0 4px",
    fontSize: "15px",
  },

  visitSpecialty: {
    margin: 0,
    color: "#818cf8",
    fontSize: "11px",
  },

  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "26px",
    padding: "3px 9px",
    border: "1px solid",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: 800,
  },

  visitMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 16px",
    marginBottom: "13px",
    color: "#64748b",
    fontSize: "10px",
  },

  visitFields: {
    display: "grid",
    gap: "9px",
  },

  detailRow: {
    padding: "11px 13px",
    borderRadius: "9px",
    background: "rgba(2,6,23,0.22)",
  },

  detailLabel: {
    display: "block",
    marginBottom: "4px",
    color: "#818cf8",
    fontSize: "9px",
    fontWeight: 800,
    textTransform: "uppercase",
  },

  detailValue: {
    margin: 0,
    color: "#e2e8f0",
    fontSize: "12px",
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
  },

  documents: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "13px",
  },

  documentLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 10px",
    borderRadius: "8px",
    background: "rgba(99,102,241,0.13)",
    color: "#c7d2fe",
    textDecoration: "none",
    fontSize: "10px",
  },

  certificateList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  certificateCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid rgba(148,163,184,0.08)",
    background: "rgba(15,23,42,0.43)",
  },

  certificateIcon: {
    color: "#818cf8",
    fontSize: "24px",
  },

  certificateDate: {
    display: "block",
    marginTop: "4px",
    color: "#64748b",
    fontSize: "10px",
  },

  openButton: {
    padding: "8px 11px",
    borderRadius: "8px",
    background: "rgba(99,102,241,0.15)",
    color: "#c7d2fe",
    textDecoration: "none",
    fontSize: "10px",
    fontWeight: 700,
  },

  sectionEmpty: {
    padding: "35px",
    borderRadius: "12px",
    background: "rgba(15,23,42,0.3)",
    color: "#64748b",
    textAlign: "center",
  },
};
