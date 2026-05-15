import axios from "axios";

export async function askGemini(message) {
  const apiKey = process.env.GEMINI_API_KEY;

  const prompt = `
Ты ИИ помощник медицинской карты.
Отвечай простым русским языком.
Не ставь диагноз.
Если вопрос опасный или сложный — советуй обратиться к врачу.

Вопрос пользователя:
${message}
`;

 const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await axios.post(url, {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  });

  return (
    response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Не удалось получить ответ."
  );
}