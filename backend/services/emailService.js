import nodemailer from "nodemailer";
import dotenv from "dotenv";
import dns from "node:dns";

dotenv.config();

// ВАЖНО ДЛЯ RENDER:
// заставляем Node сначала использовать IPv4, а не IPv6
dns.setDefaultResultOrder("ipv4first");

const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 465);
const EMAIL_SECURE = String(process.env.EMAIL_SECURE || "true") === "true";
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;

function createTransporter() {
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    console.error("EMAIL CONFIG ERROR:", {
      EMAIL_HOST: Boolean(EMAIL_HOST),
      EMAIL_USER: Boolean(EMAIL_USER),
      EMAIL_PASS: Boolean(EMAIL_PASS),
      EMAIL_FROM: Boolean(EMAIL_FROM),
    });

    return null;
  }

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_SECURE,
    family: 4,

    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },

    requireTLS: true,

    tls: {
      servername: EMAIL_HOST,
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },

    connectionTimeout: 60000,
    greetingTimeout: 60000,
    socketTimeout: 60000,
  });
}

function getStatusText(status) {
  if (status === "approved") return "одобрена";
  if (status === "rejected") return "отклонена";

  return "обновлена";
}

function getStatusColor(status) {
  if (status === "approved") return "#16a34a";
  if (status === "rejected") return "#dc2626";

  return "#2563eb";
}

