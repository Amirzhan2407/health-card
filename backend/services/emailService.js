import dotenv from "dotenv";

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const GMAIL_FROM = process.env.GMAIL_FROM || process.env.EMAIL_USER;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://health-card-rose.vercel.app";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function encodeMimeSubject(subject) {
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

function getStatusText(status) {
  if (status === "approved") return "одобрена";
  if (status === "waiting_first_login") return "одобрена, ожидается первый вход";
  if (status === "waiting_eds") return "одобрена, ожидается первый вход";
  if (status === "rejected") return "отклонена";
  if (status === "in_progress") return "в обработке";
  return "обновлена";
}

function getStatusColor(status) {
  if (status === "approved" || status === "waiting_first_login" || status === "waiting_eds") {
    return "#16a34a";
  }
  if (status === "rejected") return "#dc2626";
  if (status === "in_progress") return "#2563eb";
  return "#2563eb";
}

function getStatusBackground(status) {
  if (status === "approved" || status === "waiting_first_login" || status === "waiting_eds") {
    return "#dcfce7";
  }
  if (status === "rejected") return "#fee2e2";
  if (status === "in_progress") return "#dbeafe";
  return "#dbeafe";
}

function buildApplicationStatusEmail({ application, status, reviewComment }) {
  const applicationNumber = escapeHtml(
    application?.application_number || "не указан"
  );

  const organizationName = escapeHtml(
    application?.organization_name || "Ваша организация"
  );

  const safeReviewComment = escapeHtml(
    reviewComment || application?.review_comment || "Причина не указана."
  );

  const statusText = getStatusText(status);
  const statusColor = getStatusColor(status);
  const statusBackground = getStatusBackground(status);
  const loginUrl = `${FRONTEND_URL}/organization-login`;

  const subject = `Clinic OS — ответ по заявке ${applicationNumber}`;

  const approvedBlock =
    status === "approved" ||
    status === "waiting_first_login" ||
    status === "waiting_eds"
      ? `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:16px;margin-top:18px;">
          <div style="color:#166534;font-size:15px;line-height:1.6;font-weight:600;">
            Заявка успешно прошла проверку. Доступы для главного врача и администратора будут активированы через первый вход в систему.
            Пароль не отправляется по почте — его нужно создать самостоятельно при первом входе.
          </div>

          <a href="${loginUrl}" style="display:inline-block;margin-top:16px;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:800;">
            Перейти ко входу
          </a>
        </div>
      `
      : "";

  const rejectedBlock =
    status === "rejected"
      ? `
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:16px;margin-top:18px;">
          <div style="color:#9a3412;font-size:13px;font-weight:700;margin-bottom:8px;">
            Причина отклонения
          </div>
          <div style="color:#431407;font-size:15px;line-height:1.6;font-weight:500;">
            ${safeReviewComment}
          </div>
        </div>
      `
      : "";

  const progressBlock =
    status === "in_progress"
      ? `
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:16px;margin-top:18px;">
          <div style="color:#1e40af;font-size:15px;line-height:1.6;font-weight:600;">
            Ваша заявка принята в обработку технической поддержкой.
          </div>
        </div>
      `
      : "";

  const html = `
    <!doctype html>
    <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:640px;margin:28px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;">
          <div style="padding:24px 28px;background:#07111f;">
            <div style="color:#ffffff;font-size:26px;font-weight:800;">
              Clinic OS
            </div>
            <div style="color:#94a3b8;font-size:13px;margin-top:6px;">
              Система подключения медицинских организаций
            </div>
          </div>

          <div style="padding:28px;">
            <h1 style="color:#0f172a;font-size:24px;margin:0 0 12px;">
              Здравствуйте!
            </h1>

            <p style="color:#475569;font-size:15px;line-height:1.6;margin:0;">
              Ваша заявка была рассмотрена. Ниже указаны данные по заявке и текущий статус.
            </p>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:18px;margin-top:18px;">
              <div style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">
                Номер заявки
              </div>
              <div style="color:#0f172a;font-size:18px;font-weight:800;margin-top:5px;">
                ${applicationNumber}
              </div>

              <div style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;margin-top:14px;">
                Организация
              </div>
              <div style="color:#0f172a;font-size:16px;font-weight:700;margin-top:5px;">
                ${organizationName}
              </div>

              <div style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;margin-top:14px;">
                Статус
              </div>
              <div style="display:inline-block;margin-top:8px;padding:9px 13px;border-radius:999px;background:${statusBackground};color:${statusColor};font-size:14px;font-weight:800;">
                Заявка ${statusText}
              </div>
            </div>

            ${progressBlock}
            ${approvedBlock}
            ${rejectedBlock}

            ${
              reviewComment && status !== "rejected"
                ? `
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin-top:18px;">
                    <div style="color:#64748b;font-size:13px;font-weight:700;margin-bottom:8px;">
                      Комментарий
                    </div>
                    <div style="color:#334155;font-size:15px;line-height:1.6;">
                      ${safeReviewComment}
                    </div>
                  </div>
                `
                : ""
            }

            <p style="color:#64748b;font-size:13px;line-height:1.6;margin-top:22px;">
              Это автоматическое письмо от сервиса <b>Clinic OS</b>. Пожалуйста, не отвечайте на него.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = [
    "Здравствуйте!",
    "",
    "Ваша заявка была рассмотрена.",
    "",
    `Номер заявки: ${application?.application_number || "не указан"}`,
    `Организация: ${application?.organization_name || "Ваша организация"}`,
    `Статус: заявка ${statusText}`,
    status === "rejected"
      ? `Причина отклонения: ${
          reviewComment || application?.review_comment || "Причина не указана."
        }`
      : "",
    status === "approved" ||
    status === "waiting_first_login" ||
    status === "waiting_eds"
      ? `Первый вход: ${loginUrl}`
      : "",
    "",
    "Это автоматическое письмо от сервиса Clinic OS.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    html,
    text,
  };
}

async function getGmailAccessToken() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error("Gmail API не настроен на сервере.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("GOOGLE TOKEN ERROR:", result);
    throw new Error(
      result?.error_description ||
        result?.error ||
        "Не удалось получить Gmail access token."
    );
  }

  return result.access_token;
}

function buildRawMimeEmail({ from, to, subject, text, html }) {
  const boundary = `clinic_os_boundary_${Date.now()}`;

  const message = [
    `From: Clinic OS <${from}>`,
    `To: ${to}`,
    `Subject: ${encodeMimeSubject(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return encodeBase64Url(message);
}

async function sendGmailMessage({ to, subject, text, html }) {
  const accessToken = await getGmailAccessToken();

  const raw = buildRawMimeEmail({
    from: GMAIL_FROM,
    to,
    subject,
    text,
    html,
  });

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    }
  );

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("GMAIL SEND ERROR:", result);

    throw new Error(
      result?.error?.message ||
        result?.message ||
        `Ошибка Gmail API: ${response.status}`
    );
  }

  return result;
}

export async function sendApplicationStatusEmail({
  to,
  application,
  status,
  reviewComment,
}) {
  if (!to) {
    return {
      success: false,
      message: "Email получателя не указан.",
    };
  }

  if (!GMAIL_FROM) {
    return {
      success: false,
      message: "GMAIL_FROM не настроен на сервере.",
    };
  }

  const email = buildApplicationStatusEmail({
    application,
    status,
    reviewComment,
  });

  try {
    await sendGmailMessage({
      to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    return {
      success: true,
      message: "Письмо отправлено.",
    };
  } catch (error) {
    console.error("SEND EMAIL ERROR:", {
      message: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      message: error.message || "Ошибка отправки письма.",
    };
  }
}