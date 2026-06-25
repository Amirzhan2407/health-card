
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

function clean(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFrontendUrl() {
  return (
    clean(process.env.FRONTEND_URL) ||
    "http://localhost:5173"
  ).replace(/\/+$/, "");
}

function getLoginUrl() {
  return `${getFrontendUrl()}/login`;
}

function isSmtpDisabled() {
  return (
    clean(process.env.SMTP_DISABLED)
      .toLowerCase() === "true"
  );
}

function getSmtpPort() {
  const port = Number(
    process.env.SMTP_PORT || 587
  );

  if (
    !Number.isInteger(port) ||
    port <= 0
  ) {
    return 587;
  }

  return port;
}

function getSmtpSecure() {
  const value = clean(
    process.env.SMTP_SECURE
  ).toLowerCase();

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return getSmtpPort() === 465;
}

function hasSmtpConfiguration() {
  return Boolean(
    clean(process.env.SMTP_HOST) &&
      clean(process.env.SMTP_USER) &&
      clean(process.env.SMTP_PASS)
  );
}

function createTransporter() {
  if (
    isSmtpDisabled() ||
    !hasSmtpConfiguration()
  ) {
    return null;
  }

  return nodemailer.createTransport({
    host: clean(process.env.SMTP_HOST),
    port: getSmtpPort(),
    secure: getSmtpSecure(),

    auth: {
      user: clean(process.env.SMTP_USER),
      pass: clean(process.env.SMTP_PASS),
    },

    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
}

function formatAppointmentDate(value) {
  const dateValue = clean(value);

  if (!dateValue) {
    return "Не указана";
  }

  const parsedDate = new Date(
    `${dateValue}T12:00:00`
  );

  if (
    Number.isNaN(parsedDate.getTime())
  ) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(parsedDate);
}

function formatAppointmentTime(value) {
  const timeValue = clean(value);

  if (!timeValue) {
    return "Не указано";
  }

  return timeValue.slice(0, 5);
}

function createQrAttachment(
  qrDataUrl
) {
  const normalized =
    clean(qrDataUrl);

  if (
    !normalized.startsWith(
      "data:image/png;base64,"
    )
  ) {
    return null;
  }

  const base64Content =
    normalized.split(",")[1];

  if (!base64Content) {
    return null;
  }

  return {
    filename: "clinic-os-appointment-qr.png",
    content: base64Content,
    encoding: "base64",
    cid: "clinic-os-appointment-qr",
  };
}

function emailShell(content) {
  return `
    <div style="
      margin: 0;
      padding: 32px 16px;
      background: #f1f5f9;
      font-family: Arial, sans-serif;
      color: #0f172a;
    ">
      <div style="
        max-width: 640px;
        margin: 0 auto;
        padding: 30px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
      ">
        <h1 style="
          margin: 0 0 22px;
          color: #4f46e5;
          font-size: 28px;
        ">
          Clinic OS
        </h1>

        ${content}

        <p style="
          margin: 25px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        ">
          С уважением,<br />
          команда Clinic OS
        </p>
      </div>
    </div>
  `;
}

function detailRow(label, value) {
  return `
    <div style="
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 11px 0;
      border-bottom: 1px solid #e2e8f0;
    ">
      <span style="
        color: #64748b;
        font-size: 14px;
      ">
        ${escapeHtml(label)}
      </span>

      <strong style="
        max-width: 65%;
        color: #0f172a;
        font-size: 14px;
        text-align: right;
      ">
        ${escapeHtml(value || "Не указано")}
      </strong>
    </div>
  `;
}

const transporter =
  createTransporter();

export async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments = [],
}) {
  const recipient = clean(to);

  const normalizedSubject =
    clean(subject);

  if (!recipient) {
    throw new Error(
      "Не указан получатель письма."
    );
  }

  if (!normalizedSubject) {
    throw new Error(
      "Не указана тема письма."
    );
  }

  if (isSmtpDisabled()) {
    console.log(
      "========== EMAIL TEST =========="
    );

    console.log(
      "Получатель:",
      recipient
    );

    console.log(
      "Тема:",
      normalizedSubject
    );

    console.log(text || "");

    console.log(
      "================================"
    );

    return {
      success: true,
      logged: true,
      accepted: [recipient],
      rejected: [],
    };
  }

  if (!transporter) {
    throw new Error(
      "SMTP не настроен. Проверьте SMTP_HOST, SMTP_PORT, SMTP_USER и SMTP_PASS."
    );
  }

  const smtpUser = clean(
    process.env.SMTP_USER
  );

  const emailFrom =
    clean(process.env.EMAIL_FROM) ||
    `"Clinic OS" <${smtpUser}>`;

  try {
    const info =
      await transporter.sendMail({
        from: emailFrom,
        to: recipient,
        subject: normalizedSubject,
        text: text || undefined,
        html: html || undefined,
        attachments,
      });

    const accepted =
      info.accepted || [];

    const rejected =
      info.rejected || [];

    if (
      accepted.length === 0 &&
      rejected.length > 0
    ) {
      throw new Error(
        "Почтовый сервер отклонил получателя."
      );
    }

    console.log(
      `[SMTP SUCCESS] Письмо отправлено на ${recipient}. Message ID: ${info.messageId}`
    );

    return {
      success: true,
      messageId: info.messageId,
      accepted,
      rejected,
    };
  } catch (error) {
    console.error(
      "[SMTP ERROR]",
      error?.message || error
    );

    throw new Error(
      `Не удалось отправить письмо на ${recipient}: ${
        error?.message ||
        "неизвестная ошибка SMTP"
      }`
    );
  }
}

export async function sendRegistrationCodeEmail(
  email,
  code
) {
  const recipientEmail =
    clean(email);

  const confirmationCode =
    clean(code);

  if (!recipientEmail) {
    throw new Error(
      "Не указана электронная почта."
    );
  }

  if (
    !/^\d{6}$/.test(
      confirmationCode
    )
  ) {
    throw new Error(
      "Некорректный код подтверждения."
    );
  }

  return sendEmail({
    to: recipientEmail,

    subject:
      "Код регистрации в Clinic OS",

    text: [
      "Здравствуйте!",
      "",
      `Код регистрации в Clinic OS: ${confirmationCode}`,
      "",
      "Код действует 10 минут.",
      "Никому не сообщайте этот код.",
    ].join("\n"),

    html: emailShell(`
      <p style="
        margin: 0 0 14px;
        font-size: 16px;
        line-height: 1.6;
      ">
        Ваш код подтверждения регистрации:
      </p>

      <div style="
        margin: 20px 0;
        padding: 18px;
        background: #eef2ff;
        border: 1px solid #c7d2fe;
        border-radius: 12px;
        color: #4338ca;
        font-size: 32px;
        font-weight: bold;
        letter-spacing: 8px;
        text-align: center;
      ">
        ${escapeHtml(
          confirmationCode
        )}
      </div>

      <p style="
        margin: 0;
        color: #475569;
        font-size: 14px;
      ">
        Код действует 10 минут.
        Никому не сообщайте этот код.
      </p>
    `),
  });
}

export async function sendDoctorAccessEmail({
  email,
  fullName,
  username,
  temporaryPassword,
  isPasswordReset = false,
}) {
  const recipientEmail =
    clean(email);

  const doctorName =
    clean(fullName) ||
    "Уважаемый врач";

  const login =
    clean(username);

  const password =
    clean(temporaryPassword);

  if (!recipientEmail) {
    throw new Error(
      "У врача не указана электронная почта."
    );
  }

  if (!login) {
    throw new Error(
      "Не указан логин врача."
    );
  }

  if (!password) {
    throw new Error(
      "Не указан временный пароль врача."
    );
  }

  const loginUrl = getLoginUrl();

  const subject = isPasswordReset
    ? "Clinic OS — новый временный пароль"
    : "Clinic OS — доступ к кабинету врача";

  const actionText = isPasswordReset
    ? "Администратор медицинской организации создал для вас новый временный пароль."
    : "Администратор медицинской организации выдал вам доступ к кабинету врача Clinic OS.";

  return sendEmail({
    to: recipientEmail,
    subject,

    text: [
      `Здравствуйте, ${doctorName}!`,
      "",
      actionText,
      "",
      `Логин: ${login}`,
      `Временный пароль: ${password}`,
      "",
      `Страница входа: ${loginUrl}`,
      "",
      "После входа необходимо установить новый пароль.",
      "Не передавайте данные доступа другим людям.",
    ].join("\n"),

    html: emailShell(`
      <p style="
        margin: 0 0 14px;
        font-size: 16px;
        line-height: 1.6;
      ">
        Здравствуйте,
        <strong>
          ${escapeHtml(doctorName)}
        </strong>!
      </p>

      <p style="
        margin: 0 0 20px;
        color: #475569;
        line-height: 1.6;
      ">
        ${escapeHtml(actionText)}
      </p>

      <div style="
        margin: 20px 0;
        padding: 18px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
      ">
        <p>
          <strong>Логин:</strong>
          ${escapeHtml(login)}
        </p>

        <p style="margin-bottom: 0;">
          <strong>
            Временный пароль:
          </strong>
          ${escapeHtml(password)}
        </p>
      </div>

      <a
        href="${escapeHtml(loginUrl)}"
        style="
          display: inline-block;
          padding: 12px 20px;
          background: #4f46e5;
          color: #ffffff;
          text-decoration: none;
          border-radius: 10px;
          font-weight: bold;
        "
      >
        Войти в Clinic OS
      </a>
    `),
  });
}

/**
 * Письмо пациенту после создания записи.
 */
export async function sendAppointmentCreatedEmail({
  email,
  patientName,
  appointmentId,
  organizationName,
  doctorName,
  specialtyName,
  departmentName,
  roomName,
  date,
  time,
  startCode,
  qrDataUrl,
}) {
  const recipientEmail =
    clean(email);

  const normalizedStartCode =
    clean(startCode);

  if (!recipientEmail) {
    throw new Error(
      "Не указана почта пациента."
    );
  }

  if (
    !/^\d{6}$/.test(
      normalizedStartCode
    )
  ) {
    throw new Error(
      "Некорректный код начала приёма."
    );
  }

  const formattedDate =
    formatAppointmentDate(date);

  const formattedTime =
    formatAppointmentTime(time);

  const qrAttachment =
    createQrAttachment(qrDataUrl);

  const appointmentsUrl =
    `${getFrontendUrl()}/patient/appointments`;

  const text = [
    `Здравствуйте, ${
      clean(patientName) ||
      "уважаемый пациент"
    }!`,
    "",
    "Ваша запись к врачу успешно создана.",
    "",
    `Организация: ${clean(organizationName)}`,
    `Врач: ${clean(doctorName)}`,
    `Специальность: ${clean(specialtyName)}`,
    `Отделение: ${clean(departmentName) || "Не указано"}`,
    `Кабинет: ${clean(roomName) || "Не указан"}`,
    `Дата: ${formattedDate}`,
    `Время: ${formattedTime}`,
    `Код начала приёма: ${normalizedStartCode}`,
    `Номер записи: ${clean(appointmentId)}`,
    "",
    "Покажите QR-код или цифровой код врачу перед началом приёма.",
  ].join("\n");

  return sendEmail({
    to: recipientEmail,

    subject:
      "Clinic OS — запись к врачу подтверждена",

    text,

    attachments:
      qrAttachment
        ? [qrAttachment]
        : [],

    html: emailShell(`
      <p style="
        margin: 0 0 10px;
        font-size: 17px;
        line-height: 1.6;
      ">
        Здравствуйте,
        <strong>
          ${escapeHtml(
            clean(patientName) ||
              "уважаемый пациент"
          )}
        </strong>!
      </p>

      <p style="
        margin: 0 0 20px;
        color: #475569;
        line-height: 1.6;
      ">
        Ваша запись к врачу успешно создана.
      </p>

      <div style="
        margin: 0 0 20px;
        padding: 18px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
      ">
        ${detailRow(
          "Организация",
          clean(organizationName)
        )}

        ${detailRow(
          "Врач",
          clean(doctorName)
        )}

        ${detailRow(
          "Специальность",
          clean(specialtyName)
        )}

        ${detailRow(
          "Отделение",
          clean(departmentName)
        )}

        ${detailRow(
          "Кабинет",
          clean(roomName)
        )}

        ${detailRow(
          "Дата",
          formattedDate
        )}

        ${detailRow(
          "Время",
          formattedTime
        )}

        ${detailRow(
          "Номер записи",
          clean(appointmentId)
        )}
      </div>

      ${
        qrAttachment
          ? `
            <div style="
              margin: 20px 0;
              text-align: center;
            ">
              <p style="
                margin: 0 0 12px;
                font-weight: bold;
              ">
                QR-код начала приёма
              </p>

              <img
                src="cid:clinic-os-appointment-qr"
                alt="QR-код записи"
                width="220"
                height="220"
                style="
                  display: block;
                  margin: 0 auto;
                  border: 12px solid #ffffff;
                  border-radius: 12px;
                "
              />
            </div>
          `
          : ""
      }

      <div style="
        margin: 20px 0;
        padding: 18px;
        background: #eef2ff;
        border: 1px solid #c7d2fe;
        border-radius: 12px;
        text-align: center;
      ">
        <div style="
          margin-bottom: 8px;
          color: #64748b;
          font-size: 13px;
        ">
          Цифровой код начала приёма
        </div>

        <strong style="
          color: #4338ca;
          font-size: 32px;
          letter-spacing: 8px;
        ">
          ${escapeHtml(
            normalizedStartCode
          )}
        </strong>
      </div>

      <p style="
        color: #475569;
        font-size: 14px;
        line-height: 1.6;
      ">
        Покажите QR-код или цифровой код
        врачу перед началом приёма.
      </p>

      <a
        href="${escapeHtml(
          appointmentsUrl
        )}"
        style="
          display: inline-block;
          margin-top: 8px;
          padding: 12px 20px;
          background: #4f46e5;
          color: #ffffff;
          text-decoration: none;
          border-radius: 10px;
          font-weight: bold;
        "
      >
        Открыть мои записи
      </a>
    `),
  });
}

/**
 * Письмо пациенту с кодом завершения приёма.
 */
export async function sendAppointmentFinishCodeEmail({
  email,
  patientName,
  doctorName,
  date,
  time,
  code,
  expiresMinutes = 5,
}) {
  const recipientEmail =
    clean(email);

  const confirmationCode =
    clean(code);

  if (!recipientEmail) {
    throw new Error(
      "Не указана почта пациента."
    );
  }

  if (
    !/^\d{4,6}$/.test(
      confirmationCode
    )
  ) {
    throw new Error(
      "Некорректный код завершения приёма."
    );
  }

  const validMinutes = Number(
    expiresMinutes
  );

  return sendEmail({
    to: recipientEmail,

    subject:
      "Clinic OS — код завершения приёма",

    text: [
      `Здравствуйте, ${
        clean(patientName) ||
        "уважаемый пациент"
      }!`,
      "",
      `Врач ${clean(doctorName)} запросил подтверждение завершения приёма.`,
      `Дата: ${formatAppointmentDate(date)}`,
      `Время: ${formatAppointmentTime(time)}`,
      "",
      `Код завершения: ${confirmationCode}`,
      "",
      `Код действует ${validMinutes} минут.`,
      "Сообщите этот код врачу только после завершения приёма.",
    ].join("\n"),

    html: emailShell(`
      <p style="
        margin: 0 0 14px;
        font-size: 17px;
        line-height: 1.6;
      ">
        Здравствуйте,
        <strong>
          ${escapeHtml(
            clean(patientName) ||
              "уважаемый пациент"
          )}
        </strong>!
      </p>

      <p style="
        color: #475569;
        line-height: 1.6;
      ">
        Врач
        <strong>
          ${escapeHtml(
            clean(doctorName)
          )}
        </strong>
        запросил подтверждение завершения приёма.
      </p>

      <div style="
        margin: 22px 0;
        padding: 20px;
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        border-radius: 12px;
        text-align: center;
      ">
        <div style="
          margin-bottom: 8px;
          color: #64748b;
          font-size: 13px;
        ">
          Код завершения приёма
        </div>

        <strong style="
          color: #047857;
          font-size: 34px;
          letter-spacing: 9px;
        ">
          ${escapeHtml(
            confirmationCode
          )}
        </strong>
      </div>

      <p style="
        color: #475569;
        font-size: 14px;
        line-height: 1.6;
      ">
        Код действует
        <strong>
          ${escapeHtml(
            validMinutes
          )} минут
        </strong>.
        Сообщите его врачу только после
        завершения приёма.
      </p>
    `),
  });
}

