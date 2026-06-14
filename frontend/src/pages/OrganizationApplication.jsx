import { useMemo, useState } from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";

const API_URL =
  import.meta.env.VITE_API_URL || "https://health-card.onrender.com";

const APPLICATION_TYPES = {
  NEW_ORGANIZATION: "new_organization",
  CHANGE_CHIEF_DOCTOR: "change_chief_doctor",
  CHANGE_ADMINISTRATOR: "change_administrator",
};

const ORGANIZATION_TYPES = [
  { value: "state_polyclinic", label: "Государственная поликлиника" },
  { value: "state_hospital", label: "Государственная больница" },
  { value: "private_clinic", label: "Частная клиника" },
  { value: "dentistry", label: "Стоматология" },
  { value: "laboratory", label: "Медицинская лаборатория" },
];

const MAX_ADMINS = 3;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function FileField({ label, name, required, multiple, files, onChange }) {
  const selectedFiles = files?.[name];

  const fileNames = useMemo(() => {
    if (!selectedFiles) return [];
    if (selectedFiles instanceof FileList) {
      return Array.from(selectedFiles).map((file) => file.name);
    }
    if (selectedFiles instanceof File) return [selectedFiles.name];
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
    organization_email: "",

    chief_doctor_full_name: "",
    chief_doctor_phone: "",
    chief_doctor_email: "",

    previous_chief_doctor_full_name: "",
    new_chief_doctor_full_name: "",
    new_chief_doctor_phone: "",
    new_chief_doctor_email: "",

    comment: "",
  });

  const [admins, setAdmins] = useState([
    {
      full_name: "",
      phone: "",
      email: "",
    },
  ]);

  const [files, setFiles] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState(null);
  const [error, setError] = useState("");

  const isNewOrganization =
    applicationType === APPLICATION_TYPES.NEW_ORGANIZATION;

  const isChiefDoctorChange =
    applicationType === APPLICATION_TYPES.CHANGE_CHIEF_DOCTOR;

  const isAdministratorChange =
    applicationType === APPLICATION_TYPES.CHANGE_ADMINISTRATOR;

  function updateField(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function updateAdmin(index, field, value) {
    setAdmins((prev) =>
      prev.map((admin, adminIndex) =>
        adminIndex === index ? { ...admin, [field]: value } : admin
      )
    );
  }

  function addAdmin() {
    if (admins.length >= MAX_ADMINS) {
      setError("Можно добавить максимум 3 администратора.");
      return;
    }

    setAdmins((prev) => [...prev, { full_name: "", phone: "", email: "" }]);
  }

  function removeAdmin(index) {
    setAdmins((prev) => prev.filter((_, adminIndex) => adminIndex !== index));
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
      organization_email: "",

      chief_doctor_full_name: "",
      chief_doctor_phone: "",
      chief_doctor_email: "",

      previous_chief_doctor_full_name: "",
      new_chief_doctor_full_name: "",
      new_chief_doctor_phone: "",
      new_chief_doctor_email: "",

      comment: "",
    });

    setAdmins([{ full_name: "", phone: "", email: "" }]);
    setFiles({});
    setSubmittedApplication(null);
    setError("");
  }

  function validateEmails() {
    const organizationEmail = normalizeEmail(form.organization_email);

    const chiefEmail = normalizeEmail(
      isNewOrganization ? form.chief_doctor_email : form.new_chief_doctor_email
    );

    const adminEmails = admins.map((admin) => normalizeEmail(admin.email));

    if (!organizationEmail) {
      return "Укажите корпоративную почту организации.";
    }

    if ((isNewOrganization || isChiefDoctorChange) && !chiefEmail) {
      return "Укажите почту главного врача.";
    }

    if ((isNewOrganization || isAdministratorChange) && adminEmails.some((email) => !email)) {
      return "У каждого администратора должна быть своя почта.";
    }

    const allEmails = [
      organizationEmail,
      ...(chiefEmail ? [chiefEmail] : []),
      ...adminEmails.filter(Boolean),
    ];

    const uniqueEmails = new Set(allEmails);

    if (uniqueEmails.size !== allEmails.length) {
      return "Почты не должны повторяться: корпоративная почта, почта главного врача и почты администраторов должны быть разными.";
    }

    return "";
  }

  async function submitApplication(event) {
    event.preventDefault();
    setError("");

    const emailError = validateEmails();

    if (emailError) {
      setError(emailError);
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      formData.append("application_type", applicationType);
      formData.append("administrators", JSON.stringify(admins));

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value || "");
      });

      Object.entries(files).forEach(([key, value]) => {
        if (!value) return;

        if (value instanceof FileList) {
          Array.from(value).forEach((file) => formData.append(key, file));
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
        <div className="org-language-top">
          <LanguageSwitcher />
        </div>

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
            Заявка отправлена в техническую поддержку Clinic OS. Ответ по заявке
            придёт на корпоративную почту организации.
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
      <div className="org-language-top">
        <LanguageSwitcher />
      </div>

      <section className="application-hero">
        <div className="page-badge">Заявка организации</div>
        <h1>Подать заявку на подключение</h1>
        <p>
          Заполните данные организации, главного врача и основных
          администраторов. Администраторов можно указать максимум 3.
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
                Изменение главного врача
              </option>
              <option value={APPLICATION_TYPES.CHANGE_ADMINISTRATOR}>
                Изменение администратора
              </option>
            </select>
          </div>
        </section>

        <section className="form-section">
          <div className="section-number">2</div>

          <div className="section-content">
            <h2>Данные организации</h2>
            <p>Основная информация о медицинской организации.</p>

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
                  placeholder="Например: Городская поликлиника №3"
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
                  placeholder="Например: Кабанбай батыра 46"
                />
              </div>
            </div>

            <div className="form-grid one-column">
              <div>
                <label className="org-label">
                  Корпоративная почта организации
                  <span className="required-star">*</span>
                </label>
                <input
                  className="org-input"
                  type="email"
                  name="organization_email"
                  value={form.organization_email}
                  onChange={updateField}
                  required
                  placeholder="Например: info@clinic.kz"
                />
              </div>
            </div>
          </div>
        </section>

        {(isNewOrganization || isChiefDoctorChange) && (
          <section className="form-section">
            <div className="section-number">3</div>

            <div className="section-content">
              <h2>
                {isNewOrganization
                  ? "Данные главного врача"
                  : "Изменение главного врача"}
              </h2>

              {isChiefDoctorChange && (
                <div className="form-grid one-column">
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
                      required
                      placeholder="Например: Иванов Иван Иванович"
                    />
                  </div>
                </div>
              )}

              <div className="form-grid three-columns">
                <div>
                  <label className="org-label">
                    ФИО главного врача<span className="required-star">*</span>
                  </label>
                  <input
                    className="org-input"
                    name={
                      isNewOrganization
                        ? "chief_doctor_full_name"
                        : "new_chief_doctor_full_name"
                    }
                    value={
                      isNewOrganization
                        ? form.chief_doctor_full_name
                        : form.new_chief_doctor_full_name
                    }
                    onChange={updateField}
                    required
                    placeholder="Например: Иванов Иван Иванович"
                  />
                </div>

                <div>
                  <label className="org-label">
                    Телефон<span className="required-star">*</span>
                  </label>
                  <input
                    className="org-input"
                    name={
                      isNewOrganization
                        ? "chief_doctor_phone"
                        : "new_chief_doctor_phone"
                    }
                    value={
                      isNewOrganization
                        ? form.chief_doctor_phone
                        : form.new_chief_doctor_phone
                    }
                    onChange={updateField}
                    required
                    placeholder="+7 777 000 00 00"
                  />
                </div>

                <div>
                  <label className="org-label">
                    Почта главного врача<span className="required-star">*</span>
                  </label>
                  <input
                    className="org-input"
                    type="email"
                    name={
                      isNewOrganization
                        ? "chief_doctor_email"
                        : "new_chief_doctor_email"
                    }
                    value={
                      isNewOrganization
                        ? form.chief_doctor_email
                        : form.new_chief_doctor_email
                    }
                    onChange={updateField}
                    required
                    placeholder="doctor@clinic.kz"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {(isNewOrganization || isAdministratorChange) && (
          <section className="form-section">
            <div className="section-number">4</div>

            <div className="section-content">
              <h2>Данные администраторов</h2>
              <p>
                Укажите основных администраторов организации. Максимум можно
                добавить 3 администратора.
              </p>

              {admins.map((admin, index) => (
                <div className="admin-box" key={index}>
                  <div className="admin-box-top">
                    <h3>Администратор #{index + 1}</h3>

                    {admins.length > 1 && (
                      <button
                        type="button"
                        className="small-danger-button"
                        onClick={() => removeAdmin(index)}
                      >
                        Удалить
                      </button>
                    )}
                  </div>

                  <div className="form-grid three-columns">
                    <div>
                      <label className="org-label">
                        ФИО администратора
                        <span className="required-star">*</span>
                      </label>
                      <input
                        className="org-input"
                        value={admin.full_name}
                        onChange={(event) =>
                          updateAdmin(index, "full_name", event.target.value)
                        }
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
                        value={admin.phone}
                        onChange={(event) =>
                          updateAdmin(index, "phone", event.target.value)
                        }
                        required
                        placeholder="+7 777 000 00 00"
                      />
                    </div>

                    <div>
                      <label className="org-label">
                        Почта администратора
                        <span className="required-star">*</span>
                      </label>
                      <input
                        className="org-input"
                        type="email"
                        value={admin.email}
                        onChange={(event) =>
                          updateAdmin(index, "email", event.target.value)
                        }
                        required
                        placeholder="admin@clinic.kz"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="secondary-button"
                onClick={addAdmin}
                disabled={admins.length >= MAX_ADMINS}
              >
                + Добавить администратора
              </button>

              {admins.length >= MAX_ADMINS && (
                <p className="limit-text">
                  Достигнут лимит: максимум 3 администратора.
                </p>
              )}
            </div>
          </section>
        )}

        <section className="form-section">
          <div className="section-number">5</div>

          <div className="section-content">
            <h2>Документы</h2>

            <FileField
              label="Лицензия на медицинскую деятельность"
              name="medical_license"
              required={isNewOrganization}
              files={files}
              onChange={updateFile}
            />

            <FileField
              label="Документ о регистрации организации"
              name="registration_document"
              required={isNewOrganization}
              files={files}
              onChange={updateFile}
            />

            <FileField
              label="Документ о назначении главного врача"
              name="chief_doctor_order"
              required={isNewOrganization || isChiefDoctorChange}
              files={files}
              onChange={updateFile}
            />

            <FileField
              label="Документ о назначении администратора"
              name="administrator_order"
              required={isNewOrganization || isAdministratorChange}
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
          </div>
        </section>

        <section className="form-section">
          <div className="section-number">6</div>

          <div className="section-content">
            <h2>Комментарий</h2>

            <textarea
              className="org-textarea"
              name="comment"
              value={form.comment}
              onChange={updateField}
              placeholder="Например: просим подключить организацию к системе Clinic OS"
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

      .org-language-top,
      .application-hero,
      .application-form {
        width: min(1120px, 100%);
        margin-left: auto;
        margin-right: auto;
      }

      .org-language-top {
        margin-bottom: 18px;
        display: flex;
        justify-content: flex-end;
      }

      .application-hero {
        margin-bottom: 28px;
      }

      .page-badge {
        display: inline-flex;
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
      }

      .application-hero p,
      .section-content p {
        color: #9fb2c8;
        line-height: 1.7;
      }

      .application-form {
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
      }

      .section-number {
        width: 42px;
        height: 42px;
        border-radius: 14px;
        background: #00c853;
        display: grid;
        place-items: center;
        font-size: 18px;
        font-weight: 900;
      }

      .section-content h2 {
        margin: 0 0 8px;
        font-size: 25px;
        font-weight: 900;
      }

      .form-grid {
        display: grid;
        gap: 18px;
        margin-bottom: 18px;
      }

      .one-column {
        grid-template-columns: 1fr;
      }

      .two-columns {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .three-columns {
        grid-template-columns: repeat(3, minmax(0, 1fr));
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
        box-sizing: border-box;
      }

      .org-textarea {
        min-height: 116px;
        resize: vertical;
      }

      .admin-box {
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 20px;
        padding: 18px;
        margin-bottom: 16px;
        background: rgba(2, 6, 23, 0.22);
      }

      .admin-box-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
      }

      .admin-box-top h3 {
        margin: 0;
      }

      .secondary-button,
      .small-danger-button,
      .primary-button {
        border: 0;
        border-radius: 16px;
        color: white;
        font-weight: 900;
        cursor: pointer;
      }

      .secondary-button {
        background: rgba(34, 211, 238, 0.18);
        border: 1px solid rgba(34, 211, 238, 0.3);
        padding: 13px 18px;
      }

      .secondary-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .small-danger-button {
        background: #dc2626;
        padding: 10px 14px;
      }

      .limit-text {
        margin: 12px 0 0;
        color: #facc15;
        font-weight: 800;
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
        display: inline-flex;
        min-height: 44px;
        align-items: center;
        justify-content: center;
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
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 22px;
      }

      .primary-button {
        background: #00c853;
        font-size: 16px;
        padding: 16px 30px;
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

      @media (max-width: 1000px) {
        .three-columns {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 760px) {
        .organization-application-page {
          padding: 26px 14px 70px;
        }

        .form-section {
          grid-template-columns: 1fr;
          padding: 20px;
        }

        .two-columns {
          grid-template-columns: 1fr;
        }

        .org-file-control {
          flex-direction: column;
          align-items: stretch;
        }

        .org-file-button,
        .primary-button {
          width: 100%;
        }
      }
    `}</style>
  );
}