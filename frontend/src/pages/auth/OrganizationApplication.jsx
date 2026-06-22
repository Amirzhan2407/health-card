
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  RiArrowLeftLine,
  RiBuilding4Line,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiSendPlane2Line,
} from "react-icons/ri";

import api from "../../api/api";

const INITIAL_FORM = {
  organizationName: "",
  bin: "",
  city: "",
  address: "",
  contactEmail: "",
  contactPhone: "",
  adminName: "",
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Не удалось отправить заявку."
  );
}

export default function OrganizationApplication() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    let nextValue = value;

    if (name === "bin") {
      nextValue = value.replace(/\D/g, "").slice(0, 12);
    }

    setForm((current) => ({
      ...current,
      [name]: nextValue,
    }));

    setErrorMessage("");
  }

  function validateForm() {
    if (
      !form.organizationName.trim() ||
      !form.bin.trim() ||
      !form.city.trim() ||
      !form.contactEmail.trim() ||
      !form.contactPhone.trim() ||
      !form.adminName.trim()
    ) {
      return "Заполните все обязательные поля.";
    }

    if (!/^\d{12}$/.test(form.bin)) {
      return "БИН должен содержать ровно 12 цифр.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.contactEmail.trim()
      )
    ) {
      return "Введите корректный Email.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await api.post("/applications", {
        organizationName: form.organizationName.trim(),
        bin: form.bin.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        contactEmail: form.contactEmail.trim().toLowerCase(),
        contactPhone: form.contactPhone.trim(),
        adminName: form.adminName.trim(),
      });

      setSuccessMessage(
        response?.data?.message ||
          "Заявка успешно отправлена и находится на рассмотрении."
      );

      setForm(INITIAL_FORM);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <Link to="/login" style={styles.backLink}>
          <RiArrowLeftLine />
          Вернуться ко входу
        </Link>
      </div>

      <section style={styles.card}>
        <div style={styles.logoBox}>
          <RiBuilding4Line />
        </div>

        <h1 style={styles.title}>
          Подключение медицинской организации
        </h1>

        <p style={styles.subtitle}>
          Заполните заявку. После проверки техническая поддержка
          создаст организацию и отправит данные администратора на
          указанную электронную почту.
        </p>

        {successMessage && (
          <div style={styles.successAlert}>
            <RiCheckboxCircleLine />
            <div>
              <strong>Заявка отправлена</strong>
              <p style={styles.alertText}>{successMessage}</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div style={styles.errorAlert}>
            <RiCloseCircleLine />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>
                Название организации *
              </span>

              <input
                type="text"
                name="organizationName"
                value={form.organizationName}
                onChange={handleChange}
                placeholder="Городская поликлиника № 5"
                autoComplete="organization"
                style={styles.input}
                disabled={loading}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>БИН *</span>

              <input
                type="text"
                inputMode="numeric"
                name="bin"
                value={form.bin}
                onChange={handleChange}
                placeholder="12 цифр"
                maxLength={12}
                style={styles.input}
                disabled={loading}
              />

              <span style={styles.counter}>
                {form.bin.length}/12
              </span>
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Город *</span>

              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="Астана"
                autoComplete="address-level2"
                style={styles.input}
                disabled={loading}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Адрес</span>

              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Улица, дом"
                autoComplete="street-address"
                style={styles.input}
                disabled={loading}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>
                Контактный Email *
              </span>

              <input
                type="email"
                name="contactEmail"
                value={form.contactEmail}
                onChange={handleChange}
                placeholder="clinic@example.kz"
                autoComplete="email"
                style={styles.input}
                disabled={loading}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>
                Контактный телефон *
              </span>

              <input
                type="tel"
                name="contactPhone"
                value={form.contactPhone}
                onChange={handleChange}
                placeholder="+7 700 000 00 00"
                autoComplete="tel"
                style={styles.input}
                disabled={loading}
              />
            </label>
          </div>

          <label style={styles.field}>
            <span style={styles.label}>
              ФИО будущего администратора *
            </span>

            <input
              type="text"
              name="adminName"
              value={form.adminName}
              onChange={handleChange}
              placeholder="Фамилия Имя Отчество"
              autoComplete="name"
              style={styles.input}
              disabled={loading}
            />
          </label>

          <div style={styles.infoBox}>
            После одобрения заявки на контактный Email будут
            отправлены логин и временный пароль администратора.
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              ...(loading ? styles.disabledButton : {}),
            }}
          >
            <RiSendPlane2Line />

            {loading
              ? "Отправка заявки..."
              : "Отправить заявку"}
          </button>
        </form>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px 18px 60px",
    boxSizing: "border-box",
    background:
      "linear-gradient(135deg, #0f172a 0%, #17183f 55%, #1e1b4b 100%)",
    color: "#ffffff",
    fontFamily: "'Outfit', 'Inter', sans-serif",
  },

  topBar: {
    width: "100%",
    maxWidth: "920px",
    margin: "0 auto 18px",
  },

  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    color: "#a5b4fc",
    textDecoration: "none",
    fontWeight: 700,
  },

  card: {
    width: "100%",
    maxWidth: "920px",
    margin: "0 auto",
    padding: "34px",
    boxSizing: "border-box",
    borderRadius: "24px",
    background: "rgba(15, 23, 42, 0.78)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    boxShadow: "0 24px 80px rgba(0, 0, 0, 0.32)",
  },

  logoBox: {
    width: "58px",
    height: "58px",
    marginBottom: "18px",
    borderRadius: "17px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #6366f1 0%, #10b981 100%)",
    fontSize: "29px",
  },

  title: {
    margin: "0 0 10px",
    fontSize: "30px",
    fontWeight: 800,
  },

  subtitle: {
    maxWidth: "720px",
    margin: "0 0 28px",
    color: "#94a3b8",
    lineHeight: 1.6,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "18px",
  },

  field: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "18px",
  },

  label: {
    color: "#cbd5e1",
    fontSize: "14px",
    fontWeight: 700,
  },

  input: {
    width: "100%",
    minHeight: "48px",
    padding: "12px 14px",
    boxSizing: "border-box",
    borderRadius: "12px",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    outline: "none",
    background: "rgba(30, 41, 59, 0.75)",
    color: "#ffffff",
    fontSize: "15px",
  },

  counter: {
    position: "absolute",
    right: "12px",
    bottom: "15px",
    color: "#64748b",
    fontSize: "11px",
  },

  infoBox: {
    margin: "4px 0 20px",
    padding: "14px",
    borderRadius: "12px",
    background: "rgba(99, 102, 241, 0.1)",
    border: "1px solid rgba(99, 102, 241, 0.22)",
    color: "#c7d2fe",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  submitButton: {
    width: "100%",
    minHeight: "50px",
    border: "none",
    borderRadius: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    background:
      "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 800,
    boxShadow: "0 12px 30px rgba(79, 70, 229, 0.28)",
  },

  successAlert: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    marginBottom: "22px",
    padding: "14px",
    borderRadius: "12px",
    background: "rgba(16, 185, 129, 0.12)",
    border: "1px solid rgba(16, 185, 129, 0.32)",
    color: "#6ee7b7",
  },

  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginBottom: "22px",
    padding: "14px",
    borderRadius: "12px",
    background: "rgba(239, 68, 68, 0.12)",
    border: "1px solid rgba(239, 68, 68, 0.32)",
    color: "#fca5a5",
  },

  alertText: {
    margin: "4px 0 0",
    color: "#a7f3d0",
    lineHeight: 1.45,
  },

  disabledButton: {
    opacity: 0.58,
    cursor: "not-allowed",
  },
};

