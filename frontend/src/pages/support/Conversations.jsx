import { useState, useEffect } from "react";
import api from "../../api/api";
import { RiQuestionAnswerLine } from "react-icons/ri";

export default function Conversations() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState("");

  async function loadTickets() {
    try {
      const res = await api.get("/support/conversations");
      if (res.data?.success) {
        setTickets(res.data.data);
      }
    } catch (err) {
      console.warn(err);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSelectTicket = async (ticket) => {
    try {
      const res = await api.get(`/support/conversations/${ticket.id}`);
      if (res.data?.success) {
        setSelectedTicket(res.data.data);
      }
    } catch (err) {
      alert("Не удалось загрузить сообщения: " + err.message);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;

    try {
      const res = await api.post(`/support/conversations/${selectedTicket.id}/messages`, {
        messageText: reply,
      });
      if (res.data?.success) {
        setReply("");
        // Reload details
        handleSelectTicket(selectedTicket);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Диалоги техподдержки</h2>
      <p style={styles.sub}>Общайтесь с представителями клиник по техническим вопросам.</p>

      <div style={styles.flex}>
        {/* Ticket List */}
        <div style={styles.listCard}>
          <div style={styles.list}>
            {tickets.length === 0 ? (
              <p style={{ color: "#94a3b8" }}>Активных обращений нет.</p>
            ) : (
              tickets.map(t => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTicket(t)}
                  style={{
                    ...styles.item,
                    ...(selectedTicket?.id === t.id ? styles.activeItem : {}),
                  }}
                >
                  <RiQuestionAnswerLine style={styles.icon} />
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontWeight: 600 }}>{t.subject}</h4>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "12px" }}>Клиника: {t.organization?.name}</p>
                  </div>
                  <span style={{
                    ...styles.status,
                    color: t.status === "open" ? "#ef4444" : "#10b981"
                  }}>{t.status}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dialog Chat */}
        <div style={styles.detailCard}>
          {selectedTicket ? (
            <div style={styles.chat}>
              <h3 style={styles.chatTitle}>{selectedTicket.subject}</h3>
              <div style={styles.messagesBox}>
                {selectedTicket.messages.map((m) => (
                  <div key={m.id} style={m.sender?.role === "support" ? styles.supportRow : styles.clientRow}>
                    <div style={m.sender?.role === "support" ? styles.supportBubble : styles.clientBubble}>
                      <span style={styles.senderName}>{m.sender?.fullName} ({m.sender?.role}):</span>
                      <p style={{ margin: "4px 0 0 0" }}>{m.message_text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendReply} style={styles.replyForm}>
                <input
                  type="text"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Введите ответ..."
                  style={styles.replyInput}
                  required
                />
                <button type="submit" style={styles.replyBtn}>Отправить</button>
              </form>
            </div>
          ) : (
            <p style={{ color: "#94a3b8", textAlign: "center", marginTop: "100px" }}>Выберите тикет обращения для просмотра диалога.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "40px", color: "#fff", fontFamily: "'Outfit', sans-serif" },
  title: { fontSize: "32px", fontWeight: 700, margin: "0 0 8px 0" },
  sub: { color: "#94a3b8", fontSize: "16px", margin: "0 0 40px 0" },
  flex: { display: "flex", gap: "30px", flexWrap: "wrap", height: "calc(100vh - 250px)" },
  listCard: { background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "24px", borderRadius: "20px", flex: 1, minWidth: "300px", overflowY: "auto" },
  detailCard: { background: "rgba(30, 41, 59, 0.4)", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "24px", borderRadius: "20px", flex: 2, minWidth: "320px", display: "flex", flexDirection: "column" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  item: { display: "flex", alignItems: "center", gap: "12px", background: "rgba(0,0,0,0.15)", padding: "16px", borderRadius: "12px", cursor: "pointer" },
  activeItem: { border: "1px solid #6366f1" },
  icon: { fontSize: "20px", color: "#6366f1" },
  status: { marginLeft: "auto", fontSize: "12px", fontWeight: 700, textTransform: "uppercase" },
  chat: { display: "flex", flexDirection: "column", height: "100%" },
  chatTitle: { fontSize: "20px", margin: "0 0 20px 0" },
  messagesBox: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" },
  supportRow: { display: "flex", justifyContent: "flex-end" },
  clientRow: { display: "flex", justifyContent: "flex-start" },
  supportBubble: { background: "#6366f1", padding: "12px", borderRadius: "12px 12px 2px 12px", maxWidth: "80%" },
  clientBubble: { background: "rgba(255,255,255,0.08)", padding: "12px", borderRadius: "12px 12px 12px 2px", maxWidth: "80%" },
  senderName: { fontSize: "11px", color: "#94a3b8", fontWeight: 600 },
  replyForm: { display: "flex", gap: "12px" },
  replyInput: { flex: 1, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none" },
  replyBtn: { background: "#10b981", border: "none", color: "#fff", padding: "12px 20px", borderRadius: "12px", cursor: "pointer", fontWeight: 600 }
};
