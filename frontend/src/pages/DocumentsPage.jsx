import React, { useEffect, useMemo, useState } from "react";
import "../styles/documents.css";

// ===== helpers =====
function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addYearsISO(iso, years) {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + years);
  return toISODate(d);
}

export default function DocumentsPage() {
  // ===== today (локальная дата без времени) =====
  const todayISO = useMemo(() => {
    const now = new Date();
    const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return toISODate(local);
  }, []);

  // ===== список справок =====
  const [items, setItems] = useState([]);

  // ===== модалка =====
  const [open, setOpen] = useState(false);

  // ===== форма добавления =====
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [passedDate, setPassedDate] = useState(todayISO);
  const [validUntil, setValidUntil] = useState(addYearsISO(todayISO, 1));
  const [error, setError] = useState("");

  // если дата прохождения меняется, "до какого" не должен быть раньше
  useEffect(() => {
    if (!passedDate) return;
    if (validUntil && validUntil < passedDate) {
      setValidUntil(addYearsISO(passedDate, 1));
    }
  }, [passedDate]); // eslint-disable-line

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setPassedDate(todayISO);
    setValidUntil(addYearsISO(todayISO, 1));
    setError("");
  };

  const openModal = () => {
    resetForm();
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setError("");
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const validate = () => {
    if (!file) return "Выберите файл.";
    if (!passedDate) return "Выберите дату прохождения.";
    if (passedDate < todayISO) return "Нельзя выбрать прошедшую дату прохождения.";
    if (!validUntil) return "Выберите срок действия (до какого).";
    if (validUntil < passedDate) return "Срок действия не может быть раньше даты прохождения.";
    return "";
  };

  const addCertificate = () => {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    // локальная ссылка на файл для скачивания
    const url = URL.createObjectURL(file);

    const newItem = {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title: title.trim() || file.name,
      originalName: file.name,
      mime: file.type || "",
      size: file.size,
      passedDate,
      validUntil,
      url,
      createdAt: new Date().toISOString(),
    };

    setItems((prev) => [newItem, ...prev]);
    setOpen(false);
  };

  const removeCertificate = (id) => {
    setItems((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((x) => x.id !== id);
    });
  };

  // очистка objectURL при размонтировании
  useEffect(() => {
    return () => {
      for (const it of items) {
        if (it?.url) URL.revokeObjectURL(it.url);
      }
    };
  }, [items]);

  // быстрые кнопки срока
  const setYears = (years) => {
    const base = passedDate || todayISO;
    setValidUntil(addYearsISO(base, years));
  };

  return (
    <div className="documentsPage">
      <div className="documentsHeader">
        <h2>Справки</h2>
        <button className="addButton" type="button" onClick={openModal}>
          Добавить
        </button>
      </div>

      {items.length === 0 ? (
        <div className="documentsEmpty">Справок пока нет.</div>
      ) : (
        <div className="documentsList">
          {items.map((it) => (
            <div key={it.id} className="documentItem">
              <div className="documentTitle">{it.title}</div>

              <div className="documentMeta">
                Прохождение: {it.passedDate} • Действует до: {it.validUntil}
              </div>

              <div className="documentActions">
                <a className="actionButton" href={it.url} download={it.originalName}>
                  Скачать
                </a>

                <button
                  className="actionButton deleteButton"
                  type="button"
                  onClick={() => removeCertificate(it.id)}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="modalOverlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalTitle">Добавить справку</div>

            <div className="modalSection">
              <input type="file" onChange={onPickFile} />
              {file ? <div>Файл: {file.name}</div> : <div>Файл не выбран</div>}
            </div>

            <div className="modalSection">
              <input
                className="modalInput"
                type="text"
                placeholder="Название (необязательно)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="modalSection">
              <label>
                Дата прохождения:
                <input
                  className="modalInput"
                  type="date"
                  value={passedDate}
                  min={todayISO}
                  onChange={(e) => setPassedDate(e.target.value)}
                />
              </label>
            </div>

            <div className="modalSection">
              <label>
                Действует до:
                <input
                  className="modalInput"
                  type="date"
                  value={validUntil}
                  min={passedDate || todayISO}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </label>

              <div style={{ marginTop: 8 }}>
                <button type="button" className="actionButton" onClick={() => setYears(1)}>
                  +1 год
                </button>{" "}
                <button type="button" className="actionButton" onClick={() => setYears(2)}>
                  +2 года
                </button>{" "}
                <button type="button" className="actionButton" onClick={() => setYears(3)}>
                  +3 года
                </button>
              </div>
            </div>

            {error && <div className="errorText">{error}</div>}

            <div className="modalButtons">
              <button className="actionButton" type="button" onClick={closeModal}>
                Отмена
              </button>
              <button className="actionButton" type="button" onClick={addCertificate}>
                Добавить справку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}