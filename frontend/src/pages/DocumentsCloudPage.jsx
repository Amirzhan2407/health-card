import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "../styles/history.css";

const severityOptions = ["Лёгкая", "Средняя", "Тяжёлая", "Критическая"];

export default function DocumentsCloudPage() {
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const userIin = userData?.iin || "";

  const [cases, setCases] = useState([]);
  const [openCaseModal, setOpenCaseModal] = useState(false);
  const [openRecordModal, setOpenRecordModal] = useState(false);

  const [selectedCase, setSelectedCase] = useState(null);

  const [title, setTitle] = useState("");
  const [openedAt, setOpenedAt] = useState("");
  const [severity, setSeverity] = useState("Лёгкая");

  const [recordDate, setRecordDate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [recordSeverity, setRecordSeverity] = useState("Лёгкая");
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [complications, setComplications] = useState("");
  const [treatment, setTreatment] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [comment, setComment] = useState("");
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState(null);

  const [error, setError] = useState("");

  async function loadCases() {
    const { data, error } = await supabase
      .from("medical_cases")
      .select("*, medical_case_records(*)")
      .eq("user_iin", userIin)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setCases(data || []);
  }

  useEffect(() => {
    if (userIin) loadCases();
  }, [userIin]);

  function openAddCase() {
    setTitle("");
    setOpenedAt("");
    setSeverity("Лёгкая");
    setError("");
    setOpenCaseModal(true);
  }

  async function saveCase() {
    if (!title.trim()) {
      setError("Введите название заболевания.");
      return;
    }

    if (!openedAt) {
      setError("Выберите дату открытия.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    if (openedAt < today) {
      setError("Дата открытия не может быть раньше сегодняшнего дня.");
      return;
    }

    const { error } = await supabase.from("medical_cases").insert([
      {
        user_iin: userIin,
        case_type: "disease",
        title: title.trim(),
        opened_at: openedAt,
        current_severity: severity,
        status: "active",
      },
    ]);

    if (error) {
      setError(error.message);
      return;
    }

    setOpenCaseModal(false);
    loadCases();
  }

  function openAddRecord(item) {
    setSelectedCase(item);
    setRecordDate("");
    setTemperature("");
    setRecordSeverity(item.current_severity || "Лёгкая");
    setSymptoms("");
    setDiagnosis("");
    setComplications("");
    setTreatment("");
    setRecommendations("");
    setComment("");
    setFileName("");
    setFile(null);
    setError("");
    setOpenRecordModal(true);
  }

  async function saveRecord() {
    if (!recordDate) {
      setError("Выберите дату записи.");
      return;
    }

    if (recordDate < selectedCase.opened_at) {
      setError("Дата записи не может быть раньше даты открытия больничного.");
      return;
    }

    if (temperature && Number.isNaN(Number(temperature))) {
      setError("Температура должна быть числом. Например: 38.7");
      return;
    }

    let uploadedPath = null;

    if (file) {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      uploadedPath = `${userIin}/${selectedCase.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("medical-cases")
        .upload(uploadedPath, file);

      if (uploadError) {
        setError(uploadError.message);
        return;
      }
    }

    const { error } = await supabase.from("medical_case_records").insert([
      {
        case_id: selectedCase.id,
        record_date: recordDate,
        severity: recordSeverity,
        temperature: temperature ? Number(temperature) : null,
        symptoms: symptoms.trim() || null,
        diagnosis: diagnosis.trim() || null,
        complications: complications.trim() || null,
        treatment: treatment.trim() || null,
        recommendations: recommendations.trim() || null,
        comment: comment.trim() || null,
        file_name: fileName.trim() || file?.name || null,
        file_path: uploadedPath,
      },
    ]);

    if (error) {
      setError(error.message);
      return;
    }

    await supabase
      .from("medical_cases")
      .update({ current_severity: recordSeverity })
      .eq("id", selectedCase.id);

    setOpenRecordModal(false);
    loadCases();
  }

  async function closeCase(item) {
    const ok = window.confirm("Закрыть больничный?");
    if (!ok) return;

    const today = new Date().toISOString().slice(0, 10);

    const { error } = await supabase
      .from("medical_cases")
      .update({
        status: "closed",
        closed_at: today,
      })
      .eq("id", item.id);

    if (error) {
      setError(error.message);
      return;
    }

    loadCases();
  }

  return (
    <div className="historyPage">
      <div className="historyHeader">
        <div>
          <h2 className="historyTitle">История болезни</h2>
          <p className="historySub">
            Заболевания, травмы, операции и госпитализации
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <LanguageSwitcher />

          <button className="historyAddBtn" type="button" onClick={openAddCase}>
            + Добавить больничный
          </button>
        </div>
      </div>

      {error && <div className="errorText">{error}</div>}

      {cases.length === 0 ? (
        <div className="historyEmpty">История болезни пока пуста</div>
      ) : (
        <div className="historyList">
          {cases.map((item) => (
            <div className="historyCard" key={item.id}>
              <div className="historyCardTop">
                <div>
                  <div className="historyCardName">{item.title}</div>
                  <div className="historyCaseType">Заболевание</div>
                </div>

                <div className="historySeverity">{item.current_severity}</div>
              </div>

              <div className="historyRow">
                <strong>Открыто:</strong> {item.opened_at}
              </div>

              <div className="historyRow">
                <strong>Статус:</strong>{" "}
                {item.status === "active" ? "Активен" : "Завершён"}
              </div>

              {item.closed_at && (
                <div className="historyRow">
                  <strong>Закрыто:</strong> {item.closed_at}
                </div>
              )}

              {item.status === "active" && (
                <div className="historyActions">
                  <button
                    className="smallActionBtn"
                    type="button"
                    onClick={() => openAddRecord(item)}
                  >
                    Добавить запись
                  </button>

                  <button
                    className="smallActionBtn dark"
                    type="button"
                    onClick={() => closeCase(item)}
                  >
                    Закрыть больничный
                  </button>
                </div>
              )}

              <div className="historyHistoryTitle">Записи осмотров</div>

              {item.medical_case_records?.length ? (
                item.medical_case_records
                  .sort((a, b) => new Date(b.record_date) - new Date(a.record_date))
                  .map((rec) => (
                    <div className="historyRecord" key={rec.id}>
                      <div className="historyRecordTop">
                        <strong>{rec.record_date}</strong>
                        <span>{rec.severity}</span>
                      </div>

                      {rec.temperature && (
                        <div>Температура: {rec.temperature}°C</div>
                      )}

                      {rec.symptoms && <div>Симптомы: {rec.symptoms}</div>}
                      {rec.diagnosis && <div>Диагноз: {rec.diagnosis}</div>}

                      {rec.complications && (
                        <div>Осложнения: {rec.complications}</div>
                      )}

                      {rec.treatment && <div>Назначения: {rec.treatment}</div>}

                      {rec.recommendations && (
                        <div>Рекомендации: {rec.recommendations}</div>
                      )}

                      {rec.comment && <div>Комментарий: {rec.comment}</div>}
                      {rec.file_name && <div>Файл: {rec.file_name}</div>}
                    </div>
                  ))
              ) : (
                <div className="historyEmptySmall">Записей пока нет</div>
              )}
            </div>
          ))}
        </div>
      )}

      {openCaseModal && (
        <div className="modalOverlay" onClick={() => setOpenCaseModal(false)}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalTitle">Открыть больничный</div>

            <div className="modalContent">
              <div className="modalSection">
                <label className="modalLabel">Название заболевания</label>
                <input
                  className="modalInput"
                  placeholder="Например: COVID-19"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="modalSection">
                <label className="modalLabel">Тип случая</label>
                <input className="modalInput" value="Заболевание" readOnly />
              </div>

              <div className="modalSection">
                <label className="modalLabel">Дата открытия</label>
                <input
                  className="modalInput"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={openedAt}
                  onChange={(e) => setOpenedAt(e.target.value)}
                />
              </div>

              <div className="modalSection">
                <label className="modalLabel">Текущая тяжесть</label>
                <select
                  className="modalInput"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  {severityOptions.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modalButtons">
              <button
                className="actionButton"
                onClick={() => setOpenCaseModal(false)}
              >
                Отмена
              </button>
              <button className="actionButton primaryBtn" onClick={saveCase}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {openRecordModal && (
        <div className="modalOverlay" onClick={() => setOpenRecordModal(false)}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalTitle">Добавить запись осмотра</div>

            <div className="modalContent">
              <div className="modalSection">
                <label className="modalLabel">Дата записи</label>
                <input
                  className="modalInput"
                  type="date"
                  min={selectedCase?.opened_at}
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                />
              </div>

              <div className="modalSection">
                <label className="modalLabel">Температура</label>
                <input
                  className="modalInput"
                  placeholder="Например: 38.7"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
              </div>

              <div className="modalSection">
                <label className="modalLabel">Тяжесть состояния</label>
                <select
                  className="modalInput"
                  value={recordSeverity}
                  onChange={(e) => setRecordSeverity(e.target.value)}
                >
                  {severityOptions.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modalSection">
                <label className="modalLabel">Симптомы</label>
                <textarea
                  className="modalInput textareaInput"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>

              <div className="modalSection">
                <label className="modalLabel">Диагноз / уточнение</label>
                <textarea
                  className="modalInput textareaInput"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>

              <div className="modalSection">
                <label className="modalLabel">Осложнения</label>
                <textarea
                  className="modalInput textareaInput"
                  value={complications}
                  onChange={(e) => setComplications(e.target.value)}
                />
              </div>

              <div className="modalSection">
                <label className="modalLabel">Назначения врача</label>
                <textarea
                  className="modalInput textareaInput"
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                />
              </div>

              <div className="modalSection">
                <label className="modalLabel">Рекомендации</label>
                <textarea
                  className="modalInput textareaInput"
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                />
              </div>

              <div className="modalSection">
                <label className="modalLabel">Название файла</label>
                <input
                  className="modalInput"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                />
              </div>

              <div className="modalSection">
                <label className="modalLabel">Файл</label>
                <input
                  className="modalInput"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="modalSection">
                <label className="modalLabel">Комментарий врача</label>
                <textarea
                  className="modalInput textareaInput"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>

            <div className="modalButtons">
              <button
                className="actionButton"
                onClick={() => setOpenRecordModal(false)}
              >
                Отмена
              </button>
              <button className="actionButton primaryBtn" onClick={saveRecord}>
                Сохранить запись
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}