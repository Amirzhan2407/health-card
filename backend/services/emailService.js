
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const smtpConfigured =
  Boolean(process.env.SMTP_HOST) &&
  Boolean(process.env.SMTP_USER) &&
  Boolean(process.env.SMTP_PASS);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(
        process.env.SMTP_PORT || 587
      ),
      secure:
        process.env.SMTP_SECURE ===
        "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

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

function getLoginUrl() {
  const frontendUrl =
    clean(process.env.FRONTEND_URL) ||
    "http://localhost:5173";

  return `${frontendUrl.replace(
    /\/+$/,
    ""
  )}/login`;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}) {
  const recipient = clean(to);

  if (!recipient) {
    throw new Error(
      "Не указан получатель письма."
    );
  }

  if (
    process.env.SMTP_DISABLED === "true"
  ) {
    console.log(
      "========== EMAIL TEST =========="
    );
    console.log("Получатель:", recipient);
    console.log("Тема:", subject);
    console.log(text);
    console.log(
      "================================"
    );

    return {
      success: true,
      logged: true,
    };
  }

  if (!transporter) {
    throw new Error(
      "SMTP не настроен. Проверьте SMTP_HOST, SMTP_USER и SMTP_PASS."
    );
  }

  try {
    const info =
      await transporter.sendMail({
        from:
          process.env.EMAIL_FROM ||
          `"Clinic OS" <${process.env.SMTP_USER}>`,
        to: recipient,
        subject,
        text,
        html,
      });

    console.log(
      `[SMTP SUCCESS] Письмо отправлено: ${info.messageId}`
    );

    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted || [],
      rejected: info.rejected || [],
    };
  } catch (error) {
    console.error(
      "[SMTP ERROR]",
      error?.message || error
    );

    throw new Error(
      "Не удалось отправить письмо. Проверьте настройки Gmail SMTP."
    );
  }
}

export async function sendRegistrationCodeEmail(
  email,
  code
) {
  const confirmationCode = clean(code);

  if (!/^\d{6}$/.test(confirmationCode)) {
    throw new Error(
      "Некорректный код подтверждения."
    );
  }

  return sendEmail({
    to: email,

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

    html: `
      <div style="
        font-family: Arial, sans-serif;
        padding: 24px;
      ">
        <h2 style="color: #4f46e5;">
          Clinic OS
        </h2>

        <p>
          Ваш код подтверждения регистрации:
        </p>

        <div
          style="
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            padding: 18px;
            background: #eef2ff;
            border-radius: 12px;
            text-align: center;
            color: #4338ca;
          "
        >
          ${escapeHtml(confirmationCode)}
        </div>

        <p style="margin-top: 20px;">
          Код действует 10 минут.
        </p>

        <p>
          Никому не сообщайте этот код.
        </p>
      </div>
    `,
  });
}

export async function sendDoctorAccessEmail({
  email,
  fullName,
  username,
  temporaryPassword,
  isPasswordReset = false,
}) {
  const recipientEmail = clean(email);
  const doctorName =
    clean(fullName) || "Уважаемый врач";

  const login = clean(username);
  const password = clean(
    temporaryPassword
  );

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
      "Не передавайте логин и пароль другим людям.",
      "",
      "С уважением,",
      "Clinic OS",
    ].join("\n"),

    html: `
      <div style="
        margin: 0;
        padding: 32px 16px;
        background: #f1f5f9;
        font-family: Arial, sans-serif;
        color: #0f172a;
      ">
        <div style="
          max-width: 600px;
          margin: 0 auto;
          padding: 28px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
        ">
          <h1 style="
            margin: 0 0 20px;
            color: #4f46e5;
            font-size: 27px;
          ">
            Clinic OS
          </h1>

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
            font-size: 15px;
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
            <p style="margin: 0 0 12px;">
              <strong>Логин:</strong>
              <span style="
                margin-left: 6px;
                font-family: monospace;
                font-size: 16px;
              ">
                ${escapeHtml(login)}
              </span>
            </p>

            <p style="margin: 0;">
              <strong>
                Временный пароль:
              </strong>

              <span style="
                margin-left: 6px;
                font-family: monospace;
                font-size: 16px;
              ">
                ${escapeHtml(password)}
              </span>
            </p>
          </div>

          <a
            href="${escapeHtml(loginUrl)}"
            style="
              display: inline-block;
              margin: 2px 0 20px;
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

          <div style="
            padding: 14px;
            background: #fff7ed;
            border: 1px solid #fed7aa;
            border-radius: 10px;
            color: #9a3412;
            font-size: 14px;
            line-height: 1.5;
          ">
            После входа необходимо установить
            новый пароль. Не передавайте данные
            доступа другим людям.
          </div>

          <p style="
            margin: 24px 0 0;
            color: #64748b;
            font-size: 13px;
            line-height: 1.5;
          ">
            С уважением,<br />
            команда Clinic OS
          </p>
        </div>
      </div>
    `,
  });
}

