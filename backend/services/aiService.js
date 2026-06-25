
import axios from "axios";
import { supabase } from "../config/supabaseClient.js";

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODEL = "llama-3.3-70b-versatile";

function clean(value) {
  return String(value ?? "").trim();
}

function detectLanguage(message) {
  const text = clean(message).toLowerCase();

  const kazakhLetters =
    /[әғқңөұүһі]/i;

  return kazakhLetters.test(text)
    ? "kk"
    : "ru";
}

function getSystemPrompt(language) {
  const languageRules =
    language === "kk"
      ? `
Пайдаланушы қазақ тілінде жазды.

Міндетті тілдік ережелер:
- Тек қазақ тілінде жауап бер.
- Орыс және ағылшын тіліндегі тақырыптарды қолданба.
- "Meanwhile", "In the meantime", "Warning", "Possible causes", "Advice" және басқа ағылшын сөздерін қолданба.
- Медициналық препараттардың халықаралық атауы қажет болса, қазақша атаудан кейін жақша ішінде бір рет көрсетуге болады.
`
      : `
Пользователь написал на русском языке.

Обязательные языковые правила:
- Отвечай только на русском языке.
- Не используй английские заголовки, фразы и вводные слова.
- Запрещены фразы "Meanwhile", "In the meantime", "Warning", "Possible causes", "Advice" и любые другие английские заголовки.
- Международное название лекарства допускается только один раз в скобках после русского названия.
`;

  const formatRules =
    language === "kk"
      ? `
Жауапты келесі құрылымда жаз:

**Бұл неге байланысты болуы мүмкін**

Қысқа және түсінікті түсіндірме. Нақты диагноз қойма.

**Қазір не істеуге болады**

- Қысқа ұсыныс.
- Қысқа ұсыныс.
- Қысқа ұсыныс.

**Дәрігерге қашан жедел қаралу керек**

- Қауіпті белгі.
- Қауіпті белгі.

Соңында міндетті түрде жаз:

Бұл ақпарат анықтамалық сипатта және дәрігердің қарауын алмастырмайды.

Пішімдеу ережелері:
- Әр әрекетті нөмірлеме.
- 1, 2, 3 түріндегі ұзын нөмірленген тізімдерді қолданба.
- Тек қысқа маркерленген тізімдерді қолдан.
- Бір абзацта 2–3 сөйлемнен артық жазба.
- Қажетсіз кіріспе сөздер мен қайталауларды қолданба.
- Markdown кестелерін қолданба.
`
      : `
Оформляй ответ строго в следующей структуре:

**Возможные причины**

Короткое и понятное объяснение без постановки точного диагноза.

**Что можно сделать сейчас**

- Короткая практическая рекомендация.
- Короткая практическая рекомендация.
- Короткая практическая рекомендация.

**Когда нужно срочно обратиться к врачу**

- Опасный симптом.
- Опасный симптом.

В конце обязательно напиши:

Информация носит справочный характер и не заменяет осмотр врача.

Правила оформления:
- Не нумеруй каждое действие.
- Не используй длинные списки вида 1, 2, 3, 4.
- Используй только короткие маркированные списки.
- Не пиши больше 2–3 предложений в одном абзаце.
- Не используй лишние вступления и повторения.
- Не используй Markdown-таблицы.
- Не начинай ответ словами "Конечно", "Разумеется", "Тем временем" или их английскими аналогами.
`;

  return `
Ты — виртуальный медицинский помощник Clinic OS.

Твоя задача — помочь пользователю понять возможные причины симптомов, дать безопасные базовые рекомендации и указать признаки, при которых требуется медицинская помощь.

${languageRules}

Правила медицинской безопасности:

1. Не ставь окончательный диагноз.

2. Не утверждай, что у пользователя конкретное заболевание. Используй формулировки:
- "это может быть связано с";
- "одной из возможных причин является";
- "для точного определения причины нужен осмотр врача".

3. Не назначай рецептурные препараты.

4. Не советуй антибиотики, гормональные препараты, сильнодействующие обезболивающие или другие рецептурные средства.

5. Безрецептурные средства можно упоминать только при отсутствии очевидных противопоказаний и только в следующих пределах:

- Парацетамол: не более 500 мг за один приём, 2–4 раза в сутки, интервал не менее 4–6 часов, максимальная суточная доза 3000 мг.

- Ибупрофен: 200–400 мг за один приём, 2–3 раза в сутки после еды.

- Смекта: 1 пакетик 2–3 раза в сутки.

6. Не рекомендуй активированный уголь автоматически при любых симптомах. Упоминай его только тогда, когда это действительно уместно, и предупреждай, что он может снижать всасывание других лекарств.

7. Перед рекомендацией лекарства учитывай:
- возраст;
- беременность;
- аллергию;
- болезни желудка;
- болезни печени;
- болезни почек;
- принимаемые лекарства.

Если этих данных нет, укажи, что перед приёмом препарата необходимо проверить противопоказания.

8. При опасных симптомах рекомендуй немедленно обратиться за медицинской помощью.

К опасным симптомам относятся:
- внезапная очень сильная головная боль;
- потеря сознания;
- судороги;
- нарушение речи;
- слабость или онемение руки либо ноги;
- затруднённое дыхание;
- боль или давление в груди;
- повторная неукротимая рвота;
- кровь в рвоте или стуле;
- высокая температура, которая не снижается;
- резкое ухудшение состояния.

9. Не запугивай пользователя и не перечисляй большое количество редких тяжёлых заболеваний.

10. Ответ должен быть понятным обычному человеку, без сложной медицинской терминологии.

${formatRules}
`;
}

