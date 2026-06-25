import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  RiAddLine,
  RiEyeLine,
  RiHeartPulseLine,
  RiRefreshLine,
} from "react-icons/ri";

import api from "../../api/api";
import { useLanguage } from "../../i18n/LanguageContext";


const TEXTS = {
  ru: {
    pageTitle: "Показатели здоровья",
    pageSubtitle:
      "Добавляйте рост, вес, сахар в крови, гемоглобин, артериальное давление и показатели зрения. Индекс массы тела рассчитывается автоматически.",
    refreshing: "Обновление...",
    refresh: "Обновить",
    latestMetrics: "Последние показатели",
    noData: "Нет данных",
    dateNotSpecified: "Дата не указана",
    addMeasurement: "Добавить измерение",
    bmiHint:
      "ИМТ рассчитывается после добавления роста и веса.",
    metricType: "Тип показателя",
    value: "Значение",
    measurementDateTime: "Дата и время измерения",
    saving: "Сохранение...",
    saveMetric: "Сохранить показатель",
    dynamics: "Динамика показателей",
    chartLast20:
      "На графике отображаются последние 20 измерений.",
    history: "История измерений",
    recordsCount: "Количество записей",
    loadingMetrics: "Загрузка показателей...",
    noHistoryData:
      "По выбранному показателю данных пока нет.",
    chartNeedMeasurement:
      "Для построения графика добавьте хотя бы одно измерение.",
    chartNoNumeric:
      "Нет числовых данных для построения графика.",
    chartAria: "График показателей здоровья",
    measurementUnit: "Единица измерения",
    visionRange: "Зрение: значение от 0 до 2",

    allMetrics: "Все показатели",
    height: "Рост",
    weight: "Вес",
    bloodSugar: "Сахар в крови",
    hemoglobin: "Гемоглобин",
    bloodPressure: "Артериальное давление",
    pressure: "Давление",
    vision: "Зрение",
    bmi: "ИМТ",

    leftEye: "Левый глаз",
    rightEye: "Правый глаз",
    upperPressure: "Верхнее давление",
    lowerPressure: "Нижнее давление",
    leftShort: "Л",
    rightShort: "П",
    leftValue: "Левый",
    rightValue: "Правый",

    example1755: "Например: 175,5",
    example725: "Например: 72,5",
    example54: "Например: 5,4",
    example135: "Например: 135",
    example10: "Например: 1,0",
    example08: "Например: 0,8",
    example120: "Например: 120",
    example80: "Например: 80",

    belowNormal: "Ниже нормы",
    normal: "Норма",
    aboveNormal: "Выше нормы",
    highValue: "Высокий показатель",

    genericError: "Произошла ошибка.",
    loadError:
      "Не удалось загрузить показатели здоровья.",
    invalidMeasurementDate:
      "Укажите корректную дату и время измерения.",
    futureMeasurementDate:
      "Дата измерения не может находиться в будущем.",
    bothEyesRequired:
      "Введите показатели для левого и правого глаза.",
    visionRangeError:
      "Показатель зрения должен находиться в диапазоне от 0 до 2.",
    bothPressuresRequired:
      "Введите верхнее и нижнее давление.",
    systolicRangeError:
      "Верхнее давление должно находиться в диапазоне 60–260 мм рт. ст.",
    diastolicRangeError:
      "Нижнее давление должно находиться в диапазоне 20–180 мм рт. ст.",
    systolicGreaterError:
      "Верхнее давление должно быть больше нижнего.",
    numericValueRequired:
      "Введите корректное числовое значение.",
    allowedRange: "Допустимый диапазон",
    savedWithBmi:
      "Показатель сохранён. ИМТ пересчитан автоматически.",
    saved: "Показатель здоровья успешно сохранён.",
    saveError: "Не удалось сохранить показатель.",

    unitCm: "см",
    unitKg: "кг",
    unitMmol: "ммоль/л",
    unitGl: "г/л",
    unitPressure: "мм рт. ст.",
    unitBmi: "кг/м²",
  },

  kk: {
    pageTitle: "Денсаулық көрсеткіштері",
    pageSubtitle:
      "Бой, салмақ, қандағы қант, гемоглобин, артериялық қысым және көру көрсеткіштерін қосыңыз. Дене салмағының индексі автоматты түрде есептеледі.",
    refreshing: "Жаңартылуда...",
    refresh: "Жаңарту",
    latestMetrics: "Соңғы көрсеткіштер",
    noData: "Дерек жоқ",
    dateNotSpecified: "Күні көрсетілмеген",
    addMeasurement: "Өлшем қосу",
    bmiHint:
      "ДСИ бой мен салмақ енгізілгеннен кейін автоматты түрде есептеледі.",
    metricType: "Көрсеткіш түрі",
    value: "Мәні",
    measurementDateTime: "Өлшеу күні мен уақыты",
    saving: "Сақталуда...",
    saveMetric: "Көрсеткішті сақтау",
    dynamics: "Көрсеткіштер динамикасы",
    chartLast20:
      "Графикте соңғы 20 өлшем көрсетіледі.",
    history: "Өлшемдер тарихы",
    recordsCount: "Жазбалар саны",
    loadingMetrics: "Көрсеткіштер жүктелуде...",
    noHistoryData:
      "Таңдалған көрсеткіш бойынша әзірге дерек жоқ.",
    chartNeedMeasurement:
      "График құру үшін кемінде бір өлшем қосыңыз.",
    chartNoNumeric:
      "График құруға арналған сандық дерек жоқ.",
    chartAria: "Денсаулық көрсеткіштерінің графигі",
    measurementUnit: "Өлшем бірлігі",
    visionRange: "Көру: мәні 0-ден 2-ге дейін",

    allMetrics: "Барлық көрсеткіштер",
    height: "Бой",
    weight: "Салмақ",
    bloodSugar: "Қандағы қант",
    hemoglobin: "Гемоглобин",
    bloodPressure: "Артериялық қысым",
    pressure: "Қысым",
    vision: "Көру",
    bmi: "ДСИ",

    leftEye: "Сол көз",
    rightEye: "Оң көз",
    upperPressure: "Жоғарғы қысым",
    lowerPressure: "Төменгі қысым",
    leftShort: "С",
    rightShort: "О",
    leftValue: "Сол көз",
    rightValue: "Оң көз",

    example1755: "Мысалы: 175,5",
    example725: "Мысалы: 72,5",
    example54: "Мысалы: 5,4",
    example135: "Мысалы: 135",
    example10: "Мысалы: 1,0",
    example08: "Мысалы: 0,8",
    example120: "Мысалы: 120",
    example80: "Мысалы: 80",

    belowNormal: "Қалыптан төмен",
    normal: "Қалыпты",
    aboveNormal: "Қалыптан жоғары",
    highValue: "Жоғары көрсеткіш",

    genericError: "Қате пайда болды.",
    loadError:
      "Денсаулық көрсеткіштерін жүктеу мүмкін болмады.",
    invalidMeasurementDate:
      "Өлшеу күні мен уақытын дұрыс көрсетіңіз.",
    futureMeasurementDate:
      "Өлшеу күні болашақта болмауы керек.",
    bothEyesRequired:
      "Сол және оң көз көрсеткіштерін енгізіңіз.",
    visionRangeError:
      "Көру көрсеткіші 0 мен 2 аралығында болуы керек.",
    bothPressuresRequired:
      "Жоғарғы және төменгі қысымды енгізіңіз.",
    systolicRangeError:
      "Жоғарғы қысым 60–260 мм сын. бағ. аралығында болуы керек.",
    diastolicRangeError:
      "Төменгі қысым 20–180 мм сын. бағ. аралығында болуы керек.",
    systolicGreaterError:
      "Жоғарғы қысым төменгі қысымнан жоғары болуы керек.",
    numericValueRequired:
      "Дұрыс сандық мәнді енгізіңіз.",
    allowedRange: "Рұқсат етілген аралық",
    savedWithBmi:
      "Көрсеткіш сақталды. ДСИ автоматты түрде қайта есептелді.",
    saved: "Денсаулық көрсеткіші сәтті сақталды.",
    saveError: "Көрсеткішті сақтау мүмкін болмады.",

    unitCm: "см",
    unitKg: "кг",
    unitMmol: "ммоль/л",
    unitGl: "г/л",
    unitPressure: "мм сын. бағ.",
    unitBmi: "кг/м²",
  },
};

