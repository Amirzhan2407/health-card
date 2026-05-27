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
      "Здравствуйте! Я помогу найти лекарство. Напишите название препарата, а потом я уточню город, форму, дозировку и что важнее: ближайшая аптека или лучшая цена.",
  },
};

const cityAliases = [
  {
    name: "Астана",
    variants: ["астана", "астане", "нур-султан", "нурсултан"],
  },
  {
    name: "Алматы",
    variants: ["алматы", "алмате"],
  },
  {
    name: "Шымкент",
    variants: ["шымкент", "шымкенте"],
  },
  {
    name: "Караганда",
    variants: ["караганда", "караганде"],
  },
  {
    name: "Актобе",
    variants: ["актобе"],
  },
  {
    name: "Тараз",
    variants: ["тараз", "таразе"],
  },
  {
    name: "Павлодар",
    variants: ["павлодар", "павлодаре"],
  },
  {
    name: "Усть-Каменогорск",
    variants: ["усть-каменогорск", "усть каменогорск"],
  },
  {
    name: "Семей",
    variants: ["семей", "семее"],
  },
  {
    name: "Атырау",
    variants: ["атырау"],
  },
  {
    name: "Костанай",
    variants: ["костанай", "костанае"],
  },
  {
    name: "Кызылорда",
    variants: ["кызылорда", "кызылорде"],
  },
  {
    name: "Актау",
    variants: ["актау"],
  },
  {
    name: "Кокшетау",
    variants: ["кокшетау"],
  },
  {
    name: "Петропавловск",
    variants: ["петропавловск", "петропавловске"],
  },
  {
    name: "Уральск",
    variants: ["уральск", "уральске"],
  },
  {
    name: "Туркестан",
    variants: ["туркестан", "туркестане"],
  },
];

const allCityVariants = cityAliases.flatMap((city) => city.variants);

function createEmptyPharmacySearch() {
  return {
    medicine: "",
    city: "",
    priority: "",
    dosage: "",
    form: "",
    address: "",
    lat: "",
    lng: "",
    detailsConfirmed: false,
  };
}

function detectCity(text) {
  const lower = text.toLowerCase();

  const foundCity = cityAliases.find((city) =>
    city.variants.some((variant) => lower.includes(variant))
  );

  return foundCity ? foundCity.name : "";
}

function detectPriority(text) {
  const lower = text.toLowerCase();

  const hasPrice =
    lower.includes("дешев") ||
    lower.includes("самый дешев") ||
    lower.includes("самая дешевая") ||
    lower.includes("цена") ||
    lower.includes("цене") ||
    lower.includes("по цене") ||
    lower.includes("лучшая цена") ||
    lower.includes("лучшей цене") ||
    lower.includes("по лучшей цене") ||
    lower.includes("выгодная цена") ||
    lower.includes("выгодной цене") ||
    lower.includes("по выгодной цене") ||
    lower.includes("нормальной ценой") ||
    lower.includes("не самая высокая") ||
    lower.includes("дешево") ||
    lower.includes("подешевле");

  const hasNearby =
    lower.includes("ближай") ||
    lower.includes("рядом") ||
    lower.includes("поближе") ||
    lower.includes("возле") ||
    lower.includes("недалеко") ||
    lower.includes("поблизости");

  if (hasNearby && hasPrice) {
    return "nearby_price";
  }

  if (hasPrice) {
    return "price";
  }

  if (hasNearby) {
    return "nearby";
  }

  return "";
}

function priorityLabel(priority) {
  if (priority === "price") return "лучшая цена";
  if (priority === "nearby") return "ближайшая аптека";
  if (priority === "nearby_price") return "ближайшая аптека с выгодной ценой";
  return "";
}

function detectDosage(text) {
  const lower = text.toLowerCase();

  const normalMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(мг|г|мл|мкг|%)/i);

  if (normalMatch) {
    return `${normalMatch[1]} ${normalMatch[2]}`;
  }

  const shortMgMatch = lower.match(/(\d+)\s*м(?=\s|$)/i);

  if (shortMgMatch) {
    return `${shortMgMatch[1]} мг`;
  }

  return "";
}

