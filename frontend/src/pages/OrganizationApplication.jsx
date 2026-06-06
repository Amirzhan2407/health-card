import { useMemo, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "https://health-card.onrender.com";

const APPLICATION_TYPES = {
  NEW_ORGANIZATION: "new_organization",
  CHANGE_CHIEF_DOCTOR: "change_chief_doctor",
};

const ORGANIZATION_TYPES = [
  {
    value: "state_polyclinic",
    label: "Государственная поликлиника",
  },
  {
    value: "state_hospital",
    label: "Государственная больница",
  },
  {
    value: "private_clinic",
    label: "Частная клиника",
  },
];

function FileField({ label, name, required, multiple, files, onChange }) {
  const selectedFiles = files?.[name];

  const fileNames = useMemo(() => {
    if (!selectedFiles) return [];

    if (selectedFiles instanceof FileList) {
      return Array.from(selectedFiles).map((file) => file.name);
    }

    if (selectedFiles instanceof File) {
      return [selectedFiles.name];
    }

    return [];
  }, [selectedFiles]);

  return (
    <div className="org-file-box">
      <label className="org-label">
        {label}
        {required ? <span className="required-star">*</span> : null}
      </label>

      <div className="org-file-control">
        <label className="org-file-button">
          {multiple ? "Выбрать файлы" : "Выберите файл"}
          <input
            type="file"
            name={name}
            multiple={multiple}
            required={required}
            onChange={onChange}
          />
        </label>

        <div className="org-file-name">
          {fileNames.length > 0
            ? fileNames.join(", ")
            : multiple
              ? "Файлы не выбраны"
              : "Файл не выбран"}
        </div>
      </div>
    </div>
  );
}

export default function OrganizationApplication() {
  const [applicationType, setApplicationType] = useState(
    APPLICATION_TYPES.NEW_ORGANIZATION
  );

  const [form, setForm] = useState({
    organization_name: "",
    organization_type: "state_polyclinic",
    bin: "",
    city: "",
    address: "",

    chief_doctor_full_name: "",

    previous_chief_doctor_full_name: "",
    new_chief_doctor_full_name: "",
    new_chief_doctor_phone: "",
    new_chief_doctor_email: "",

    sender_full_name: "",
    sender_phone: "",
    sender_email: "",

    comment: "",
  });

  const [files, setFiles] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState(null);
  const [error, setError] = useState("");

  const isNewOrganization =
    applicationType === APPLICATION_TYPES.NEW_ORGANIZATION;

  const isChiefDoctorChange =
    applicationType === APPLICATION_TYPES.CHANGE_CHIEF_DOCTOR;

  function updateField(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function updateFile(event) {
    const { name, files: inputFiles, multiple } = event.target;

    setFiles((prev) => ({
      ...prev,
      [name]: multiple ? inputFiles : inputFiles?.[0] || null,
    }));
  }

  function resetForm() {
    setApplicationType(APPLICATION_TYPES.NEW_ORGANIZATION);
    setForm({
      organization_name: "",
      organization_type: "state_polyclinic",
      bin: "",
      city: "",
      address: "",

      chief_doctor_full_name: "",

      previous_chief_doctor_full_name: "",
      new_chief_doctor_full_name: "",
      new_chief_doctor_phone: "",
      new_chief_doctor_email: "",

      sender_full_name: "",
      sender_phone: "",
      sender_email: "",

      comment: "",
    });
    setFiles({});
    setSubmittedApplication(null);
    setError("");
  }

  async function submitApplication(event) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData();

      formData.append("application_type", applicationType);

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value || "");
      });

      Object.entries(files).forEach(([key, value]) => {
        if (!value) return;

        if (value instanceof FileList) {
          Array.from(value).forEach((file) => {
            formData.append(key, file);
          });
        } else {
          formData.append(key, value);
        }
      });

      const response = await fetch(`${API_URL}/api/organization-applications`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            "Не удалось отправить заявку. Попробуйте ещё раз."
        );
      }

      setSubmittedApplication(result?.application || result?.data || result);
    } catch (err) {
      setError(err.message || "Произошла ошибка при отправке заявки.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedApplication) {
    return (
      <main className="organization-application-page">
        <section className="success-card">
          <div className="success-icon">✓</div>

          <h1>Заявка отправлена</h1>

          <div className="application-number">
            Номер заявки:{" "}
            <strong>
              {submittedApplication.application_number ||
                submittedApplication.applicationNumber ||
                "создан"}
            </strong>
          </div>

          <p>
            Ваша заявка принята в обработку. После проверки данных
            администратор изменит статус заявки. Ответ придёт на указанную
            электронную почту.
          </p>

          <button type="button" className="primary-button" onClick={resetForm}>
            Отправить ещё одну заявку
          </button>
        </section>

        <ApplicationPageStyles />
      </main>
    );
  }

  return (
    <main className="organization-application-page">
      <section className="application-hero">
        <div className="page-badge">Заявка организации</div>

        <h1>Подать заявку на подключение</h1>

        <p>
          Заполните данные медицинской организации и прикрепите документы. После
          отправки заявка попадёт в админ-панель, где её проверит ответственный
          сотрудник.
        </p>
      </section>

      <form className="application-form" onSubmit={submitApplication}>
        <section className="form-section">
          <div className="section-number">1</div>

          <div className="section-content">
            <h2>Тип заявки</h2>
            <p>Выберите, для чего организация отправляет заявление.</p>

            <label className="org-label">Тип заявки</label>

            <select
              className="org-input"
              value={applicationType}
              onChange={(event) => setApplicationType(event.target.value)}
            >
              <option value={APPLICATION_TYPES.NEW_ORGANIZATION}>
                Подключение новой организации
              </option>
              <option value={APPLICATION_TYPES.CHANGE_CHIEF_DOCTOR}>
                Изменение главного врача организации
              </option>
            </select>
          </div>
        </section>

        <section className="form-section">
          <div className="section-number">2</div>

          <div className="section-content">
            <h2>Данные организации</h2>
            <p>
              Эти данные будут использоваться администраторами для проверки
              организации.
            </p>

            <div className="form-grid one-column">
              <div>
                <label className="org-label">
                  Название организации<span className="required-star">*</span>
                </label>
                <input
                  className="org-input"
                  name="organization_name"
                  value={form.organization_name}
                  onChange={updateField}
                  required
                  placeholder="Например: Городская поликлиника №3 акимата города Астаны"
                />
              </div>
            </div>

            <div className="form-grid two-columns">
              <div>
                <label className="org-label">
                  Тип организации<span className="required-star">*</span>
                </label>
                <select
                  className="org-input"
                  name="organization_type"
                  value={form.organization_type}
                  onChange={updateField}
                  required
                >
                  {ORGANIZATION_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="org-label">
                  БИН организации<span className="required-star">*</span>
                </label>
                <input
                  className="org-input"
                  name="bin"
                  value={form.bin}
                  onChange={updateField}
                  required
                  maxLength={12}
                  placeholder="12 цифр"
                />
              </div>
            </div>

            <div className="form-grid two-columns">
              <div>
                <label className="org-label">
                  Город<span className="required-star">*</span>
                </label>
                <input
                  className="org-input"
                  name="city"
                  value={form.city}
                  onChange={updateField}
                  required
                  placeholder="Например: Астана"
                />
              </div>

              <div>
                <label className="org-label">
                  Адрес организации<span className="required-star">*</span>
                </label>
                <input
                  className="org-input"
                  name="address"
                  value={form.address}
                  onChange={updateField}
                  required
                  placeholder="Например: проспект Кабанбай батыра 46"
                />
              </div>
            </div>
          </div>
        </section>

        {isNewOrganization && (
          <section className="form-section">
            <div className="section-number">3</div>

            <div className="section-content">
              <h2>Данные главного врача</h2>
              <p>
                После одобрения заявки организация будет создана со статусом
                ожидания подтверждения ЭЦП главного врача.
              </p>

              <div className="form-grid one-column">
                <div>
                  <label className="org-label">
                    ФИО главного врача
                    <span className="required-star">*</span>
                  </label>
                  <input
                    className="org-input"
                    name="chief_doctor_full_name"
                    value={form.chief_doctor_full_name}
                    onChange={updateField}
                    required={isNewOrganization}
                    placeholder="Например: Иванов Иван Иванович"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {isChiefDoctorChange && (
          <section className="form-section">
            <div className="section-number">3</div>

            <div className="section-content">
              <h2>Изменение главного врача</h2>
              <p>
                Укажите предыдущего и нового главного врача. После одобрения
                администратор обновит данные организации.
              </p>

              <div className="form-grid two-columns">
                <div>
                  <label className="org-label">
                    ФИО предыдущего главного врача
                    <span className="required-star">*</span>
                  </label>
                  <input
                    className="org-input"
                    name="previous_chief_doctor_full_name"
                    value={form.previous_chief_doctor_full_name}
                    onChange={updateField}
                    required={isChiefDoctorChange}
                    placeholder="Например: Иванов Иван Иванович"
                  />
                </div>

                <div>
                  <label className="org-label">
                    ФИО нового главного врача
                    <span className="required-star">*</span>
                  </label>
                  <input
                    className="org-input"
                    name="new_chief_doctor_full_name"
                    value={form.new_chief_doctor_full_name}
                    onChange={updateField}
                    required={isChiefDoctorChange}
                    placeholder="Например: Петров Пётр Петрович"
                  />
                </div>
              </div>

              <div className="form-grid two-columns">
                <div>
                  <label className="org-label">
                    Телефон нового главного врача
                  </label>
                  <input
                    className="org-input"
                    name="new_chief_doctor_phone"
                    value={form.new_chief_doctor_phone}
                    onChange={updateField}
                    placeholder="+7 777 000 00 00"
                  />
                </div>

                <div>
                  <label className="org-label">
                    Email нового главного врача
                  </label>
                  <input
                    className="org-input"
                    type="email"
                    name="new_chief_doctor_email"
                    value={form.new_chief_doctor_email}
                    onChange={updateField}
                    placeholder="doctor@example.com"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="form-section">
          <div className="section-number">{isNewOrganization ? "4" : "4"}</div>

          <div className="section-content">
            <h2>Данные отправителя</h2>
            <p>На эту почту организация получит ответ по заявке.</p>

            <div className="form-grid two-columns">
              <div>
                <label className="org-label">
                  ФИО отправителя<span className="required-star">*</span>
                </label>
                <input
                  className="org-input"
                  name="sender_full_name"
                  value={form.sender_full_name}
                  onChange={updateField}
                  required
                  placeholder="Например: Сидоров Сергей Сергеевич"
                />
              </div>

              <div>
                <label className="org-label">
                  Телефон<span className="required-star">*</span>
                </label>
                <input
                  className="org-input"
                  name="sender_phone"
                  value={form.sender_phone}
                  onChange={updateField}
                  required
                  placeholder="+7 777 000 00 00"
                />
              </div>
            </div>

            <div className="form-grid one-column">
              <div>
                <label className="org-label">
                  Email для ответа<span className="required-star">*</span>
                </label>
                <input
                  className="org-input"
                  type="email"
                  name="sender_email"
                  value={form.sender_email}
                  onChange={updateField}
                  required
                  placeholder="organization@example.com"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="section-number">5</div>

          <div className="section-content">
            <h2>Документы</h2>

            {isNewOrganization ? (
              <p>
                Прикрепите документы для подключения новой медицинской
                организации.
              </p>
            ) : (
              <p>
                Прикрепите документы, подтверждающие изменение главного врача.
              </p>
            )}

            {isNewOrganization && (
              <>
                <FileField
                  label="Лицензия на медицинскую деятельность"
                  name="medical_license"
                  required
                  files={files}
                  onChange={updateFile}
                />

                <FileField
                  label="Документ о регистрации организации"
                  name="registration_document"
                  required
                  files={files}
                  onChange={updateFile}
                />

                <FileField
                  label="Документ о назначении главного врача"
                  name="chief_doctor_order"
                  required
                  files={files}
                  onChange={updateFile}
                />

                <FileField
                  label="Дополнительные документы"
                  name="additional_documents"
                  multiple
                  files={files}
                  onChange={updateFile}
                />
              </>
            )}

            {isChiefDoctorChange && (
              <>
                <FileField
                  label="Приказ об освобождении предыдущего главного врача"
                  name="previous_chief_doctor_order"
                  required
                  files={files}
                  onChange={updateFile}
                />

                <FileField
                  label="Приказ о назначении нового главного врача"
                  name="new_chief_doctor_order"
                  required
                  files={files}
                  onChange={updateFile}
                />

                <FileField
                  label="Документ, подтверждающий личность нового главного врача"
                  name="new_chief_doctor_identity"
                  required
                  files={files}
                  onChange={updateFile}
                />

                <FileField
                  label="Дополнительные документы"
                  name="additional_documents"
                  multiple
                  files={files}
                  onChange={updateFile}
                />
              </>
            )}
          </div>
        </section>

        <section className="form-section">
          <div className="section-number">6</div>

          <div className="section-content">
            <h2>Комментарий</h2>
            <p>Здесь можно указать дополнительную информацию для администратора.</p>

            <textarea
              className="org-textarea"
              name="comment"
              value={form.comment}
              onChange={updateField}
              placeholder={
                isNewOrganization
                  ? "Например: просим подключить организацию к системе clinisOS"
                  : "Например: просим заменить главного врача в данных организации"
              }
            />

            {error ? <div className="error-message">{error}</div> : null}

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Отправка..." : "Отправить заявку"}
              </button>
            </div>
          </div>
        </section>
      </form>

      <ApplicationPageStyles />
    </main>
  );
}

function ApplicationPageStyles() {
  return (
    <style>{`
      .organization-application-page {
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(0, 255, 170, 0.14), transparent 28%),
          radial-gradient(circle at bottom right, rgba(0, 210, 255, 0.13), transparent 25%),
          #07111f;
        color: #ffffff;
        padding: 42px 24px 90px;
      }

      .application-hero {
        width: min(1120px, 100%);
        margin: 0 auto 28px;
      }

      .page-badge {
        display: inline-flex;
        align-items: center;
        padding: 9px 16px;
        border-radius: 999px;
        background: rgba(0, 255, 170, 0.1);
        border: 1px solid rgba(0, 255, 170, 0.24);
        color: #5eead4;
        font-size: 13px;
        font-weight: 800;
        margin-bottom: 22px;
      }

      .application-hero h1 {
        font-size: clamp(34px, 5vw, 56px);
        line-height: 1.05;
        margin: 0 0 18px;
        font-weight: 900;
        letter-spacing: -1.2px;
      }

      .application-hero p {
        max-width: 720px;
        color: #9fb2c8;
        font-size: 16px;
        line-height: 1.7;
        margin: 0;
      }

      .application-form {
        width: min(1120px, 100%);
        margin: 0 auto;
        display: grid;
        gap: 22px;
      }

      .form-section {
        display: grid;
        grid-template-columns: 48px 1fr;
        gap: 18px;
        background: rgba(15, 23, 42, 0.82);
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 28px;
        padding: 28px;
        box-shadow: 0 24px 90px rgba(0, 0, 0, 0.18);
      }

      .section-number {
        width: 42px;
        height: 42px;
        border-radius: 14px;
        background: #00c853;
        color: #ffffff;
        display: grid;
        place-items: center;
        font-size: 18px;
        font-weight: 900;
      }

      .section-content h2 {
        margin: 0 0 8px;
        font-size: 25px;
        font-weight: 900;
        letter-spacing: -0.4px;
      }

      .section-content p {
        color: #9fb2c8;
        line-height: 1.6;
        margin: 0 0 22px;
      }

      .form-grid {
        display: grid;
        gap: 18px;
        margin-bottom: 18px;
      }

      .form-grid:last-child {
        margin-bottom: 0;
      }

      .one-column {
        grid-template-columns: 1fr;
      }

      .two-columns {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .org-label {
        display: block;
        font-size: 14px;
        font-weight: 800;
        color: #dbeafe;
        margin-bottom: 8px;
      }

      .required-star {
        color: #22c55e;
        margin-left: 4px;
      }

      .org-input,
      .org-textarea {
        width: 100%;
        border: 1px solid rgba(148, 163, 184, 0.28);
        background: rgba(15, 23, 42, 0.84);
        color: #ffffff;
        border-radius: 16px;
        padding: 15px 16px;
        outline: none;
        font-size: 15px;
        transition: 0.2s ease;
      }

      .org-input:focus,
      .org-textarea:focus {
        border-color: rgba(45, 212, 191, 0.8);
        box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.08);
      }

      .org-input::placeholder,
      .org-textarea::placeholder {
        color: #64748b;
      }

      .org-textarea {
        min-height: 116px;
        resize: vertical;
      }

      .org-file-box {
        margin-bottom: 16px;
      }

      .org-file-control {
        display: flex;
        align-items: center;
        gap: 14px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 16px;
        padding: 12px;
        background: rgba(15, 23, 42, 0.66);
      }

      .org-file-button {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 18px;
        border-radius: 13px;
        background: #00a84f;
        color: #ffffff;
        font-weight: 900;
        cursor: pointer;
      }

      .org-file-button input {
        display: none;
      }

      .org-file-name {
        color: #cbd5e1;
        font-size: 14px;
        word-break: break-word;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 22px;
      }

      .primary-button {
        border: 0;
        border-radius: 18px;
        background: #00c853;
        color: #ffffff;
        font-weight: 900;
        font-size: 16px;
        padding: 16px 30px;
        cursor: pointer;
        box-shadow: 0 20px 48px rgba(0, 200, 83, 0.22);
        transition: 0.2s ease;
      }

      .primary-button:hover {
        transform: translateY(-1px);
        background: #00b84c;
      }

      .primary-button:disabled {
        opacity: 0.65;
        cursor: not-allowed;
        transform: none;
      }

      .error-message {
        margin-top: 16px;
        padding: 14px 16px;
        border-radius: 16px;
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(239, 68, 68, 0.28);
        color: #fecaca;
        font-weight: 700;
      }

      .success-card {
        width: min(680px, 100%);
        margin: 80px auto 0;
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 32px;
        padding: 42px;
        text-align: center;
      }

      .success-icon {
        width: 72px;
        height: 72px;
        margin: 0 auto 22px;
        border-radius: 24px;
        background: #00c853;
        display: grid;
        place-items: center;
        font-size: 42px;
        font-weight: 900;
      }

      .success-card h1 {
        margin: 0 0 18px;
        font-size: 34px;
        font-weight: 900;
      }

      .application-number {
        display: inline-flex;
        align-items: center;
        padding: 12px 18px;
        border-radius: 16px;
        background: rgba(34, 211, 238, 0.11);
        border: 1px solid rgba(34, 211, 238, 0.2);
        color: #dffcff;
        margin-bottom: 20px;
        font-weight: 800;
      }

      .application-number strong {
        color: #22d3ee;
      }

      .success-card p {
        color: #d4e2f1;
        line-height: 1.7;
        margin: 0 auto 28px;
        max-width: 560px;
      }

      @media (max-width: 760px) {
        .organization-application-page {
          padding: 26px 14px 70px;
        }

        .application-hero h1 {
          font-size: 34px;
        }

        .form-section {
          grid-template-columns: 1fr;
          padding: 20px;
          border-radius: 22px;
        }

        .section-number {
          width: 38px;
          height: 38px;
          font-size: 16px;
        }

        .two-columns {
          grid-template-columns: 1fr;
        }

        .org-file-control {
          align-items: stretch;
          flex-direction: column;
        }

        .org-file-button {
          width: 100%;
        }

        .form-actions {
          justify-content: stretch;
        }

        .primary-button {
          width: 100%;
        }

        .success-card {
          margin-top: 38px;
          padding: 26px 18px;
          border-radius: 24px;
        }

        .success-card h1 {
          font-size: 28px;
        }
      }
    `}</style>
  );
}