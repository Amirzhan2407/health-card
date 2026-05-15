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

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMessage = {
      role: "user",
      text: input,
    };

    const botMessage = {
      role: "assistant",
      text: "Пока это тестовый ответ. Позже подключим Gemini API и данные из вашей медкарты.",
    };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setInput("");
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