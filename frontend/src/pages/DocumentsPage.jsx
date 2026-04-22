import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
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

function formatDateRu(iso) {
  if (!iso) return "—";

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, day] = iso.split("-");
      return `${day}.${m}.${y}`;
    }
    return iso;
  }

  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export default function DocumentsPage() {
  const todayISO = useMemo(() => {
    const now = new Date();
    const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return toISODate(local);
  }, []);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [passedDate, setPassedDate] = useState(todayISO);
  const [validUntil, setValidUntil] = useState(addYearsISO(todayISO, 1));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const userIin = userData?.iin || "";

  useEffect(() => {
    loadCertificates();
  }, []);

  useEffect(() => {
    if (!passedDate) return;
    if (validUntil && validUntil < passedDate) {
      setValidUntil(addYearsISO(passedDate, 1));
    }
  }, [passedDate]); // eslint-disable-line

  async function loadCertificates() {
    try {
      setLoading(true);
      setError("");

      if (!userIin) {
        setItems([]);
        return;
      }

      const { data, error: dbError } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_iin", userIin)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;

      setItems(data || []);
    } catch (e) {
      console.error("Ошибка загрузки справок:", e);
      setError(e.message || "Не удалось загрузить справки.");
    } finally {
      setLoading(false);
    }
  }

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
    if (!userIin) return "Не найден ИИН пользователя.";
    if (!file) return "Выберите файл.";
    if (!passedDate) return "Выберите дату прохождения.";
    if (!validUntil) return "Выберите срок действия.";
    if (validUntil < passedDate) {
      return "Срок действия не может быть раньше даты прохождения.";
    }
    return "";
  };

  const addCertificate = async () => {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    try {
      setSaving(true);
      setError("");

      const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
      const safeExt = ext
        ? ext.toLowerCase().replace(/[^a-z0-9]/g, "")
        : "bin";

      // ВАЖНО: путь делаем только технический, без кириллицы
      const filePath = `${userIin}/${Date.now()}.${safeExt}`;

      // 1. загружаем файл в Storage
      const { error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) throw uploadError;

      // 2. сохраняем запись в таблицу
      const { data, error: insertError } = await supabase
        .from("certificates")
        .insert([
          {
            user_iin: userIin,
            title: title.trim() || file.name,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type || safeExt || "",
            file_size: file.size,
            passed_date: passedDate,
            valid_until: validUntil,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      setItems((prev) => [data, ...prev]);
      setOpen(false);
    } catch (e) {
      console.error("Ошибка добавления справки:", e);
      setError(e.message || "Не удалось сохранить справку.");
    } finally {
      setSaving(false);
    }
  };

  const removeCertificate = async (id, filePath) => {
    try {
      setError("");

      const { error: dbError } = await supabase
        .from("certificates")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from("certificates")
          .remove([filePath]);

        if (storageError) {
          console.warn("Файл из Storage не удалился:", storageError);
        }
      }

      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.error("Ошибка удаления справки:", e);
      setError(e.message || "Не удалось удалить справку.");
    }
  };

  const setYears = (years) => {
    const base = passedDate || todayISO;
    setValidUntil(addYearsISO(base, years));
  };

  const openFile = async (filePath) => {
    try {
      setError("");

      const { data, error: signedError } = await supabase.storage
        .from("certificates")
        .createSignedUrl(filePath, 60);

      if (signedError) throw signedError;

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (e) {
      console.error("Ошибка открытия файла:", e);
      setError(e.message || "Не удалось открыть файл.");
    }
  };

  return (
    <div className="documentsPage">
      <div className="documentsHeader">
        <h2>Справки</h2>
        <button className="addButton" type="button" onClick={openModal}>
          Добавить
        </button>
      </div>

      {loading ? (
        <div className="documentsEmpty">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="documentsEmpty">Справок пока нет.</div>
      ) : (
        <div className="documentsList">
          {items.map((it) => (
            <div key={it.id} className="documentItem">
              <div className="documentTitle">{it.title}</div>

              <div className="documentMeta">
                <span>Прохождение: {formatDateRu(it.passed_date)}</span>
                <span>Действует до: {formatDateRu(it.valid_until)}</span>
                <span>{it.file_name}</span>
              </div>

              <div className="documentActions">
                <button
                  className="actionButton"
                  type="button"
                  onClick={() => openFile(it.file_path)}
                >
                  Открыть
                </button>

                <button
                  className="actionButton deleteButton"
                  type="button"
                  onClick={() => removeCertificate(it.id, it.file_path)}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div
          className="modalOverlay"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
        >
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalTitle">Добавить справку</div>

            <div className="modalContent">
              <div className="modalSection">
                <label className="modalLabel">Файл</label>
                <input className="modalInput" type="file" onChange={onPickFile} />
                <div className="fileHint">
                  {file ? `Файл: ${file.name}` : "Файл не выбран"}
                </div>
              </div>

              <div className="modalSection">
                <label className="modalLabel">Название</label>
                <input
                  className="modalInput"
                  type="text"
                  placeholder="Название (необязательно)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="modalSection">
                <label className="modalLabel" htmlFor="passedDate">
                  Дата прохождения
                </label>
                <input
                  id="passedDate"
                  className="modalInput"
                  type="date"
                  value={passedDate}
                  min={todayISO}
                  onChange={(e) => setPassedDate(e.target.value)}
                />
              </div>

              <div className="modalSection">
                <label className="modalLabel" htmlFor="validUntil">
                  Действует до
                </label>
                <input
                  id="validUntil"
                  className="modalInput"
                  type="date"
                  value={validUntil}
                  min={passedDate || todayISO}
                  onChange={(e) => setValidUntil(e.target.value)}
                />

                <div className="quickButtons">
                  <button
                    type="button"
                    className="actionButton"
                    onClick={() => setYears(1)}
                  >
                    +1 год
                  </button>
                  <button
                    type="button"
                    className="actionButton"
                    onClick={() => setYears(2)}
                  >
                    +2 года
                  </button>
                  <button
                    type="button"
                    className="actionButton"
                    onClick={() => setYears(3)}
                  >
                    +3 года
                  </button>
                </div>
              </div>

              {error && <div className="errorText">{error}</div>}
            </div>

            <div className="modalButtons">
              <button className="actionButton" type="button" onClick={closeModal}>
                Отмена
              </button>
              <button
                className="actionButton primaryBtn"
                type="button"
                onClick={addCertificate}
                disabled={saving}
              >
                {saving ? "Сохраняем..." : "Добавить справку"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}