import { useState } from "react";
import { searchMedicine } from "../services/backendApi";

export default function AiAssistantPage() {
  const [medicine, setMedicine] = useState("парацетамол");
  const [city, setCity] = useState("astana");
  const [result, setResult] = useState("");
  const [err, setErr] = useState("");

  const onSearch = async () => {
    setErr("");
    setResult("");

    try {
      const data = await searchMedicine({ medicine, city });
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setErr(e.message || "Ошибка");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>ИИ помощник</h1>

      <input
        value={medicine}
        onChange={(e) => setMedicine(e.target.value)}
        placeholder="Название препарата"
      />

      <input
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="Город"
        style={{ marginLeft: 10 }}
      />

      <button onClick={onSearch} style={{ marginLeft: 10 }}>
        Проверить backend
      </button>

      {err && <div style={{ color: "red", marginTop: 20 }}>{err}</div>}

      {result && (
        <pre style={{ marginTop: 20, background: "#111", color: "#fff", padding: 16 }}>
          {result}
        </pre>
      )}
    </div>
  );
}