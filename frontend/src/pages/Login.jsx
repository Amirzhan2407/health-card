// src/pages/Login.jsx
import { useEffect, useState } from "react";
import { nca, makeLoginPayload } from "../services/ncalayer.js";

export default function Login({ onSuccess }) {

  // ============================================================
  // ========================= ЛОГИКА ============================
  // ============================================================
  // ❗ НЕ МЕНЯЙ НИЖЕ (если хочешь сохранить функционал)

  const [version, setVersion] = useState("");
  const [status, setStatus] = useState("init");
  const [result, setResult] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setStatus("checking");
        const v = await nca.getVersion();
        setVersion(JSON.stringify(v));
        setStatus("ready");
      } catch (e) {
        setErr(e.message || String(e));
        setStatus("error");
      }
    })();
  }, []);

  const onSign = async () => {
    setErr("");
    setResult("");
    setStatus("signing");

    try {
      const base64ToSign = makeLoginPayload();
      const signature = await nca.basicsSignCMS(base64ToSign, "ru");
      setResult(String(signature));
      setStatus("ok");
      onSuccess?.(); // когда подпись получена — считаем вход успешным
    } catch (e) {
      setErr(e.message || String(e));
      setStatus("error");
    }
  };

  // Текст статуса для UI (можно менять ТЕКСТЫ, но НЕ значения status)
  const statusText =
    status === "checking"
      ? "Проверяем NCALayer..."
      : status === "ready"
      ? "NCALayer подключен"
      : status === "signing"
      ? "Ожидаем подпись (должно открыться окно выбора ключа)..."
      : status === "ok"
      ? "Подпись получена"
      : status === "error"
      ? "Ошибка"
      : "…";

  // ============================================================
  // ========================= ДИЗАЙН ============================
  // ============================================================
  // ✅ МЕНЯЙ ТОЛЬКО НИЖЕ (всё внутри return)
  // ❗ НО НЕ УДАЛЯЙ эти привязки, иначе функционал "исчезнет" в UI:
  // - onClick={onSign}
  // - {statusText}
  // - {version || "-"}
  // - {err && (...)}
  // - {result && (...)} и {result.slice(...)} и {result.length ...}

 return (
  <div
    style={{
      width: "100vw",
      minHeight: "100vh",
      background: "#F4F7FB",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily:
        'system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans"',
    }}
  >
    {/* Карточка авторизации */}
    <div
      style={{
        width: "100%",
        maxWidth: 520,
        background: "linear-gradient(135deg, #6a8cff, #5c52bd)",

        borderRadius: 20,
        padding: "clamp(18px, 3vw, 28px)",
        boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
        border: "1px solid #E6EAF2",
      }}
    >
      {/* Заголовок */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: "#EFF6FF",
              border: "1px solid #DBEAFE",
              display: "grid",
              placeItems: "center",
              color: "#698bd3",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            +
          </div>

          <div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>
              Личная карта здоровья
            </div>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              Авторизация через ЭЦП
            </div>
          </div>
        </div>
      </div>

      {/* Статус */}
      <div
        style={{
          background:
            status === "ok"
              ? "#ECFDF3"
              : status === "error"
              ? "#FEF2F2"
              : "#F8FAFC",
          border: "1px solid #E6EAF2",
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ fontWeight: 800 }}>{statusText}</div>
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
          Ответ getVersion: {version || "-"}
        </div>
      </div>

      {/* Сводка */}
      <div
        style={{
          border: "1px solid #E6EAF2",
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 6 }}>
          Сводка подтверждения
        </div>

        <div
          style={{
            background: "#F8FAFC",
            borderRadius: 12,
            padding: 10,
            fontSize: 13,
            marginBottom: 8,
          }}
        >
          Сервис: Личная карта здоровья
        </div>

        <div
          style={{
            background: "#ECFDF3",
            border: "1px solid #BBF7D0",
            borderRadius: 12,
            padding: 10,
            fontSize: 13,
            color: "#000000",
          }}
        >
          Личность будет подтверждена. ФИО и ИИН подтянутся из ключа.
        </div>
      </div>

      {/* Кнопка */}
      <button
        onClick={onSign}
        style={{
          width: "100%",
          height: 52,
          borderRadius: 14,
          border: "none",
          background: "#788dc0",
          color: "#fff",
          fontWeight: 900,
          fontSize: 15,
          cursor: "pointer",
          boxShadow: "0 14px 30px rgba(15,23,42,0.25)",
        }}
      >
        Подписать и войти
      </button>

      {/* Ошибка */}
      {err && (
        <div
          style={{
            marginTop: 12,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 12,
            padding: 10,
            color: "#7F1D1D",
            fontSize: 13,
          }}
        >
          {err}
        </div>
      )}

      {/* Результат */}
      {result && (
        <div
          style={{
            marginTop: 12,
            background: "#0F172A",
            borderRadius: 12,
            padding: 10,
          }}
        >
          <div style={{ color: "#fff", fontWeight: 800, marginBottom: 6 }}>
            CMS подпись (часть):
          </div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 12,
              color: "#CBD5E1",
              margin: 0,
            }}
          >
            {result.slice(0, 800)}
            {result.length > 800 ? "..." : ""}
          </pre>
        </div>
      )}
    </div>
  </div>
);
}