function detectForm(text) {
  const lower = text.toLowerCase();

  if (lower.includes("таблет")) return "таблетки";
  if (lower.includes("капсул")) return "капсулы";
  if (lower.includes("сироп")) return "сироп";
  if (lower.includes("суспенз")) return "суспензия";
  if (lower.includes("спрей")) return "спрей";
  if (lower.includes("капли")) return "капли";
  if (lower.includes("мазь")) return "мазь";
  if (lower.includes("гель")) return "гель";
  if (lower.includes("порош")) return "порошок";
  if (lower.includes("свеч")) return "свечи";

  return "";
}

function cleanAddressText(text) {
  return text
    .replace(/^[,.:;-\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectAddress(text) {
  const original = text.trim();
  const lower = original.toLowerCase();

  const markers = [
    "я нахожусь рядом с",
    "я нахожусь около",
    "я нахожусь возле",
    "я нахожусь",
    "мой адрес",
    "адрес",
    "рядом с",
    "возле",
    "около",
  ];

  for (const marker of markers) {
    const index = lower.indexOf(marker);

    if (index !== -1) {
      const address = original.slice(index + marker.length);

      return cleanAddressText(address);
    }
  }

  return "";
}

function isLikelyAddress(text) {
  const lower = text.toLowerCase();

  const hasNumber = /\d+/.test(lower);

  const addressWords = [
    "улица",
    "ул",
    "проспект",
    "пр",
    "микрорайон",
    "мкр",
    "район",
    "дом",
    "жк",
    "кабанбай",
    "абая",
    "сатпаева",
    "сефуллина",
    "байтурсынова",
    "достык",
    "республика",
  ];

  return hasNumber || addressWords.some((word) => lower.includes(word));
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
    lower.includes("новый поиск") ||
    lower.includes("другое")
  );
}

function userAcceptsAnyForm(text) {
  const lower = text.toLowerCase();

  return (
    lower.includes("любая") ||
    lower.includes("любой") ||
    lower.includes("без разницы") ||
    lower.includes("не важно") ||
    lower.includes("неважно") ||
    lower.includes("какая есть")
  );
}

function cutBeforeExtraInfo(value) {
  const stopMarkers = [
    " город ",
    " в городе ",
    " нужна ",
    " нужен ",
    " нужно ",
    " лучше ",
    " по лучшей",
    " по выгодной",
    " по цене",
    " ближай",
    " я нахожусь",
    " нахожусь",
    " мой адрес",
    " адрес",
    " рядом с",
    " возле",
    " около",
  ];

  for (const cityVariant of allCityVariants) {
    stopMarkers.push(` в ${cityVariant}`);
    stopMarkers.push(` ${cityVariant},`);
    stopMarkers.push(` ${cityVariant}.`);
  }

  let result = value;
  let cutIndex = -1;

  for (const marker of stopMarkers) {
    const index = result.indexOf(marker);

    if (index !== -1 && (cutIndex === -1 || index < cutIndex)) {
      cutIndex = index;
    }
  }

  if (cutIndex !== -1) {
    result = result.slice(0, cutIndex);
  }

  return result;
}

function cleanMedicineName(text) {
  let value = text.toLowerCase();

  const buyPhrases = [
    "хочу купить",
    "мне нужно купить",
    "мне надо купить",
    "нужно купить",
    "надо купить",
    "купить",
    "найди",
    "найти",
  ];

  for (const phrase of buyPhrases) {
    const index = value.indexOf(phrase);

    if (index !== -1) {
      value = value.slice(index + phrase.length);
      break;
    }
  }

  value = cutBeforeExtraInfo(value);

  const phrasesToRemove = [
    "привет",
    "здравствуйте",
    "здравствуй",
    "добрый день",
    "добрый вечер",
    "мне нужно",
    "мне надо",
    "лекарство",
    "препарат",
    "новый поиск",
    "другое",
    "другой",
  ];

  phrasesToRemove.forEach((phrase) => {
    value = value.replaceAll(phrase, "");
  });

  allCityVariants.forEach((city) => {
    value = value.replaceAll(city, "");
  });

  value = value
    .replace(/[.,!?;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return value;
}

function buildMedicineSearchQuery(search) {
  const parts = [search.medicine];

  if (search.dosage && !search.medicine.includes(search.dosage)) {
    parts.push(search.dosage);
  }

  if (search.form && !search.medicine.includes(search.form)) {
    parts.push(search.form);
  }

  return parts.filter(Boolean).join(" ");
}

function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Геолокация не поддерживается браузером"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude),
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

async function fetchPharmacySearch(search) {
  const params = new URLSearchParams({
    medicine: buildMedicineSearchQuery(search),
    city: search.city.toLowerCase(),
    priority: search.priority,
  });

  if (search.address) {
    params.set("address", search.address);
  }

  if (search.lat && search.lng) {
    params.set("lat", search.lat);
    params.set("lng", search.lng);
  }

  const response = await fetch(`${API_URL}/api/pharmacy/search?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Ошибка запроса");
  }

  return data;
}

function formatPharmacyResults(data, search) {
  const pharmaciesText = data.pharmacies
    .slice(0, 6)
    .map((item, index) => {
      const distanceText =
        item.distanceKm !== null && item.distanceKm !== undefined
          ? `\nРасстояние: примерно ${item.distanceKm} км`
          : "";

      return `${index + 1}. ${item.pharmacy || "Аптека"}

Цена: ${item.price || "не указана"}
Адрес: ${item.address || "адрес не указан"}${distanceText}${
        item.status ? `\nСтатус: ${item.status}` : ""
      }${item.updated ? `\n${item.updated}` : ""}
Ссылка: ${item.url}`;
    })
    .join("\n\n");

  const details = [
    search.dosage ? `Дозировка: ${search.dosage}` : "",
    search.form ? `Форма: ${search.form}` : "",
    search.priority !== "price" && search.address
      ? `Ваш адрес/ориентир: ${search.address}`
      : "",
    search.priority !== "price" && search.lat && search.lng
      ? "Поиск выполнен по вашей геолокации"
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `Нашёл варианты покупки:

${data.title || data.selectedProduct?.title || search.medicine}

${details ? `${details}\n\n` : ""}Важно: "№10" в названии означает количество таблеток в упаковке, а не количество найденных аптек.

Показываю первые ${Math.min(data.pharmacies.length, 6)} вариантов аптек:

${pharmaciesText}

Перед покупкой лучше позвонить в аптеку и уточнить наличие. Также проверьте инструкцию и противопоказания препарата.

Поиск завершён. Для нового лекарства просто напишите новое название.`;
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

  const [pharmacySearch, setPharmacySearch] = useState(
    createEmptyPharmacySearch()
  );

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messages =
    mode === MODES.MEDICAL ? medicalMessages : pharmacyMessages;

  const resetPharmacySearch = () => {
    setPharmacySearch(createEmptyPharmacySearch());
  };

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

  const addPharmacyBotMessage = (text) => {
    setPharmacyMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text,
      },
    ]);
  };

  const sendPharmacyMessage = async (userMessage) => {
    const text = userMessage.text;
    const lower = text.toLowerCase();

    if (lower.includes("новый поиск")) {
      resetPharmacySearch();

      addPharmacyBotMessage(
        "Хорошо, начинаем новый поиск. Напишите название лекарства, которое хотите купить."
      );

      return;
    }

    const detectedCity = detectCity(text);
    const detectedPriority = detectPriority(text);
    const detectedDosage = detectDosage(text);
    const detectedForm = detectForm(text);
    const cleanedMedicine = cleanMedicineName(text);

    let detectedAddress = detectAddress(text);

    if (
      !detectedAddress &&
      pharmacySearch.priority !== "price" &&
      pharmacySearch.city &&
      isLikelyAddress(text)
    ) {
      detectedAddress = cleanAddressText(text);
    }

    let nextSearch = {
      ...pharmacySearch,
    };

    const isChangingMedicine =
      cleanedMedicine &&
      hasMedicineBuyIntent(text) &&
      cleanedMedicine !== pharmacySearch.medicine;

    if (isChangingMedicine) {
      nextSearch = createEmptyPharmacySearch();
      nextSearch.medicine = cleanedMedicine;
    } else if (!nextSearch.medicine && cleanedMedicine) {
      nextSearch.medicine = cleanedMedicine;
    }

    if (detectedCity) {
      nextSearch.city = detectedCity;
    }

    if (detectedPriority) {
      nextSearch.priority = detectedPriority;
    }

    if (detectedDosage) {
      nextSearch.dosage = detectedDosage;
      nextSearch.detailsConfirmed = true;
    }

    if (detectedForm) {
      nextSearch.form = detectedForm;
      nextSearch.detailsConfirmed = true;
    }

    if (userAcceptsAnyForm(text)) {
      nextSearch.detailsConfirmed = true;
    }

    if (detectedAddress) {
      nextSearch.address = detectedAddress;
    }

    setPharmacySearch(nextSearch);

    if (!nextSearch.medicine) {
      addPharmacyBotMessage(
        "Хорошо. Напишите название лекарства, которое хотите купить.\n\nНапример: парацетамол, нурофен, фурацилин."
      );

      return;
    }

    if (!nextSearch.city) {
      addPharmacyBotMessage(`Понял, вы хотите купить: ${nextSearch.medicine}.

Скажите, пожалуйста, в каком городе хотите купить лекарство?

Также напишите, что вам будет удобнее:
— ближайшая аптека;
— лучшая цена.`);

      return;
    }

    if (!nextSearch.priority) {
      addPharmacyBotMessage(`Хорошо.

Лекарство: ${nextSearch.medicine}
Город: ${nextSearch.city}

Что вам важнее:
— ближайшая аптека;
— лучшая цена;
— ближайшая аптека с выгодной ценой?`);

      return;
    }

    if (
      !nextSearch.detailsConfirmed &&
      !nextSearch.dosage &&
      !nextSearch.form
    ) {
      addPharmacyBotMessage(`Уточните, пожалуйста, форму и дозировку, если знаете.

Например:
— 500 мг таблетки;
— сироп 100 мл;
— капсулы;
— любая форма.

Лекарство: ${nextSearch.medicine}
Город: ${nextSearch.city}
Приоритет: ${priorityLabel(nextSearch.priority)}`);

      return;
    }

    if (nextSearch.priority !== "price" && !nextSearch.lat && !nextSearch.lng) {
      if (!nextSearch.address) {
        try {
          addPharmacyBotMessage(
            "Чтобы найти ближайшую аптеку, сейчас попробую определить вашу геолокацию. Браузер может попросить разрешение."
          );

          const coords = await getBrowserLocation();

          nextSearch = {
            ...nextSearch,
            lat: coords.lat,
            lng: coords.lng,
          };

          setPharmacySearch(nextSearch);
        } catch (error) {
          console.error(error);

          addPharmacyBotMessage(`Не удалось получить геолокацию.

Напишите ваш адрес или ориентир в городе ${nextSearch.city}.

Например:
Я нахожусь рядом с проспектом Кабанбай батыра 46`);

          return;
        }
      }
    }

    try {
      setLoading(true);

      addPharmacyBotMessage(`Отлично, ищу варианты на i-teka...

Лекарство: ${buildMedicineSearchQuery(nextSearch)}
Город: ${nextSearch.city}
Приоритет: ${priorityLabel(nextSearch.priority)}${
        nextSearch.address ? `\nАдрес/ориентир: ${nextSearch.address}` : ""
      }${nextSearch.lat && nextSearch.lng ? "\nГеолокация: получена" : ""}`);

      const data = await fetchPharmacySearch(nextSearch);

      if (!data.success || !data.pharmacies || data.pharmacies.length === 0) {
        addPharmacyBotMessage(
          data.message ||
            "Не удалось найти лекарство. Попробуйте написать название точнее."
        );

        resetPharmacySearch();
        return;
      }

      const botMessage = {
        role: "assistant",
        text: formatPharmacyResults(data, nextSearch),
      };

      setPharmacyMessages((prev) => [...prev, botMessage]);

      resetPharmacySearch();
    } catch (error) {
      console.error(error);

      addPharmacyBotMessage(
        "Ошибка поиска лекарства. Проверьте backend или попробуйте позже."
      );

      resetPharmacySearch();
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