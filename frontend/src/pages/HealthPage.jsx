import { useMemo, useState } from "react";
import "../styles/health.css";

const categoryOptions = [
  { value: "weight", label: "Вес", unit: "кг", type: "number" },
  { value: "height", label: "Рост", unit: "см", type: "number" },
  { value: "vision", label: "Зрение", unit: "балл", type: "text" },
  { value: "fluoro", label: "Флюорография", unit: "заключение", type: "text" },
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateRu(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

function calculateBmi(weight, heightCm) {
  const w = Number(weight);
  const h = Number(heightCm) / 100;

  if (!w || !h) return null;

  const bmi = w / (h * h);
  return bmi.toFixed(1);
}

function getLatestByCategory(records, category) {
  const filtered = records
    .filter((x) => x.category === category)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return filtered[0] || null;
}

export default function HealthPage() {
  const todayISO = useMemo(() => toISODate(new Date()), []);

  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState([]);

  const [category, setCategory] = useState("weight");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayISO);
  const [error, setError] = useState("");

  const currentCategory = categoryOptions.find((x) => x.value === category);

  const latestWeight = getLatestByCategory(records, "weight");
  const latestHeight = getLatestByCategory(records, "height");

  const bmi = calculateBmi(
    latestWeight?.value_number,
    latestHeight?.value_number
  );

  const openModal = () => {
    setCategory("weight");
    setValue("");
    setDate(todayISO);
    setError("");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setError("");
  };

  const handleSave = () => {
    if (!category) {
      setError("Выберите категорию.");
      return;
    }

    if (!value.trim()) {
      setError("Введите значение.");
      return;
    }

    if (!date) {
      setError("Выберите дату.");
      return;
    }

    if (currentCategory?.type === "number" && Number.isNaN(Number(value))) {
      setError("Для этой категории нужно числовое значение.");
      return;
    }

    const newRecord = {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
      category,
      categoryLabel: currentCategory.label,
      unit: currentCategory.unit,
      date,
      value_number:
        currentCategory.type === "number" ? Number(value) : null,
      value_text:
        currentCategory.type === "text" ? value.trim() : null,
      createdAt: new Date().toISOString(),
    };

    setRecords((prev) => [newRecord, ...prev]);
    closeModal();
  };

  const groupedCards = categoryOptions
    .map((cat) => {
      const latest = getLatestByCategory(records, cat.value);
      const history = records
        .filter((x) => x.category === cat.value)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      return {
        ...cat,
        latest,
        history,
      };
    })
    .filter((item) => item.latest);

  return (
    <div className="healthPage">
      <div className="healthHeader">
        <h2>Мониторинг здоровья</h2>

        <button className="addButton" type="button" onClick={openModal}>
          + Добавить
        </button>
      </div>

      {records.length === 0 ? (
        <div className="healthEmpty">Нет данных. Добавьте первый показатель.</div>
      ) : (
        <div className="healthCards">
          {groupedCards.map((card) => (
            <div key={card.value} className="healthCard">
              <div className="healthCardTop">
                <div className="healthCardTitle">{card.label}</div>
                <div className="healthCardDate">
                  Последняя запись: {formatDateRu(card.latest?.date)}
                </div>
              </div>

              <div className="healthCardValue">
                {card.type === "number"
                  ? `${card.latest?.value_number} ${card.unit}`
                  : card.latest?.value_text}
              </div>

              {card.value === "weight" && bmi && (
                <div className="healthExtra">ИМТ: {bmi}</div>
              )}

              <div className="healthHistoryTitle">История</div>
              <div className="healthHistory">
                {card.history.map((item) => (
                  <div key={item.id} className="healthHistoryItem">
                    <span>{formatDateRu(item.date)}</span>
                    <span>
                      {item.value_number !== null
                        ? `${item.value_number} ${item.unit}`
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
              <label className="modalLabel">Категория</label>
              <select
                className="modalInput"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categoryOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <label className="modalLabel">Единица измерения</label>
              <input
                className="modalInput"
                value={currentCategory?.unit || ""}
                readOnly
              />

              <label className="modalLabel">Значение</label>
              <input
                className="modalInput"
                type={currentCategory?.type === "number" ? "number" : "text"}
                placeholder="Введите значение"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />

              <label className="modalLabel">Дата</label>
              <input
                type="date"
                className="modalInput"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />

              {error && <div className="errorText">{error}</div>}
            </div>

            <div className="modalButtons">
              <button className="actionButton" onClick={closeModal}>
                Отмена
              </button>

              <button className="actionButton primaryBtn" onClick={handleSave}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}