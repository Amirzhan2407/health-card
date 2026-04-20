// src/pages/Login.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  nca,
  makeLoginPayload,
  parseCmsSignature,
  mapKeyInfo,
} from "../services/ncalayer.js";
import "../styles/login.css";

export default function Login() {
  const navigate = useNavigate();

  const [version, setVersion] = useState("");
  const [status, setStatus] = useState("init");
  const [result, setResult] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setStatus("checking");
        const v = await nca.getVersion();
        setVersion(typeof v === "string" ? v : JSON.stringify(v));
        setStatus("ready");
      } catch (e) {
        setVersion("NCALayer недоступен");
        setErr(e?.message || "NCALayer недоступен");
        setStatus("error");
      }
    })();
  }, []);

  const onSign = async () => {
    if (status === "reading" || status === "signing") return;

    setErr("");
    setResult("");

    try {
      // 1. Сначала надежно читаем реальные данные сертификата
      setStatus("reading");
      const rawKeyInfo = await nca.getKeyInfo();
      const keyData = mapKeyInfo(rawKeyInfo);

      console.log("KEY INFO RAW:", rawKeyInfo);
      console.log("KEY INFO MAPPED:", keyData);

      // 2. Потом подписываем вход
      setStatus("signing");
      const payload = makeLoginPayload();
      const signature = await nca.basicsSignCMS(payload, "ru");
      const signatureText = String(signature);

      setResult(signatureText);

      // 3. Из CMS берем fallback для ИИН/срока, если keyInfo что-то не дал
      const cmsData = parseCmsSignature(signatureText);

      const userData = {
        fullName: keyData.fullName || "—",
        iin: keyData.iin !== "—" ? keyData.iin : cmsData.iin || "—",
        certExpire:
          keyData.certExpire !== "—"
            ? keyData.certExpire
            : cmsData.certExpire || "—",
      };

      localStorage.setItem("userData", JSON.stringify(userData));
      localStorage.setItem("authSignature", signatureText);

      setStatus("ok");
      navigate("/home");
    } catch (e) {
      setErr(e?.message || "Ошибка работы с ЭЦП");
      setStatus("error");
    }
  };

  const statusText =
    status === "checking"
      ? "Проверяем NCALayer..."
      : status === "ready"
      ? "NCALayer подключен"
      : status === "reading"
      ? "Считываем данные сертификата..."
      : status === "signing"
      ? "Подписываем вход..."
      : status === "ok"
      ? "Вход выполнен"
      : status === "error"
      ? "Ошибка"
      : "…";

  return (
    <div className="loginWrap">
      <div className="loginCard">
        <div className="loginHeader">
          <div className="loginHeaderRow">
            <div className="loginLogo">+</div>
            <div>
              <div className="loginTitle">Личная карта здоровья</div>
              <div className="loginSub">Авторизация через ЭЦП</div>
            </div>
          </div>
        </div>

        <div
          className={`loginPanel ${
            status === "ok" ? "ok" : status === "error" ? "error" : ""
          }`}
        >
          <div className="loginPanelTitle">{statusText}</div>
          <div className="loginPanelMeta">Ответ getVersion: {version || "-"}</div>
        </div>

        <div className="loginPanel">
          <div className="loginSummaryTitle">Сводка подтверждения</div>
          <div className="loginChip">Сервис: Личная карта здоровья</div>
          <div className="loginChipGreen">
            ФИО, ИИН и срок действия берутся из сертификата ЭЦП. При этом NCALayer
            может открыть окно два раза — это нормально для надёжного чтения данных.
          </div>
        </div>

        <button
          type="button"
          onClick={onSign}
          disabled={status === "reading" || status === "signing"}
          className="loginBtn"
        >
          {status === "reading" || status === "signing"
            ? "Обрабатываем..."
            : "Подписать и войти"}
        </button>

        {err && <div className="loginError">{err}</div>}

        {result && (
          <div className="loginCms">
            <div className="loginCmsTitle">CMS подпись (часть):</div>
            <pre className="loginCmsPre">
              {result.slice(0, 800)}
              {result.length > 800 ? "..." : ""}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}