import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GROQ_API_KEY;

export async function askGemini(message) {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",

        messages: [
          {
            role: "system",
            content: `
Ты медицинский ИИ помощник.

ВАЖНЫЕ ПРАВИЛА:
- Отвечай только на русском или казахском языке.
- Пиши естественно и по-человечески.
- Не используй странные слова.
- Не придумывай лекарства.
- Не ставь точный диагноз.
- Объясняй всё простым языком.
- Если симптомы опасные — советуй обратиться к врачу.
- Если пользователь пишет температуру, боль, кашель, тошноту и т.д. — анализируй симптомы.
- Можешь советовать базовые лекарства и общие рекомендации.
- Не пиши слишком длинные ответы.
- Будь похож на живого помощника.

Если не уверен в препарате — скажи об этом честно.
`
          },

          {
            role: "user",
            content: message
          }
        ]
      },

      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;

  } catch (error) {

    console.log(
      "GROQ ERROR:",
      error.response?.data || error.message
    );

    return "Ошибка ответа ИИ";
  }
}