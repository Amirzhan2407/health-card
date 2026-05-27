import { useState } from "react";
import "../styles/aiAssistant.css";

const API_URL = "https://health-card.onrender.com";

const MODES = {
  MEDICAL: "medical",
  PHARMACY: "pharmacy",
};

const modeInfo = {
  [MODES.MEDICAL]: {
    subtitle: "Медицинский помощник для справочной информации",
    placeholder: "Напишите вопрос ИИ помощнику...",
    greeting:
      "Здравствуйте! Я ИИ помощник. Могу помочь с вопросами по здоровью, симптомам и препаратам.",
  },

  [MODES.PHARMACY]: {
    subtitle: "Помощник для поиска лекарств в аптеках",
    placeholder: "Например: хочу купить парацетамол",
    greeting:
      "Здравствуйте! Я помогу найти лекарство. Напишите название препарата, а потом я уточню город и что важнее: ближайшая аптека или лучшая цена.",
  },
};

const kazakhstanCities = [
  "алматы",
  "астана",
  "шымкент",
  "караганда",
  "актобе",
  "тараз",
  "павлодар",
  "усть-каменогорск",
  "семей",
  "атырау",
  "костанай",
  "кызылорда",
  "актау",
  "кокшетау",
  "петропавловск",
  "уральск",
  "туркестан",
];