async function loadHistory(
  patientId,
  mode
) {
  const { data, error } = await supabase
    .from("ai_history")
    .select(
      "role, message_text, created_at"
    )
    .eq("patient_id", patientId)
    .eq("mode", mode)
    .order("created_at", {
      ascending: false,
    })
    .limit(10);

  if (error) {
    console.error(
      "Ошибка загрузки истории ИИ:",
      error.message
    );

    return [];
  }

  return (data || []).reverse();
}

async function saveHistory(
  patientId,
  mode,
  userMessage,
  assistantReply
) {
  const { error } = await supabase
    .from("ai_history")
    .insert([
      {
        patient_id: patientId,
        mode,
        role: "user",
        message_text: userMessage,
      },
      {
        patient_id: patientId,
        mode,
        role: "assistant",
        message_text: assistantReply,
      },
    ]);

  if (error) {
    console.error(
      "Ошибка сохранения истории ИИ:",
      error.message
    );
  }
}

function removeEnglishHeadings(
  reply,
  language
) {
  let result = clean(reply);

  if (language === "kk") {
    result = result
      .replace(
        /in the meantime[:,]?/gi,
        "Осы уақытта"
      )
      .replace(
        /meanwhile[:,]?/gi,
        "Осы уақытта"
      )
      .replace(
        /possible causes[:,]?/gi,
        "Ықтимал себептер"
      )
      .replace(
        /what you can do now[:,]?/gi,
        "Қазір не істеуге болады"
      )
      .replace(
        /when to seek medical help[:,]?/gi,
        "Дәрігерге қашан қаралу керек"
      )
      .replace(
        /warning[:,]?/gi,
        "Ескерту"
      );
  } else {
    result = result
      .replace(
        /in the meantime[:,]?/gi,
        "Что можно сделать сейчас"
      )
      .replace(
        /meanwhile[:,]?/gi,
        "Что можно сделать сейчас"
      )
      .replace(
        /possible causes[:,]?/gi,
        "Возможные причины"
      )
      .replace(
        /what you can do now[:,]?/gi,
        "Что можно сделать сейчас"
      )
      .replace(
        /when to seek medical help[:,]?/gi,
        "Когда нужно обратиться к врачу"
      )
      .replace(
        /warning[:,]?/gi,
        "Важное предупреждение"
      );
  }

  return result;
}

export async function askAdvisor(
  patientId,
  userMessage,
  mode = "medical"
) {
  const apiKey =
    process.env.GROQ_API_KEY;

  const normalizedPatientId =
    clean(patientId);

  const normalizedMessage =
    clean(userMessage);

  const normalizedMode =
    clean(mode) || "medical";

  if (!apiKey) {
    throw new Error(
      "Не настроен ключ GROQ_API_KEY. ИИ-помощник временно недоступен."
    );
  }

  if (!normalizedPatientId) {
    throw new Error(
      "Не удалось определить пользователя."
    );
  }

  if (!normalizedMessage) {
    throw new Error(
      "Введите сообщение для ИИ-помощника."
    );
  }

  if (normalizedMessage.length > 2000) {
    throw new Error(
      "Сообщение не должно превышать 2000 символов."
    );
  }

  const language = detectLanguage(
    normalizedMessage
  );

  const history = await loadHistory(
    normalizedPatientId,
    normalizedMode
  );

  const messages = [
    {
      role: "system",
      content:
        getSystemPrompt(language),
    },
  ];

  history.forEach((historyMessage) => {
    if (
      !["user", "assistant"].includes(
        historyMessage.role
      )
    ) {
      return;
    }

    messages.push({
      role: historyMessage.role,
      content: clean(
        historyMessage.message_text
      ),
    });
  });

  messages.push({
    role: "user",
    content: normalizedMessage,
  });

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages,
        temperature: 0.2,
        top_p: 0.85,
        max_tokens: 1200,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        timeout: 30000,
      }
    );

    const rawReply =
      response.data?.choices?.[0]
        ?.message?.content;

    if (!clean(rawReply)) {
      throw new Error(
        "Нейросеть вернула пустой ответ."
      );
    }

    const reply =
      removeEnglishHeadings(
        rawReply,
        language
      );

    await saveHistory(
      normalizedPatientId,
      normalizedMode,
      normalizedMessage,
      reply
    );

    return reply;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.error
        ?.message ||
      error?.response?.data?.message ||
      error?.message ||
      "Неизвестная ошибка";

    console.error(
      "Ошибка запроса к Groq:",
      errorMessage
    );

    throw new Error(
      `Ошибка ИИ-помощника: ${errorMessage}`
    );
  }
}
