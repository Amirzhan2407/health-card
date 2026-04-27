import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../services/supabaseClient";
import "../styles/health.css";

const categoryOptions = [
  { value: "weight", label: "Вес", unit: "кг", type: "number" },
  { value: "height", label: "Рост", unit: "см", type: "number" },
  { value: "vision", label: "Зрение", unit: "диоптрии", type: "vision" },
  { value: "fluorography", label: "Флюорография", unit: "заключение", type: "text" },
];

const periodOptions = [
  { value: "1m", label: "1 месяц", months: 1 },
  { value: "3m", label: "3 месяца", months: 3 },
  { value: "6m", label: "Полгода", months: 6 },
  { value: "1y", label: "1 год", months: 12 },
  { value: "2y", label: "2 года", months: 24 },
];

const fluoroOptions = [
  "Без патологий",
  "Норма",
  "Требуется повтор",
  "Обнаружены изменения",
  "Другое",
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateRu(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

function getTodayISO() {
  const now = new Date();
  return toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
}

function getCategoryInfo(code) {
  return categoryOptions.find((x) => x.value === code) || {};
}

function getPeriodStartFromLatest(latestDate, months) {
  if (!latestDate) return "";

  const d = new Date(latestDate);
  d.setMonth(d.getMonth() - months);

  return toISODate(d);
}

function calculateBmi(weight, heightCm) {
  const w = Number(weight);
  const h = Number(heightCm) / 100;
  if (!w || !h) return null;
  return (w / (h * h)).toFixed(1);
}

function getBmiStatus(bmi) {
  const n = Number(bmi);
  if (!n) return "";
  if (n < 18.5) return "Недостаточный вес";
  if (n < 25) return "Норма";
  if (n < 30) return "Избыточный вес";
  return "Ожирение";
}

export default function HealthPage() {
  const todayISO = useMemo(() => getTodayISO(), []);
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const userIin = userData?.iin || "";

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartCategory, setChartCategory] = useState("weight");
  const [period, setPeriod] = useState("6m");

  const [category, setCategory] = useState("weight");
  const [value, setValue] = useState("");
  const [visionLeft, setVisionLeft] = useState("");
  const [visionRight, setVisionRight] = useState("");
  const [fluoroStatus, setFluoroStatus] = useState("Без патологий");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const currentCategory = getCategoryInfo(category);

  async function loadRecords() {
    try {
      setLoading(true);
      setError("");

      if (!userIin) {
        setRecords([]);
        return;
      }

      const { data, error } = await supabase
        .from("health_metric_records")
        .select("*")
        .eq("user_iin", userIin)
        .order("measured_at", { ascending: false });

      if (error) throw error;

      setRecords(data || []);
    } catch (e) {
      console.error(e);
      setError("Ошибка загрузки данных.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  const resetForm = (cat = "weight") => {
    setCategory(cat);
    setValue("");
    setVisionLeft("");
    setVisionRight("");
    setFluoroStatus("Без патологий");
    setNote("");
    setDate(todayISO);
    setError("");
  };

  const openAddModal = (cat = "weight") => {
    resetForm(cat);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setError("");
  };

  const validate = () => {
    if (!userIin) return "Не найден ИИН пользователя.";
    if (!date) return "Выберите дату.";
    if (date < todayISO) return "Нельзя выбрать прошедшую дату.";

    if (currentCategory.type === "number") {
      if (!value.trim()) return "Введите значение.";
      if (Number.isNaN(Number(value))) return "Введите число.";
      if (Number(value) <= 0) return "Значение должно быть больше 0.";
    }

    if (currentCategory.type === "vision") {
      if (!visionLeft.trim() || !visionRight.trim()) {
        return "Введите значение для левого и правого глаза.";
      }

      const left = Number(visionLeft);
      const right = Number(visionRight);

      if (Number.isNaN(left) || Number.isNaN(right)) {
        return "Зрение нужно вводить числом. Например: -1.5 или 0.8";
      }

      if (left < -20 || left > 20 || right < -20 || right > 20) {
        return "Зрение должно быть в диапазоне от -20 до +20.";
      }
    }

    if (currentCategory.type === "text") {
      if (!fluoroStatus.trim()) return "Выберите заключение.";
    }

    return "";
  };

  async function saveHealthData() {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    try {
      setSaving(true);
      setError("");

      let payload = {
        user_iin: userIin,
        category_code: category,
        measured_at: date,
        note: note.trim() || null,
        value_number: null,
        value_text: null,
        value_json: null,
      };

      if (currentCategory.type === "number") {
        payload.value_number = Number(value);
      }

      if (currentCategory.type === "vision") {
        payload.value_json = {
          left: Number(visionLeft),
          right: Number(visionRight),
        };
        payload.value_text = `Левый: ${visionLeft}, Правый: ${visionRight}`;
      }

      if (currentCategory.type === "text") {
        payload.value_text = fluoroStatus;
      }

      const { data, error } = await supabase
        .from("health_metric_records")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setRecords((prev) => [data, ...prev]);
      closeModal();
    } catch (e) {
      console.error(e);
      setError(e.message || "Ошибка сохранения.");
    } finally {
      setSaving(false);
    }
  }

  const groupedCards = categoryOptions
    .map((cat) => {
      const history = records.filter((x) => x.category_code === cat.value);
      return {
        ...cat,
        latest: history[0],
        history,
      };
    })
    .filter((x) => x.latest);

  const latestWeight = records.find((x) => x.category_code === "weight");
  const latestHeight = records.find((x) => x.category_code === "height");
  const bmi = calculateBmi(latestWeight?.value_number, latestHeight?.value_number);

 const selectedPeriod = periodOptions.find((x) => x.value === period);

const allChartRecords = records
  .filter((x) => x.category_code === chartCategory)
  .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));

const latestChartRecord = allChartRecords[allChartRecords.length - 1];

const chartStartDate = getPeriodStartFromLatest(
  latestChartRecord?.measured_at,
  selectedPeriod?.months || 6
);

const chartRecords = allChartRecords.filter(
  (x) =>
    x.measured_at >= chartStartDate &&
    x.measured_at <= latestChartRecord?.measured_at
);

  const chartData = chartRecords.map((item) => {
    if (chartCategory === "vision") {
      return {
        date: formatDateRu(item.measured_at),
        left: Number(item.value_json?.left ?? 0),
        right: Number(item.value_json?.right ?? 0),
      };
    }

    return {
      date: formatDateRu(item.measured_at),
      value: Number(item.value_number ?? 0),
    };
  });

  const avgValue =
    chartData.length && chartCategory !== "vision"
      ? (
          chartData.reduce((sum, x) => sum + Number(x.value || 0), 0) /
          chartData.length
        ).toFixed(1)
      : null;

  const showChart = (cat) => {
    setChartCategory(cat);
    setPeriod("6m");
    setChartOpen(true);
  };

  const renderCardValue = (card) => {
    if (card.type === "number") {
      return `${card.latest.value_number} ${card.unit}`;
    }

    if (card.type === "vision") {
      return card.latest.value_text || "—";
    }

    return card.latest.value_text || "—";
  };

  return (
    <div className="healthPage">
      <div className="healthHeader">
        <h2>Мониторинг здоровья</h2>

        <button className="addButton" type="button" onClick={() => openAddModal()}>
          + Добавить
        </button>
      </div>

      {loading ? (
        <div className="healthEmpty">Загрузка...</div>
      ) : records.length === 0 ? (
        <div className="healthEmpty">Нет данных. Добавьте первый показатель.</div>
      ) : (
        <div className="healthCards">
          {groupedCards.map((card) => (
            <div key={card.value} className="healthCard">
              <div className="healthCardTop">
                <div>
                  <div className="healthCardTitle">{card.label}</div>
                  <div className="healthCardDate">
                    Последняя запись: {formatDateRu(card.latest.measured_at)}
                  </div>
                </div>

                <div className="healthCardActions">
                  <button
                    type="button"
                    className="smallActionBtn"
                    onClick={() => openAddModal(card.value)}
                  >
                    Обновить
                  </button>

                  {card.value !== "fluorography" && (
                    <button
                      type="button"
                      className="smallActionBtn dark"
                      onClick={() => showChart(card.value)}
                    >
                      Мониторинг
                    </button>
                  )}
                </div>
              </div>

              <div className="healthCardValue">{renderCardValue(card)}</div>

              {card.value === "weight" && bmi && (
                <div className="bmiBox">
                  <div>
                    <strong>ИМТ:</strong> {bmi}
                  </div>
                  <div>{getBmiStatus(bmi)}</div>
                </div>
              )}

              <div className="healthHistoryTitle">История</div>

              <div className="healthHistory">
                {card.history.slice(0, 5).map((item) => (
                  <div key={item.id} className="healthHistoryItem">
                    <span>{formatDateRu(item.measured_at)}</span>
                    <span>
                      {item.category_code === "vision"
                        ? item.value_text
                        : item.value_number !== null
                        ? `${item.value_number} ${card.unit}`
                        : item.value_text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="modalOverlay" onClick={closeModal}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalTitle">Добавить показатель</div>

            <div className="modalContent">
              <div className="modalGrid">
                <div className="modalSection">
                  <label className="modalLabel">Категория</label>
                  <select
                    className="modalInput"
                    value={category}
                    onChange={(e) => {
                      resetForm(e.target.value);
                    }}
                  >
                    {categoryOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="modalSection">
                  <label className="modalLabel">Единица</label>
                  <input
                    className="modalInput"
                    value={currentCategory?.unit || ""}
                    readOnly
                  />
                </div>
              </div>

              {currentCategory.type === "number" && (
                <div className="modalSection">
                  <label className="modalLabel">Значение</label>
                  <input
                    className="modalInput noSpin"
                    type="text"
                    inputMode="decimal"
                    placeholder={
                      category === "weight"
                        ? "Например: 78.5"
                        : "Например: 172"
                    }
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </div>
              )}

              {currentCategory.type === "vision" && (
                <div className="modalGrid">
                  <div className="modalSection">
                    <label className="modalLabel">Левый глаз</label>
                    <input
                      className="modalInput noSpin"
                      type="text"
                      inputMode="decimal"
                      placeholder="-1.5"
                      value={visionLeft}
                      onChange={(e) => setVisionLeft(e.target.value)}
                    />
                  </div>

                  <div className="modalSection">
                    <label className="modalLabel">Правый глаз</label>
                    <input
                      className="modalInput noSpin"
                      type="text"
                      inputMode="decimal"
                      placeholder="-1.0"
                      value={visionRight}
                      onChange={(e) => setVisionRight(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {currentCategory.type === "text" && (
                <div className="modalSection">
                  <label className="modalLabel">Заключение</label>
                  <select
                    className="modalInput"
                    value={fluoroStatus}
                    onChange={(e) => setFluoroStatus(e.target.value)}
                  >
                    {fluoroOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="modalSection">
                <label className="modalLabel">Дата</label>
                <input
                  type="date"
                  className="modalInput"
                  value={date}
                  min={todayISO}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="modalSection">
                <label className="modalLabel">Комментарий</label>
                <textarea
                  className="modalInput textareaInput"
                  placeholder="Необязательно"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {error && <div className="errorText">{error}</div>}
            </div>

            <div className="modalButtons">
              <button className="actionButton" type="button" onClick={closeModal}>
                Отмена
              </button>

              <button
                className="actionButton primaryBtn"
                type="button"
                onClick={saveHealthData}
                disabled={saving}
              >
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {chartOpen && (
        <div className="modalOverlay" onClick={() => setChartOpen(false)}>
          <div className="chartModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalTitle">
              Мониторинг: {getCategoryInfo(chartCategory).label}
            </div>

            <div className="chartControls">
              {periodOptions.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={`periodBtn ${period === p.value ? "active" : ""}`}
                  onClick={() => setPeriod(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {chartData.length === 0 ? (
              <div className="healthEmpty">Нет данных за выбранный период.</div>
            ) : (
              <>
                {avgValue && (
                  <div className="chartSummary">
                    Среднее значение за период: <strong>{avgValue}</strong>{" "}
                    {getCategoryInfo(chartCategory).unit}
                  </div>
                )}

                <div className="chartBox">
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />

                      {chartCategory === "vision" ? (
                        <>
                          <Line
                            type="monotone"
                            dataKey="left"
                            name="Левый глаз"
                            strokeWidth={3}
                          />
                          <Line
                            type="monotone"
                            dataKey="right"
                            name="Правый глаз"
                            strokeWidth={3}
                          />
                        </>
                      ) : (
                        <Line
                          type="monotone"
                          dataKey="value"
                          name={getCategoryInfo(chartCategory).label}
                          strokeWidth={3}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            <div className="modalButtons">
              <button
                className="actionButton primaryBtn"
                type="button"
                onClick={() => setChartOpen(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}