function getMetricLabel(type, text, short = false) {
  const labels = {
    height: text.height,
    weight: text.weight,
    blood_sugar: text.bloodSugar,
    hemoglobin: text.hemoglobin,
    blood_pressure: short
      ? text.pressure
      : text.bloodPressure,
    vision: text.vision,
    bmi: text.bmi,
  };

  return labels[type] || type;
}

function getMetricUnit(type, text) {
  const units = {
    height: text.unitCm,
    weight: text.unitKg,
    blood_sugar: text.unitMmol,
    hemoglobin: text.unitGl,
    blood_pressure: text.unitPressure,
    bmi: text.unitBmi,
  };

  return units[type] || "";
}

function getMetricPlaceholder(type, text) {
  const placeholders = {
    height: text.example1755,
    weight: text.example725,
    blood_sugar: text.example54,
    hemoglobin: text.example135,
  };

  return placeholders[type] || "";
}

const METRIC_OPTIONS = {
  height: {
    label: "Рост",
    unit: "см",
    min: 30,
    max: 280,
    placeholder: "Например: 175,5",
  },

  weight: {
    label: "Вес",
    unit: "кг",
    min: 2,
    max: 500,
    placeholder: "Например: 72,5",
  },

  blood_sugar: {
    label: "Сахар в крови",
    unit: "ммоль/л",
    min: 1,
    max: 50,
    placeholder: "Например: 5,4",
  },

  hemoglobin: {
    label: "Гемоглобин",
    unit: "г/л",
    min: 20,
    max: 250,
    placeholder: "Например: 135",
  },

  blood_pressure: {
    label: "Артериальное давление",
    unit: "мм рт. ст.",
    special: true,
  },

  vision: {
    label: "Зрение",
    unit: "",
    special: true,
  },

  bmi: {
    label: "ИМТ",
    unit: "кг/м²",
  },
};

const GRAPH_OPTIONS = [
  {
    value: "height",
    label: "Рост",
  },
  {
    value: "weight",
    label: "Вес",
  },
  {
    value: "blood_sugar",
    label: "Сахар в крови",
  },
  {
    value: "hemoglobin",
    label: "Гемоглобин",
  },
  {
    value: "blood_pressure",
    label: "Давление",
  },
  {
    value: "vision",
    label: "Зрение",
  },
  {
    value: "bmi",
    label: "ИМТ",
  },
];

const HISTORY_FILTERS = [
  {
    value: "all",
    label: "Все показатели",
  },
  {
    value: "height",
    label: "Рост",
  },
  {
    value: "weight",
    label: "Вес",
  },
  {
    value: "blood_sugar",
    label: "Сахар в крови",
  },
  {
    value: "hemoglobin",
    label: "Гемоглобин",
  },
  {
    value: "blood_pressure",
    label: "Артериальное давление",
  },
  {
    value: "vision",
    label: "Зрение",
  },
  {
    value: "bmi",
    label: "ИМТ",
  },
];

const CARD_DEFINITIONS = [
  {
    type: "height",
    title: "Рост",
    icon: "📏",
  },
  {
    type: "weight",
    title: "Вес",
    icon: "⚖️",
  },
  {
    type: "blood_sugar",
    title: "Сахар в крови",
    icon: "🩸",
  },
  {
    type: "hemoglobin",
    title: "Гемоглобин",
    icon: "🧪",
  },
  {
    type: "blood_pressure",
    title: "Артериальное давление",
    icon: "💓",
  },
  {
    type: "vision",
    title: "Зрение",
    icon: "👁️",
  },
  {
    type: "bmi",
    title: "ИМТ",
    icon: "📊",
  },
];