function getStatusBackground(status) {
  if (status === "approved") return "#dcfce7";
  if (status === "rejected") return "#fee2e2";

  return "#dbeafe";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildApplicationStatusEmail({ application, status, reviewComment }) {
  const organizationName = escapeHtml(
    application?.organization_name || "Ваша организация"
  );

  const applicationNumber = escapeHtml(
    application?.application_number || "не указан"
  );

  const safeReviewComment = escapeHtml(
    reviewComment || application?.review_comment || "Причина не указана."
  );

  const currentStatusText = getStatusText(status);
  const currentStatusColor = getStatusColor(status);
  const currentStatusBackground = getStatusBackground(status);

  const subject = `Ответ по заявке ${applicationNumber}`;

  const approvedBlock =
    status === "approved"
      ? `
        <tr>
          <td style="padding: 0 0 18px;">
            <div style="
              background: #f0fdf4;
              border: 1px solid #bbf7d0;
              border-radius: 14px;
              padding: 16px;
            ">
              <div style="
                color: #166534;
                font-size: 15px;
                line-height: 1.6;
                font-weight: 600;
              ">
                Заявка успешно прошла проверку. Следующий этап — подтверждение доступа главного врача через ЭЦП.
              </div>
            </div>
          </td>
        </tr>
      `
      : "";

  const rejectedBlock =
    status === "rejected"
      ? `
        <tr>
          <td style="padding: 0 0 18px;">
            <div style="
              background: #fff7ed;
              border: 1px solid #fed7aa;
              border-radius: 14px;
              padding: 16px;
            ">
              <div style="
                color: #9a3412;
                font-size: 13px;
                font-weight: 700;
                margin-bottom: 8px;
              ">
                Причина отклонения
              </div>

              <div style="
                color: #431407;
                font-size: 15px;
                line-height: 1.6;
                font-weight: 500;
              ">
                ${safeReviewComment}
              </div>
            </div>
          </td>
        </tr>
      `
      : "";

  const html = `
    <!doctype html>
    <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${subject}</title>
      </head>

      <body style="
        margin: 0;
        padding: 0;
        background: #f1f5f9;
        font-family: Arial, Helvetica, sans-serif;
      ">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="
          background: #f1f5f9;
          padding: 28px 12px;
        ">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="
                max-width: 640px;
                background: #ffffff;
                border-radius: 22px;
                overflow: hidden;
                border: 1px solid #e2e8f0;
              ">
                <tr>
                  <td style="
                    padding: 24px 28px;
                    background: #07111f;
                  ">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="
                            color: #ffffff;
                            font-size: 26px;
                            font-weight: 800;
                            letter-spacing: -0.3px;
                          ">
                            clinisOS
                          </div>

                          <div style="
                            color: #94a3b8;
                            font-size: 13px;
                            margin-top: 6px;
                          ">
                            Система подключения медицинских организаций
                          </div>
                        </td>

                        <td align="right">
                          <div style="
                            display: inline-block;
                            padding: 8px 12px;
                            border-radius: 999px;
                            background: rgba(0, 255, 255, 0.12);
                            color: #67e8f9;
                            font-size: 12px;
                            font-weight: 700;
                          ">
                            Ответ по заявке
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 28px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 0 0 20px;">
                          <div style="
                            color: #0f172a;
                            font-size: 24px;
                            font-weight: 800;
                            letter-spacing: -0.3px;
                          ">
                            Здравствуйте!
                          </div>

                          <div style="
                            color: #475569;
                            font-size: 15px;
                            line-height: 1.6;
                            margin-top: 10px;
                          ">
                            Ваша заявка была рассмотрена. Ниже указаны данные по заявке и итоговый статус проверки.
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 0 0 18px;">
                          <div style="
                            background: #f8fafc;
                            border: 1px solid #e2e8f0;
                            border-radius: 16px;
                            padding: 18px;
                          ">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                              <tr>
                                <td style="padding-bottom: 14px;">
                                  <div style="
                                    color: #64748b;
                                    font-size: 12px;
                                    font-weight: 700;
                                    text-transform: uppercase;
                                    letter-spacing: 0.5px;
                                  ">
                                    Номер заявки
                                  </div>

                                  <div style="
                                    color: #0f172a;
                                    font-size: 18px;
                                    font-weight: 800;
                                    margin-top: 5px;
                                  ">
                                    ${applicationNumber}
                                  </div>
                                </td>
                              </tr>

                              <tr>
                                <td style="padding-bottom: 14px;">
                                  <div style="
                                    color: #64748b;
                                    font-size: 12px;
                                    font-weight: 700;
                                    text-transform: uppercase;
                                    letter-spacing: 0.5px;
                                  ">
                                    Организация
                                  </div>

                                  <div style="
                                    color: #0f172a;
                                    font-size: 16px;
                                    font-weight: 700;
                                    margin-top: 5px;
                                    line-height: 1.5;
                                  ">
                                    ${organizationName}
                                  </div>
                                </td>
                              </tr>

                              <tr>
                                <td>
                                  <div style="
                                    color: #64748b;
                                    font-size: 12px;
                                    font-weight: 700;
                                    text-transform: uppercase;
                                    letter-spacing: 0.5px;
                                  ">
                                    Статус
                                  </div>

                                  <div style="
                                    display: inline-block;
                                    margin-top: 8px;
                                    padding: 9px 13px;
                                    border-radius: 999px;
                                    background: ${currentStatusBackground};
                                    color: ${currentStatusColor};
                                    font-size: 14px;
                                    font-weight: 800;
                                  ">
                                    Заявка ${currentStatusText}
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </div>
                        </td>
                      </tr>

                      ${approvedBlock}
                      ${rejectedBlock}

                      <tr>
                        <td style="padding: 4px 0 0;">
                          <div style="
                            color: #64748b;
                            font-size: 13px;
                            line-height: 1.6;
                          ">
                            Это автоматическое письмо от сервиса <b>clinisOS</b>. Пожалуйста, не отвечайте на него.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="
                max-width: 640px;
                color: #94a3b8;
                font-size: 12px;
                line-height: 1.5;
                margin-top: 14px;
              ">
                © clinisOS. Система цифрового подключения медицинских организаций.
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = [
    "Здравствуйте!",
    "",
    "Ваша заявка была рассмотрена.",
    "",
    `Номер заявки: ${applicationNumber}`,
    `Организация: ${organizationName}`,
    `Статус: заявка ${currentStatusText}`,
    status === "rejected"
      ? `Причина отклонения: ${
          reviewComment || application?.review_comment || "Причина не указана."
        }`
      : "",
    status === "approved"
      ? "Заявка успешно прошла проверку. Следующий этап — подтверждение доступа главного врача через ЭЦП."
      : "",
    "",
    "Это автоматическое письмо от сервиса clinisOS.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    html,
    text,
  };
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

  const transporter = createTransporter();

  if (!transporter) {
    return {
      success: false,
      message: "Email не настроен на сервере.",
    };
  }

  const email = buildApplicationStatusEmail({
    application,
    status,
    reviewComment,
  });

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
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
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack,
    });

    return {
      success: false,
      message: error.message || "Ошибка отправки письма.",
    };
  }
}