function capitalizeText(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function detectCity(text) {
  const lower = text.toLowerCase();

  const foundCity = kazakhstanCities.find((city) => lower.includes(city));

  return foundCity ? capitalizeText(foundCity) : "";
}

function detectPriority(text) {
  const lower = text.toLowerCase();

  if (
    lower.includes("дешев") ||
    lower.includes("цена") ||
    lower.includes("по цене") ||
    lower.includes("лучшая цена") ||
    lower.includes("дешево") ||
    lower.includes("подешевле")
  ) {
    return "price";
  }

  if (
    lower.includes("ближай") ||
    lower.includes("рядом") ||
    lower.includes("поближе") ||
    lower.includes("возле") ||
    lower.includes("недалеко")
  ) {
    return "nearby";
  }

  return "";
}

function priorityLabel(priority) {
  if (priority === "price") return "лучшая цена";
  if (priority === "nearby") return "ближайшая аптека";
  return "";
}

function hasMedicineBuyIntent(text) {
  const lower = text.toLowerCase();

  return (
    lower.includes("купить") ||
    lower.includes("найди") ||
    lower.includes("найти") ||
    lower.includes("хочу") ||
    lower.includes("лекарство") ||
    lower.includes("препарат") ||
    lower.includes("теперь") ||
    lower.includes("другое")
  );
}

function cleanMedicineName(text) {
  let value = text.toLowerCase();

  const phrasesToRemove = [
    "привет",
    "здравствуйте",
    "здравствуй",
    "добрый день",
    "добрый вечер",
    "хочу купить",
    "мне нужно купить",
    "мне надо купить",
    "мне нужно",
    "мне надо",
    "купить",
    "найди",
    "найти",
    "лекарство",
    "препарат",
    "теперь",
    "другое",
    "другой",
    "в городе",
    "город",
    "по лучшей цене",
    "лучшая цена",
    "по цене",
    "дешевле",
    "дешево",
    "подешевле",
    "ближайшая аптека",
    "ближайшую аптеку",
    "рядом",
    "поближе",
    "возле",
    "недалеко",
  ];

  phrasesToRemove.forEach((phrase) => {
    value = value.replaceAll(phrase, "");
  });

  kazakhstanCities.forEach((city) => {
    value = value.replaceAll(city, "");
  });

  value = value
    .replace(/[.,!?;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return value;
}

function formatPharmacyResults(data, search) {
  const pharmaciesText = data.pharmacies
    .slice(0, 6)
    .map((item, index) => {
      return `${index + 1}. ${item.pharmacy || "Аптека"}

Цена: ${item.price || "не указана"}
Адрес: ${item.address || "адрес не указан"}${
        item.status ? `\nСтатус: ${item.status}` : ""
      }${item.updated ? `\n${item.updated}` : ""}
Ссылка: ${item.url}`;
    })
    .join("\n\n");

  return `Нашёл варианты покупки:

${data.title || data.selectedProduct?.title || search.medicine}

${pharmaciesText}

Перед покупкой лучше позвонить в аптеку и уточнить наличие. Также проверьте инструкцию и противопоказания препарата.`;
}

export default function AiAssistantPage() {
  const [mode, setMode] = useState(MODES.MEDICAL);

  const [medicalMessages, setMedicalMessages] = useState([
    {
      role: "assistant",
      text: modeInfo[MODES.MEDICAL].greeting,
    },
  ]);

  const [pharmacyMessages, setPharmacyMessages] = useState([
    {
      role: "assistant",
      text: modeInfo[MODES.PHARMACY].greeting,
    },
  ]);

  const [pharmacySearch, setPharmacySearch] = useState({
    medicine: "",
    city: "",
    priority: "",
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messages =
    mode === MODES.MEDICAL ? medicalMessages : pharmacyMessages;

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setInput("");
  };

  const sendMedicalMessage = async (userMessage) => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          messages: [...medicalMessages, userMessage],
        }),
      });

      const data = await response.json();

      const botMessage = {
        role: "assistant",
        text: data.answer || "Нет ответа от ИИ.",
      };

      setMedicalMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error(error);

      setMedicalMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Ошибка подключения к серверу. Проверьте backend или интернет.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendPharmacyMessage = async (userMessage) => {
    const text = userMessage.text;

    const detectedCity = detectCity(text);
    const detectedPriority = detectPriority(text);
    const cleanedMedicine = cleanMedicineName(text);

    let nextSearch = {
      ...pharmacySearch,
    };

    if (
      cleanedMedicine &&
      (!nextSearch.medicine || hasMedicineBuyIntent(text))
    ) {
      nextSearch.medicine = cleanedMedicine;
    }

    if (detectedCity) {
      nextSearch.city = detectedCity;
    }

    if (detectedPriority) {
      nextSearch.priority = detectedPriority;
    }

    setPharmacySearch(nextSearch);

    if (!nextSearch.medicine) {
      setPharmacyMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            "Хорошо. Напишите название лекарства, которое хотите купить.\n\nНапример: парацетамол, нурофен, фурацилин.",
        },
      ]);

      return;
    }

    if (!nextSearch.city) {
      setPharmacyMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Понял, вы хотите купить: ${nextSearch.medicine}.

Скажите, пожалуйста, в каком городе хотите купить лекарство?

Также напишите, что вам будет удобнее:
— ближайшая аптека;
— лучшая цена.`,
        },
      ]);

      return;
    }

    if (!nextSearch.priority) {
      setPharmacyMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Хорошо.

Лекарство: ${nextSearch.medicine}
Город: ${nextSearch.city}

Что вам важнее: ближайшая аптека или лучшая цена?`,
        },
      ]);

      return;
    }

    try {
      setLoading(true);

      setPharmacyMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Отлично, ищу варианты на i-teka...

Лекарство: ${nextSearch.medicine}
Город: ${nextSearch.city}
Приоритет: ${priorityLabel(nextSearch.priority)}`,
        },
      ]);

      const params = new URLSearchParams({
        medicine: nextSearch.medicine,
        city: nextSearch.city.toLowerCase(),
        priority: nextSearch.priority,
      });

      const response = await fetch(`${API_URL}/api/pharmacy/search?${params}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка запроса");
      }

      if (!data.success || !data.pharmacies || data.pharmacies.length === 0) {
        setPharmacyMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text:
              data.message ||
              "Не удалось найти лекарство. Попробуйте написать название точнее.",
          },
        ]);

        return;
      }

      const botMessage = {
        role: "assistant",
        text: formatPharmacyResults(data, nextSearch),
      };

      setPharmacyMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error(error);

      setPharmacyMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Ошибка поиска лекарства. Проверьте backend или попробуйте позже.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: "user",
      text: input.trim(),
    };

    if (mode === MODES.MEDICAL) {
      setMedicalMessages((prev) => [...prev, userMessage]);
    } else {
      setPharmacyMessages((prev) => [...prev, userMessage]);
    }

    setInput("");

    if (mode === MODES.MEDICAL) {
      await sendMedicalMessage(userMessage);
    } else {
      await sendPharmacyMessage(userMessage);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="aiPage">
      <div className="aiHeader">
        <div>
          <h1>ИИ помощник</h1>
          <p>{modeInfo[mode].subtitle}</p>
        </div>

        <div className="aiModeSwitch">
          <button
            type="button"
            className={`aiModeBtn ${mode === MODES.MEDICAL ? "active" : ""}`}
            onClick={() => switchMode(MODES.MEDICAL)}
          >
            Мед совет
          </button>

          <button
            type="button"
            className={`aiModeBtn ${mode === MODES.PHARMACY ? "active" : ""}`}
            onClick={() => switchMode(MODES.PHARMACY)}
          >
            Поиск лекарств
          </button>
        </div>
      </div>

      <div className="aiChat">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`aiMessageRow ${
              msg.role === "user" ? "user" : "assistant"
            }`}
          >
            <div className="aiMessage">{msg.text}</div>
          </div>
        ))}

        {loading && (
          <div className="aiMessageRow assistant">
            <div className="aiMessage">ИИ думает...</div>
          </div>
        )}
      </div>

      <div className="aiInputBox">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={modeInfo[mode].placeholder}
          rows={1}
        />

        <button type="button" onClick={sendMessage} disabled={loading}>
          {loading ? "Ждём..." : "Отправить"}
        </button>
      </div>
    </div>
  );
}