const DISPLAYED_METRIC_TYPES = new Set([
  "height",
  "weight",
  "blood_sugar",
  "hemoglobin",
  "systolic_pressure",
  "diastolic_pressure",
  "vision_left",
  "vision_right",
  "bmi",
]);

function extractArray(response) {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  return [];
}

function getErrorMessage(error, fallback = "Произошла ошибка.") {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function toDateTimeLocal(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60 * 1000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

function normalizeNumber(value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const number = Number(
    String(value)
      .trim()
      .replace(",", ".")
  );

  return Number.isFinite(number) ? number : null;
}

function formatNumber(value, isKazakh = false) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat(isKazakh ? "kk-KZ" : "ru-RU", {
    maximumFractionDigits: 2,
  }).format(number);
}

function formatDate(value, isKazakh = false, text = TEXTS.ru) {
  if (!value) {
    return text.noData;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return text.noData;
  }

  return date.toLocaleDateString(isKazakh ? "kk-KZ" : "ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value, isKazakh = false, text = TEXTS.ru) {
  if (!value) {
    return text.dateNotSpecified;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return text.dateNotSpecified;
  }

  return date.toLocaleString(isKazakh ? "kk-KZ" : "ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMetricTime(metric) {
  const measuredTime = new Date(
    metric?.measured_at || 0
  ).getTime();

  const createdTime = new Date(
    metric?.created_at || 0
  ).getTime();

  return {
    measuredTime: Number.isFinite(measuredTime)
      ? measuredTime
      : 0,

    createdTime: Number.isFinite(createdTime)
      ? createdTime
      : 0,
  };
}

function sortMetricsDescending(metrics) {
  return [...metrics].sort((first, second) => {
    const firstTime = getMetricTime(first);
    const secondTime = getMetricTime(second);

    if (secondTime.measuredTime !== firstTime.measuredTime) {
      return secondTime.measuredTime - firstTime.measuredTime;
    }

    return secondTime.createdTime - firstTime.createdTime;
  });
}

function getLatestMetric(metrics, metricType) {
  return sortMetricsDescending(metrics).find(
    (metric) => metric.metric_type === metricType
  );
}

function buildVisionRows(metrics) {
  const grouped = new Map();

  for (const metric of metrics) {
    if (
      metric.metric_type !== "vision_left" &&
      metric.metric_type !== "vision_right"
    ) {
      continue;
    }

    const key =
      metric.measured_at ||
      metric.created_at ||
      metric.id;

    const current = grouped.get(key) || {
      id: key,
      measuredAt: metric.measured_at,
      createdAt: metric.created_at,
      left: null,
      right: null,
    };

    if (metric.metric_type === "vision_left") {
      current.left = Number(metric.value);
    }

    if (metric.metric_type === "vision_right") {
      current.right = Number(metric.value);
    }

    grouped.set(key, current);
  }

  return Array.from(grouped.values()).sort((first, second) => {
    const firstMeasured = new Date(
      first.measuredAt || 0
    ).getTime();

    const secondMeasured = new Date(
      second.measuredAt || 0
    ).getTime();

    if (secondMeasured !== firstMeasured) {
      return secondMeasured - firstMeasured;
    }

    return (
      new Date(second.createdAt || 0).getTime() -
      new Date(first.createdAt || 0).getTime()
    );
  });
}

function buildPressureRows(metrics) {
  const grouped = new Map();

  for (const metric of metrics) {
    if (
      metric.metric_type !== "systolic_pressure" &&
      metric.metric_type !== "diastolic_pressure"
    ) {
      continue;
    }

    const key =
      metric.measured_at ||
      metric.created_at ||
      metric.id;

    const current = grouped.get(key) || {
      id: key,
      measuredAt: metric.measured_at,
      createdAt: metric.created_at,
      systolic: null,
      diastolic: null,
    };

    if (metric.metric_type === "systolic_pressure") {
      current.systolic = Number(metric.value);
    }

    if (metric.metric_type === "diastolic_pressure") {
      current.diastolic = Number(metric.value);
    }

    grouped.set(key, current);
  }

  return Array.from(grouped.values()).sort((first, second) => {
    const firstMeasured = new Date(
      first.measuredAt || 0
    ).getTime();

    const secondMeasured = new Date(
      second.measuredAt || 0
    ).getTime();

    if (secondMeasured !== firstMeasured) {
      return secondMeasured - firstMeasured;
    }

    return (
      new Date(second.createdAt || 0).getTime() -
      new Date(first.createdAt || 0).getTime()
    );
  });
}

function buildHistoryRows(metrics, text, isKazakh) {
  const regularRows = metrics
    .filter((metric) =>
      [
        "height",
        "weight",
        "blood_sugar",
        "hemoglobin",
        "bmi",
      ].includes(metric.metric_type)
    )
    .map((metric) => {
      const definition =
        METRIC_OPTIONS[metric.metric_type];

      return {
        id: metric.id,
        type: metric.metric_type,
        label:
          getMetricLabel(metric.metric_type, text),
        value: formatNumber(metric.value, isKazakh),
        unit:
          metric.unit ||
          getMetricUnit(
            metric.metric_type,
            text
          ) ||
          "",
        measuredAt: metric.measured_at,
        createdAt: metric.created_at,
      };
    });

  const pressureRows = buildPressureRows(metrics).map((row) => ({
    id: `pressure-${row.id}`,
    type: "blood_pressure",
    label: text.bloodPressure,
    value: `${
      row.systolic !== null
        ? formatNumber(row.systolic, isKazakh)
        : "—"
    }/${
      row.diastolic !== null
        ? formatNumber(row.diastolic, isKazakh)
        : "—"
    }`,
    unit: text.unitPressure,
    measuredAt: row.measuredAt,
    createdAt: row.createdAt,
  }));

  const visionRows = buildVisionRows(metrics).map((row) => ({
    id: row.id,
    type: "vision",
    label: text.vision,
    value: `${text.leftValue}: ${
      row.left !== null
        ? formatNumber(row.left, isKazakh)
        : "—"
    } · ${text.rightValue}: ${
      row.right !== null
        ? formatNumber(row.right, isKazakh)
        : "—"
    }`,
    unit: "",
    measuredAt: row.measuredAt,
    createdAt: row.createdAt,
  }));

  return [
    ...regularRows,
    ...pressureRows,
    ...visionRows,
  ].sort((first, second) => {
    const firstMeasured = new Date(
      first.measuredAt || 0
    ).getTime();

    const secondMeasured = new Date(
      second.measuredAt || 0
    ).getTime();

    if (secondMeasured !== firstMeasured) {
      return secondMeasured - firstMeasured;
    }

    return (
      new Date(second.createdAt || 0).getTime() -
      new Date(first.createdAt || 0).getTime()
    );
  });
}

function getBmiDescription(value, text) {
  const bmi = Number(value);

  if (!Number.isFinite(bmi)) {
    return "";
  }

  if (bmi < 18.5) {
    return text.belowNormal;
  }

  if (bmi < 25) {
    return text.normal;
  }

  if (bmi < 30) {
    return text.aboveNormal;
  }

  return text.highValue;
}

export default function Metrics() {
  const { language } = useLanguage();

  const isKazakh =
    language === "kk" ||
    language === "kz";

  const text =
    isKazakh
      ? TEXTS.kk
      : TEXTS.ru;

  const [metrics, setMetrics] = useState([]);

  const [metricType, setMetricType] =
    useState("height");

  const [value, setValue] = useState("");

  const [visionLeft, setVisionLeft] =
    useState("");

  const [visionRight, setVisionRight] =
    useState("");

  const [systolicPressure, setSystolicPressure] =
    useState("");

  const [diastolicPressure, setDiastolicPressure] =
    useState("");

  const [measuredAt, setMeasuredAt] =
    useState(toDateTimeLocal());

  const [graphType, setGraphType] =
    useState("height");

  const [historyFilter, setHistoryFilter] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const selectedDefinition = {
    ...METRIC_OPTIONS[metricType],
    label: getMetricLabel(
      metricType,
      text
    ),
    unit: getMetricUnit(
      metricType,
      text
    ),
    placeholder: getMetricPlaceholder(
      metricType,
      text
    ),
  };

  const loadMetrics = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get(
        "/health-metrics"
      );

      const receivedMetrics =
        extractArray(response).filter((metric) =>
          DISPLAYED_METRIC_TYPES.has(
            metric.metric_type
          )
        );

      setMetrics(receivedMetrics);
    } catch (error) {
      setMetrics([]);

      setMessage({
        type: "error",
        text: getErrorMessage(
          error,
          text.loadError
        ),
      });
    } finally {
      setLoading(false);
    }
  }, [text.loadError]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const visionRows = useMemo(
    () => buildVisionRows(metrics),
    [metrics]
  );

  const pressureRows = useMemo(
    () => buildPressureRows(metrics),
    [metrics]
  );

  const latestCards = useMemo(() => {
    return CARD_DEFINITIONS.map((card) => {
      if (card.type === "vision") {
        const latestVision = visionRows[0];

        return {
          ...card,
          title: getMetricLabel(
            card.type,
            text
          ),
          value: latestVision
            ? `${text.leftShort}: ${
                latestVision.left !== null
                  ? formatNumber(
                      latestVision.left,
                      isKazakh
                    )
                  : "—"
              } / ${text.rightShort}: ${
                latestVision.right !== null
                  ? formatNumber(
                      latestVision.right,
                      isKazakh
                    )
                  : "—"
              }`
            : "—",

          unit: "",
          measuredAt:
            latestVision?.measuredAt,
          description: "",
        };
      }

      if (card.type === "blood_pressure") {
        const latestPressure = pressureRows[0];

        return {
          ...card,
          title: getMetricLabel(
            card.type,
            text
          ),
          value: latestPressure
            ? `${
                latestPressure.systolic !== null
                  ? formatNumber(
                      latestPressure.systolic,
                      isKazakh
                    )
                  : "—"
              }/${
                latestPressure.diastolic !== null
                  ? formatNumber(
                      latestPressure.diastolic,
                      isKazakh
                    )
                  : "—"
              }`
            : "—",

          unit: text.unitPressure,
          measuredAt:
            latestPressure?.measuredAt,
          description: "",
        };
      }

      const latest = getLatestMetric(
        metrics,
        card.type
      );

      const definition =
        METRIC_OPTIONS[card.type];

      return {
        ...card,
        title: getMetricLabel(
          card.type,
          text
        ),
        value: latest
          ? formatNumber(latest.value, isKazakh)
          : "—",

        unit:
          latest?.unit ||
          getMetricUnit(card.type, text) ||
          "",

        measuredAt:
          latest?.measured_at,

        description:
          card.type === "bmi" && latest
            ? getBmiDescription(
                latest.value,
                text
              )
            : "",
      };
    });
  }, [metrics, visionRows, pressureRows, text, isKazakh]);

  const historyRows = useMemo(
    () => buildHistoryRows(metrics, text, isKazakh),
    [metrics, text, isKazakh]
  );

  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") {
      return historyRows;
    }

    return historyRows.filter(
      (row) => row.type === historyFilter
    );
  }, [historyRows, historyFilter]);

  function resetForm() {
    setValue("");
    setVisionLeft("");
    setVisionRight("");
    setSystolicPressure("");
    setDiastolicPressure("");
    setMeasuredAt(toDateTimeLocal());
  }

  function handleMetricTypeChange(event) {
    const nextType = event.target.value;

    setMetricType(nextType);
    setValue("");
    setVisionLeft("");
    setVisionRight("");
    setSystolicPressure("");
    setDiastolicPressure("");

    setMessage({
      type: "",
      text: "",
    });
  }

  async function handleAddMetric(event) {
    event.preventDefault();

    setMessage({
      type: "",
      text: "",
    });

    const measuredDate = new Date(measuredAt);

    if (
      !measuredAt ||
      Number.isNaN(measuredDate.getTime())
    ) {
      setMessage({
        type: "error",
        text:
          text.invalidMeasurementDate,
      });

      return;
    }

    if (measuredDate.getTime() > Date.now() + 300000) {
      setMessage({
        type: "error",
        text:
          text.futureMeasurementDate,
      });

      return;
    }

    setSaving(true);

    try {
      const measuredAtIso =
        measuredDate.toISOString();

      if (metricType === "vision") {
        const leftValue =
          normalizeNumber(visionLeft);

        const rightValue =
          normalizeNumber(visionRight);

        if (
          leftValue === null ||
          rightValue === null
        ) {
          throw new Error(
            text.bothEyesRequired
          );
        }

        if (
          leftValue < 0 ||
          leftValue > 2 ||
          rightValue < 0 ||
          rightValue > 2
        ) {
          throw new Error(
            text.visionRangeError
          );
        }

        await Promise.all([
          api.post("/health-metrics", {
            metricType: "vision_left",
            value: leftValue,
            measuredAt: measuredAtIso,
          }),

          api.post("/health-metrics", {
            metricType: "vision_right",
            value: rightValue,
            measuredAt: measuredAtIso,
          }),
        ]);
      } else if (metricType === "blood_pressure") {
        const systolicValue =
          normalizeNumber(systolicPressure);

        const diastolicValue =
          normalizeNumber(diastolicPressure);

        if (
          systolicValue === null ||
          diastolicValue === null
        ) {
          throw new Error(
            text.bothPressuresRequired
          );
        }

        if (
          systolicValue < 60 ||
          systolicValue > 260
        ) {
          throw new Error(
            text.systolicRangeError
          );
        }

        if (
          diastolicValue < 20 ||
          diastolicValue > 180
        ) {
          throw new Error(
            text.diastolicRangeError
          );
        }

        if (systolicValue <= diastolicValue) {
          throw new Error(
            text.systolicGreaterError
          );
        }

        await Promise.all([
          api.post("/health-metrics", {
            metricType: "systolic_pressure",
            value: systolicValue,
            measuredAt: measuredAtIso,
          }),

          api.post("/health-metrics", {
            metricType: "diastolic_pressure",
            value: diastolicValue,
            measuredAt: measuredAtIso,
          }),
        ]);
      } else {
        const normalizedValue =
          normalizeNumber(value);

        if (normalizedValue === null) {
          throw new Error(
            text.numericValueRequired
          );
        }

        if (
          normalizedValue <
            selectedDefinition.min ||
          normalizedValue >
            selectedDefinition.max
        ) {
          throw new Error(
            `${text.allowedRange}: ${selectedDefinition.min}–${selectedDefinition.max} ${selectedDefinition.unit}.`
          );
        }

        await api.post("/health-metrics", {
          metricType,
          value: normalizedValue,
          measuredAt: measuredAtIso,
        });
      }

      setGraphType(metricType);

      resetForm();

      setMessage({
        type: "success",
        text:
          metricType === "height" ||
          metricType === "weight"
            ? text.savedWithBmi
            : text.saved,
      });

      await loadMetrics();
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(
          error,
          text.saveError
        ),
      });
    } finally {
      setSaving(false);
    }
  }

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
          onClick={loadMetrics}
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

      <section style={styles.latestSection}>
        <h2 style={styles.sectionTitle}>
          {text.latestMetrics}
        </h2>

        <div style={styles.latestGrid}>
          {latestCards.map((card) => (
            <article
              key={card.type}
              style={styles.latestCard}
            >
              <div style={styles.cardIcon}>
                {card.icon}
              </div>

              <div style={styles.cardContent}>
                <span style={styles.cardLabel}>
                  {card.title}
                </span>

                <div style={styles.cardValueRow}>
                  <strong style={styles.cardValue}>
                    {card.value}
                  </strong>

                  {card.value !== "—" &&
                    card.unit && (
                      <span style={styles.cardUnit}>
                        {card.unit}
                      </span>
                    )}
                </div>

                {card.description && (
                  <span
                    style={styles.cardDescription}
                  >
                    {card.description}
                  </span>
                )}

                <span style={styles.cardDate}>
                  {card.measuredAt
                    ? formatDate(
                        card.measuredAt,
                        isKazakh,
                        text
                      )
                    : text.noData}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div style={styles.mainGrid}>
        <form
          onSubmit={handleAddMetric}
          style={styles.formCard}
        >
          <div style={styles.formHeading}>
            <div style={styles.formIcon}>
              <RiAddLine />
            </div>

            <div>
              <h2 style={styles.formTitle}>
                {text.addMeasurement}
              </h2>

              <p style={styles.formText}>
                {text.bmiHint}
              </p>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              {text.metricType}
            </label>

            <select
              value={metricType}
              onChange={
                handleMetricTypeChange
              }
              style={{
                ...styles.input,
                colorScheme: "dark",
              }}
            >
              <option
                value="height"
                style={styles.option}
              >
                {text.height}
              </option>

              <option
                value="weight"
                style={styles.option}
              >
                {text.weight}
              </option>

              <option
                value="blood_sugar"
                style={styles.option}
              >
                {text.bloodSugar}
              </option>

              <option
                value="hemoglobin"
                style={styles.option}
              >
                {text.hemoglobin}
              </option>

              <option
                value="blood_pressure"
                style={styles.option}
              >
                {text.bloodPressure}
              </option>

              <option
                value="vision"
                style={styles.option}
              >
                {text.vision}
              </option>
            </select>
          </div>

          {metricType === "vision" ? (
            <div style={styles.visionGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  {text.leftEye}
                </label>

                <input
                  type="text"
                  inputMode="decimal"
                  value={visionLeft}
                  onChange={(event) =>
                    setVisionLeft(
                      event.target.value
                    )
                  }
                  placeholder={text.example10}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  {text.rightEye}
                </label>

                <input
                  type="text"
                  inputMode="decimal"
                  value={visionRight}
                  onChange={(event) =>
                    setVisionRight(
                      event.target.value
                    )
                  }
                  placeholder={text.example08}
                  style={styles.input}
                  required
                />
              </div>
            </div>
          ) : metricType === "blood_pressure" ? (
            <div style={styles.visionGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  {text.upperPressure}
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  value={systolicPressure}
                  onChange={(event) =>
                    setSystolicPressure(
                      event.target.value
                    )
                  }
                  placeholder={text.example120}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  {text.lowerPressure}
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  value={diastolicPressure}
                  onChange={(event) =>
                    setDiastolicPressure(
                      event.target.value
                    )
                  }
                  placeholder={text.example80}
                  style={styles.input}
                  required
                />
              </div>
            </div>
          ) : (
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                {text.value}
                {selectedDefinition?.unit
                  ? ` (${selectedDefinition.unit})`
                  : ""}
              </label>

              <input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(event) =>
                  setValue(
                    event.target.value
                  )
                }
                placeholder={
                  selectedDefinition?.placeholder
                }
                style={styles.input}
                required
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              {text.measurementDateTime}
            </label>

            <input
              type="datetime-local"
              value={measuredAt}
              max={toDateTimeLocal()}
              onChange={(event) =>
                setMeasuredAt(
                  event.target.value
                )
              }
              style={{
                ...styles.input,
                colorScheme: "dark",
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              ...styles.saveButton,
              ...(saving
                ? styles.disabled
                : {}),
            }}
          >
            {metricType === "vision" ? (
              <RiEyeLine />
            ) : (
              <RiHeartPulseLine />
            )}

            {saving
              ? text.saving
              : text.saveMetric}
          </button>
        </form>

        <section style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                {text.dynamics}
              </h2>

              <p style={styles.chartSubtitle}>
                {text.chartLast20}
              </p>
            </div>
          </div>

          <div style={styles.chartTabs}>
            {GRAPH_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setGraphType(
                    option.value
                  )
                }
                style={{
                  ...styles.chartTab,
                  ...(graphType ===
                  option.value
                    ? styles.activeChartTab
                    : {}),
                }}
              >
                {getMetricLabel(option.value, text, true)}
              </button>
            ))}
          </div>

          <MetricChart
            metrics={metrics}
            graphType={graphType}
            text={text}
            isKazakh={isKazakh}
          />
        </section>
      </div>

      <section style={styles.historyCard}>
        <div style={styles.historyHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              {text.history}
            </h2>

            <p style={styles.chartSubtitle}>
              {text.recordsCount}:{" "}
              {historyRows.length}
            </p>
          </div>

          <select
            value={historyFilter}
            onChange={(event) =>
              setHistoryFilter(
                event.target.value
              )
            }
            style={{
              ...styles.filterSelect,
              colorScheme: "dark",
            }}
          >
            {HISTORY_FILTERS.map(
              (filter) => (
                <option
                  key={filter.value}
                  value={filter.value}
                  style={styles.option}
                >
                  {filter.value === "all" ? text.allMetrics : getMetricLabel(filter.value, text)}
                </option>
              )
            )}
          </select>
        </div>

        {loading ? (
          <div style={styles.emptyState}>
            {text.loadingMetrics}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div style={styles.emptyState}>
            {text.noHistoryData}
          </div>
        ) : (
          <div style={styles.historyList}>
            {filteredHistory.map((row) => (
              <article
                key={row.id}
                style={styles.historyItem}
              >
                <div
                  style={styles.historyIcon}
                >
                  {row.type === "vision" ? (
                    <RiEyeLine />
                  ) : (
                    <RiHeartPulseLine />
                  )}
                </div>

                <div
                  style={styles.historyContent}
                >
                  <strong
                    style={styles.historyLabel}
                  >
                    {row.label}
                  </strong>

                  <span
                    style={styles.historyDate}
                  >
                    {formatDateTime(
                      row.measuredAt,
                      isKazakh,
                      text
                    )}
                  </span>
                </div>

                <div
                  style={styles.historyValue}
                >
                  <strong>{row.value}</strong>

                  {row.unit && (
                    <span>{row.unit}</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricChart({
  metrics,
  graphType,
  text,
  isKazakh,
}) {
  const chart = useMemo(() => {
    if (graphType === "vision") {
      const rows = buildVisionRows(metrics)
        .sort(
          (first, second) =>
            new Date(
              first.measuredAt
            ).getTime() -
            new Date(
              second.measuredAt
            ).getTime()
        )
        .slice(-20)
        .map((row) => ({
          dateLabel: formatDate(
            row.measuredAt,
            isKazakh,
            text
          ),
          measuredAt: row.measuredAt,
          left: row.left,
          right: row.right,
        }));

      return {
        data: rows,
        unit: "",
        series: [
          {
            key: "left",
            label: text.leftEye,
            color: "#818cf8",
          },
          {
            key: "right",
            label: text.rightEye,
            color: "#34d399",
          },
        ],
      };
    }

    if (graphType === "blood_pressure") {
      const rows = buildPressureRows(metrics)
        .sort(
          (first, second) =>
            new Date(
              first.measuredAt
            ).getTime() -
            new Date(
              second.measuredAt
            ).getTime()
        )
        .slice(-20)
        .map((row) => ({
          dateLabel: formatDate(
            row.measuredAt,
            isKazakh,
            text
          ),
          measuredAt: row.measuredAt,
          systolic: row.systolic,
          diastolic: row.diastolic,
        }));

      return {
        data: rows,
        unit: text.unitPressure,
        series: [
          {
            key: "systolic",
            label: text.upperPressure,
            color: "#fb7185",
          },
          {
            key: "diastolic",
            label: text.lowerPressure,
            color: "#38bdf8",
          },
        ],
      };
    }

    const definition =
      METRIC_OPTIONS[graphType];

    const rows = metrics
      .filter(
        (metric) =>
          metric.metric_type ===
          graphType
      )
      .sort(
        (first, second) =>
          new Date(
            first.measured_at
          ).getTime() -
          new Date(
            second.measured_at
          ).getTime()
      )
      .slice(-20)
      .map((metric) => ({
        dateLabel: formatDate(
          metric.measured_at,
          isKazakh,
          text
        ),
        measuredAt: metric.measured_at,
        value: Number(metric.value),
      }));

    return {
      data: rows,
      unit:
        metrics.find(
          (metric) =>
            metric.metric_type ===
            graphType
        )?.unit ||
        getMetricUnit(graphType, text) ||
        "",

      series: [
        {
          key: "value",
          label:
            getMetricLabel(graphType, text),
          color: "#818cf8",
        },
      ],
    };
  }, [metrics, graphType, text, isKazakh]);

  if (chart.data.length === 0) {
    return (
      <div style={styles.chartEmpty}>
        {text.chartNeedMeasurement}
      </div>
    );
  }

  const allValues = [];

  for (const row of chart.data) {
    for (const series of chart.series) {
      const value = Number(
        row[series.key]
      );

      if (Number.isFinite(value)) {
        allValues.push(value);
      }
    }
  }

  if (allValues.length === 0) {
    return (
      <div style={styles.chartEmpty}>
        {text.chartNoNumeric}
      </div>
    );
  }

  const rawMinimum = Math.min(
    ...allValues
  );

  const rawMaximum = Math.max(
    ...allValues
  );

  const difference =
    rawMaximum - rawMinimum;

  const chartPadding =
    difference === 0
      ? Math.max(
          Math.abs(rawMaximum) * 0.1,
          0.5
        )
      : difference * 0.15;

  const minimum =
    rawMinimum - chartPadding;

  const maximum =
    rawMaximum + chartPadding;

  const width = 800;
  const height = 300;

  const leftPadding = 60;
  const rightPadding = 25;
  const topPadding = 25;
  const bottomPadding = 50;

  const chartWidth =
    width -
    leftPadding -
    rightPadding;

  const chartHeight =
    height -
    topPadding -
    bottomPadding;

  function getX(index) {
    if (chart.data.length === 1) {
      return (
        leftPadding +
        chartWidth / 2
      );
    }

    return (
      leftPadding +
      (index /
        (chart.data.length - 1)) *
        chartWidth
    );
  }

  function getY(value) {
    return (
      topPadding +
      ((maximum - value) /
        (maximum - minimum)) *
        chartHeight
    );
  }

  const gridLines = Array.from(
    { length: 5 },
    (_, index) => {
      const ratio = index / 4;

      return {
        value:
          maximum -
          ratio *
            (maximum - minimum),

        y:
          topPadding +
          ratio * chartHeight,
      };
    }
  );

  const labelIndexes = [
    0,
    Math.floor(
      (chart.data.length - 1) / 2
    ),
    chart.data.length - 1,
  ].filter(
    (value, index, array) =>
      array.indexOf(value) === index
  );

  return (
    <div style={styles.chartWrapper}>
      <div style={styles.legend}>
        {chart.series.map((series) => (
          <div
            key={series.key}
            style={styles.legendItem}
          >
            <span
              style={{
                ...styles.legendDot,
                background:
                  series.color,
              }}
            />

            {series.label}
          </div>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={styles.chartSvg}
        role="img"
        aria-label={text.chartAria}
      >
        {gridLines.map(
          (line, index) => (
            <g key={index}>
              <line
                x1={leftPadding}
                x2={
                  width -
                  rightPadding
                }
                y1={line.y}
                y2={line.y}
                stroke="rgba(148,163,184,0.15)"
                strokeWidth="1"
              />

              <text
                x={leftPadding - 10}
                y={line.y + 4}
                textAnchor="end"
                fill="#64748b"
                fontSize="11"
              >
                {formatNumber(
                  line.value,
                  isKazakh
                )}
              </text>
            </g>
          )
        )}

        {chart.series.map((series) => {
          const points = chart.data
            .map((row, index) => {
              const value = Number(
                row[series.key]
              );

              if (
                !Number.isFinite(value)
              ) {
                return null;
              }

              return {
                x: getX(index),
                y: getY(value),
                value,
                row,
              };
            })
            .filter(Boolean);

          return (
            <g key={series.key}>
              {points.length > 1 && (
                <polyline
                  fill="none"
                  stroke={series.color}
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={points
                    .map(
                      (point) =>
                        `${point.x},${point.y}`
                    )
                    .join(" ")}
                />
              )}

              {points.map(
                (point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill={series.color}
                    stroke="#0f172a"
                    strokeWidth="2"
                  >
                    <title>
                      {`${point.row.dateLabel}: ${formatNumber(
                        point.value,
                        isKazakh
                      )}${
                        chart.unit
                          ? ` ${chart.unit}`
                          : ""
                      }`}
                    </title>
                  </circle>
                )
              )}
            </g>
          );
        })}

        {labelIndexes.map((index) => (
          <text
            key={index}
            x={getX(index)}
            y={height - 15}
            textAnchor="middle"
            fill="#64748b"
            fontSize="11"
          >
            {chart.data[index].dateLabel}
          </text>
        ))}
      </svg>

      <div style={styles.chartUnit}>
        {chart.unit
          ? `${text.measurementUnit}: ${chart.unit}`
          : text.visionRange}
      </div>
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
    flexWrap: "wrap",
    gap: "18px",
    marginBottom: "28px",
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
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 15px",
    border:
      "1px solid rgba(99,102,241,0.3)",
    borderRadius: "10px",
    background:
      "rgba(99,102,241,0.1)",
    color: "#c7d2fe",
    cursor: "pointer",
    fontWeight: 700,
  },

  alert: {
    marginBottom: "22px",
    padding: "13px 16px",
    border: "1px solid",
    borderRadius: "11px",
  },

  errorAlert: {
    color: "#fca5a5",
    borderColor:
      "rgba(239,68,68,0.3)",
    background:
      "rgba(239,68,68,0.1)",
  },

  successAlert: {
    color: "#6ee7b7",
    borderColor:
      "rgba(16,185,129,0.3)",
    background:
      "rgba(16,185,129,0.1)",
  },

  latestSection: {
    marginBottom: "26px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "21px",
    fontWeight: 750,
  },

  latestGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "13px",
    marginTop: "15px",
  },

  latestCard: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    minHeight: "105px",
    padding: "17px",
    border:
      "1px solid rgba(255,255,255,0.07)",
    borderRadius: "15px",
    background:
      "rgba(30,41,59,0.45)",
  },

  cardIcon: {
    width: "43px",
    height: "43px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "12px",
    background:
      "rgba(99,102,241,0.13)",
    fontSize: "21px",
  },

  cardContent: {
    minWidth: 0,
  },

  cardLabel: {
    color: "#94a3b8",
    fontSize: "11px",
  },

  cardValueRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "5px",
    margin: "5px 0",
  },

  cardValue: {
    fontSize: "22px",
    color: "#f8fafc",
  },

  cardUnit: {
    color: "#94a3b8",
    fontSize: "10px",
  },

  cardDescription: {
    display: "block",
    marginBottom: "4px",
    color: "#fbbf24",
    fontSize: "10px",
  },

  cardDate: {
    color: "#64748b",
    fontSize: "10px",
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(350px, 1fr))",
    alignItems: "start",
    gap: "20px",
    marginBottom: "22px",
  },

  formCard: {
    padding: "24px",
    border:
      "1px solid rgba(255,255,255,0.07)",
    borderRadius: "17px",
    background:
      "rgba(30,41,59,0.45)",
  },

  formHeading: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },

  formIcon: {
    width: "42px",
    height: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "11px",
    background:
      "rgba(16,185,129,0.12)",
    color: "#6ee7b7",
    fontSize: "21px",
  },

  formTitle: {
    margin: "0 0 4px",
    fontSize: "20px",
  },

  formText: {
    margin: 0,
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.4,
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    marginBottom: "16px",
  },

  visionGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },

  label: {
    color: "#cbd5e1",
    fontSize: "12px",
    fontWeight: 700,
  },

  input: {
    width: "100%",
    minHeight: "44px",
    boxSizing: "border-box",
    padding: "11px 13px",
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px",
    outline: "none",
    background: "#11182e",
    color: "#ffffff",
  },

  option: {
    background: "#11182e",
    color: "#ffffff",
  },

  saveButton: {
    width: "100%",
    minHeight: "46px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    border: "none",
    borderRadius: "11px",
    background:
      "linear-gradient(90deg, #059669, #10b981)",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 750,
  },

  chartCard: {
    minWidth: 0,
    padding: "24px",
    border:
      "1px solid rgba(255,255,255,0.07)",
    borderRadius: "17px",
    background:
      "rgba(30,41,59,0.45)",
  },

  chartHeader: {
    marginBottom: "15px",
  },

  chartSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "11px",
  },

  chartTabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: "7px",
    marginBottom: "15px",
  },

  chartTab: {
    padding: "7px 11px",
    border:
      "1px solid rgba(255,255,255,0.08)",
    borderRadius: "8px",
    background:
      "rgba(2,6,23,0.25)",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "11px",
  },

  activeChartTab: {
    borderColor:
      "rgba(99,102,241,0.45)",
    background:
      "rgba(99,102,241,0.18)",
    color: "#c7d2fe",
  },

  chartWrapper: {
    minWidth: 0,
  },

  chartSvg: {
    display: "block",
    width: "100%",
    height: "auto",
    minHeight: "250px",
    overflow: "visible",
  },

  chartEmpty: {
    minHeight: "250px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    borderRadius: "12px",
    background:
      "rgba(2,6,23,0.2)",
    color: "#64748b",
    textAlign: "center",
  },

  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "14px",
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#94a3b8",
    fontSize: "10px",
  },

  legendDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },

  chartUnit: {
    color: "#64748b",
    fontSize: "10px",
    textAlign: "right",
  },

  historyCard: {
    padding: "24px",
    border:
      "1px solid rgba(255,255,255,0.07)",
    borderRadius: "17px",
    background:
      "rgba(30,41,59,0.45)",
  },

  historyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "14px",
    marginBottom: "16px",
  },

  filterSelect: {
    minWidth: "190px",
    minHeight: "40px",
    padding: "8px 11px",
    border:
      "1px solid rgba(255,255,255,0.1)",
    borderRadius: "9px",
    background: "#11182e",
    color: "#ffffff",
  },

  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
    maxHeight: "500px",
    overflowY: "auto",
  },

  historyItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "13px 14px",
    border:
      "1px solid rgba(255,255,255,0.05)",
    borderRadius: "11px",
    background:
      "rgba(2,6,23,0.2)",
  },

  historyIcon: {
    width: "35px",
    height: "35px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "9px",
    background:
      "rgba(16,185,129,0.1)",
    color: "#6ee7b7",
  },

  historyContent: {
    flex: 1,
    minWidth: 0,
  },

  historyLabel: {
    display: "block",
    color: "#e2e8f0",
    fontSize: "12px",
  },

  historyDate: {
    display: "block",
    marginTop: "3px",
    color: "#64748b",
    fontSize: "10px",
  },

  historyValue: {
    display: "flex",
    alignItems: "baseline",
    gap: "5px",
    flexShrink: 0,
    color: "#f8fafc",
    fontSize: "14px",
  },

  emptyState: {
    padding: "30px",
    borderRadius: "12px",
    background:
      "rgba(2,6,23,0.2)",
    color: "#64748b",
    textAlign: "center",
  },

  disabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
};

