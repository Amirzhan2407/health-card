import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api/api";

export default function VisitEditor() {
  const [searchParams] = useSearchParams();
  const apptId = searchParams.get("apptId");
  const navigate = useNavigate();

  const [step, setStep] = useState("start"); // 'start', 'edit', 'finish'
  const [startCode, setStartCode] = useState("");
  const [finishCode, setFinishCode] = useState("");
  const [complaints, setComplaints] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  
  const [msg, setMsg] = useState("");

  const handleStart = async () => {
    try {
      const res = await api.post(`/appointments/${apptId}/start`, { code: startCode });
      if (res.data?.success) {
        setStep("edit");
        setMsg("Прием успешно начат.");
      }
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleRequestFinish = async () => {
    try {
      const res = await api.post(`/appointments/${apptId}/request-finish`);
      if (res.data?.success) {
        setStep("finish");
        setMsg("Код подтверждения отправлен пациенту.");
      }
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleFinish = async () => {
    try {
      const res = await api.post(`/appointments/${apptId}/finish`, {
        code: finishCode,
        complaints,
        symptoms,
        finalDiagnosis: diagnosis,
        treatment,
      });
      if (res.data?.success) {
        setMsg("Прием успешно завершен.");
        setTimeout(() => navigate("/doctor"), 1500);
      }
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Прием пациента</h2>
      {msg && <p style={styles.alert}>{msg}</p>}

      {step === "start" && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Начало приема</h3>
          <p style={styles.text}>Введите проверочный код из приложения пациента для начала приема.</p>
          <input type="text" value={startCode} onChange={e => setStartCode(e.target.value)} placeholder="Код начала (6 цифр)" style={styles.input} />
          <button onClick={handleStart} style={styles.button}>Начать прием</button>
        </div>
      )}

      {step === "edit" && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Протокол осмотра</h3>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Жалобы</label>
            <textarea value={complaints} onChange={e => setComplaints(e.target.value)} style={styles.textarea} />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Симптомы</label>
            <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} style={styles.textarea} />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Диагноз</label>
            <input type="text" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Лечение</label>
            <textarea value={treatment} onChange={e => setTreatment(e.target.value)} style={styles.textarea} />
          </div>
          <button onClick={handleRequestFinish} style={styles.button}>Завершить осмотр</button>
        </div>
      )}

      {step === "finish" && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Подтверждение завершения</h3>
          <p style={styles.text}>Введите 4-значный код завершения, полученный пациентом.</p>
          <input type="text" value={finishCode} onChange={e => setFinishCode(e.target.value)} placeholder="Код (4 цифры)" style={styles.input} />
          <button onClick={handleFinish} style={styles.button}>Подтвердить и сохранить</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: "40px", color: "#fff", fontFamily: "'Outfit', sans-serif" },
  title: { fontSize: "32px", fontWeight: 700, margin: "0 0 20px 0" },
  card: { background: "rgba(30, 41, 59, 0.4)", padding: "30px", borderRadius: "20px", border: "1px solid rgba(255, 255, 255, 0.05)", maxWidth: "600px" },
  cardTitle: { fontSize: "20px", fontWeight: 600, margin: "0 0 20px 0" },
  text: { color: "#94a3b8", fontSize: "14px", marginBottom: "20px" },
  input: { background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none", width: "100%", boxSizing: "border-box", marginBottom: "20px" },
  textarea: { background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none", width: "100%", boxSizing: "border-box", minHeight: "80px", fontFamily: "inherit" },
  button: { background: "#6366f1", border: "none", color: "#fff", padding: "12px 24px", borderRadius: "12px", cursor: "pointer", fontWeight: 600 },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" },
  label: { fontSize: "13px", color: "#94a3b8" },
  alert: { color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", padding: "12px", borderRadius: "10px", marginBottom: "20px", maxWidth: "600px" }
};
