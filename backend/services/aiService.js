import axios from "axios";
import { supabase } from "../config/supabaseClient.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `
Вы — виртуальный медицинский консультант Clinic OS. Ваша цель — помочь пользователю проанализировать симптомы и дать базовые рекомендации.
Строго соблюдайте следующие правила безопасности:
1. Вы не имеете права ставить окончательные диагнозы или выписывать рецептурные препараты. Всегда напоминайте о необходимости очной консультации врача.
2. Вы можете рекомендовать только безрецептурные средства (OTC) и базовую первую помощь в рамках следующих лимитов:
   - Парацетамол (Paracetamol): максимум 500 мг на один прием, 2-4 раза в сутки, интервал не менее 4-6 часов, максимальная суточная доза 3000 мг.
   - Ибупрофен (Ibuprofen): 200-400 мг на прием, 2-3 раза в сутки после еды.
   - Активированный уголь (Activated Charcoal): 1 таблетка на 10 кг веса.
   - Смекта (Smecta): 1 пакетик, 2-3 раза в сутки.
3. Не превышайте указанные дозировки и не придумывайте другие нормы безопасности.
4. Отвечайте строго на том языке, на котором обратился пользователь (только русский или казахский).
`;

export async function askAdvisor(patientId, userMessage, mode = "medical") {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("Не настроен ключ GROQ_API_KEY. Функция AI-ассистента временно недоступна.");
  }

  // 1. Fetch latest history from database for context (limit to last 10 messages)
  const { data: history, error: dbErr } = await supabase
    .from("ai_history")
    .select("role, message_text, created_at")
    .eq("patient_id", patientId)
    .eq("mode", mode)
    .order("created_at", { ascending: true })
    .limit(10);

  if (dbErr) {
    console.error("Failed to load AI history context:", dbErr.message);
  }

  // 2. Format messages payload
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (history && history.length > 0) {
    history.forEach((msg) => {
      messages.push({
        role: msg.role,
        content: msg.message_text,
      });
    });
  }

  // Add the current user query
  messages.push({ role: "user", content: userMessage });

  // 3. Post to Groq API
  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages,
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content;
    if (!reply) {
      throw new Error("Не удалось получить текстовый ответ от нейросети.");
    }

    // 4. Save user query to history
    await supabase.from("ai_history").insert([
      { patient_id: patientId, mode, role: "user", message_text: userMessage },
      { patient_id: patientId, mode, role: "assistant", message_text: reply },
    ]);

    return reply;
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    throw new Error(`Ошибка AI-ассистента: ${errorMsg}`);
  }
}
