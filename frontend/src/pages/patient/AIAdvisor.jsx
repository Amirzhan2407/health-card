import { useState, useEffect, useRef } from "react";
import api from "../../api/api";
import { RiRobotLine, RiSendPlaneLine } from "react-icons/ri";

export default function AIAdvisor() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const loadHistory = async () => {
    try {
      const res = await api.get("/ai/history");
      if (res.data?.success) {
        setMessages(res.data.data.map(m => ({ role: m.role, text: m.message_text })));
      }
    } catch (err) {
      console.warn(err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await api.post("/ai/consult", { message: userText });
      if (res.data?.success) {
        setMessages(prev => [...prev, { role: "assistant", text: res.data.reply }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `Ошибка: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>AI Консультант</h2>
      <p style={styles.sub}>Задайте вопрос нейросети о симптомах, дозировках безрецептурных средств.</p>

      <div style={styles.chatCard}>
        <div style={styles.messageBox}>
          {messages.length === 0 && (
            <div style={styles.empty}>
              <RiRobotLine style={{ fontSize: "48px", color: "#6366f1", marginBottom: "12px" }} />
              <p>Опишите ваши симптомы, например: "У меня болит голова, можно ли принять ибупрофен?"</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={msg.role === "user" ? styles.userRow : styles.aiRow}>
              <div style={msg.role === "user" ? styles.userBubble : styles.aiBubble}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} style={styles.inputArea}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Спросить AI-консультанта..."
            style={styles.chatInput}
            disabled={loading}
            required
          />
          <button type="submit" style={styles.sendButton} disabled={loading}>
            <RiSendPlaneLine />
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "40px", color: "#fff", fontFamily: "'Outfit', sans-serif", display: "flex", flexDirection: "column", height: "calc(100vh - 100px)" },
  title: { fontSize: "32px", fontWeight: 700, margin: "0 0 8px 0" },
  sub: { color: "#94a3b8", fontSize: "16px", margin: "0 0 20px 0" },
  chatCard: { background: "rgba(30, 41, 59, 0.4)", borderRadius: "20px", border: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" },
  messageBox: { flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", textAlign: "center", padding: "40px" },
  userRow: { display: "flex", justifyContent: "flex-end" },
  aiRow: { display: "flex", justifyContent: "flex-start" },
  userBubble: { background: "#6366f1", color: "#fff", padding: "12px 18px", borderRadius: "16px 16px 4px 16px", maxWidth: "70%", fontSize: "15px", lineHeight: "1.5" },
  aiBubble: { background: "rgba(255, 255, 255, 0.08)", color: "#e2e8f0", padding: "12px 18px", borderRadius: "16px 16px 16px 4px", maxWidth: "70%", fontSize: "15px", lineHeight: "1.5", border: "1px solid rgba(255,255,255,0.05)" },
  inputArea: { display: "flex", padding: "16px", background: "rgba(0, 0, 0, 0.2)", borderTop: "1px solid rgba(255, 255, 255, 0.05)", gap: "12px" },
  chatInput: { flex: 1, background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none" },
  sendButton: { background: "#6366f1", color: "#fff", border: "none", width: "45px", height: "45px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "18px" }
};
