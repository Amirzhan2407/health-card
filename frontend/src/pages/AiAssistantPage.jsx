import { useState } from "react";
import "../styles/aiAssistant.css";

export default function AiAssistantPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Здравствуйте! Я ИИ помощник. Могу помочь с вопросами по здоровью, препаратам и поиском аптек.",
    },
  ]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
  if (!input.trim()) return;

  const userMessage = {
    role: "user",
    text: input,
  };

  setMessages((prev) => [...prev, userMessage]);

  const currentMessage = input;
  setInput("");

  try {
    const response = await fetch(
      "https://health-card.onrender.com/api/ai/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentMessage,
        }),
      }
    );

    const data = await response.json();

    const botMessage = {
      role: "assistant",
      text: data.answer || "Нет ответа от ИИ",
    };

    setMessages((prev) => [...prev, botMessage]);
  } catch (error) {
    console.error(error);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: "Ошибка подключения к серверу",
      },
    ]);
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
          <p>Медицинский помощник для справочной информации</p>
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
            <div className="aiMessage">
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="aiInputBox">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Напишите вопрос ИИ помощнику..."
          rows={1}
        />

        <button type="button" onClick={sendMessage}>
          Отправить
        </button>
      </div>
    </div>
  );
}