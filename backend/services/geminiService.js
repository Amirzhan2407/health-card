import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY;

export async function askGemini(message) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct:free",

        messages: [
          {
            role: "system",
            content: `
Ты медицинский ИИ помощник.

Ты НЕ ставишь диагноз.
Но можешь предполагать возможные причины симптомов.

Ты должен:
- задавать уточняющие вопросы
- помогать понять серьезность симптомов
- советовать базовые лекарства
- говорить примерную дозировку
- учитывать температуру, кашель, боль, живот, тошноту и т.д.
- советовать обратиться к врачу если опасно

Отвечай как живой медицинский помощник.
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
          "Content-Type": "application/json",
          "HTTP-Referer": "https://health-card-rose.vercel.app",
          "X-Title": "Health Card AI"
        }
      }
    );

    return response.data.choices[0].message.content;

  } catch (error) {
    console.log(
      "OPENROUTER ERROR:",
      error.response?.data || error.message
    );

    return "Ошибка ответа ИИ";
  }
}