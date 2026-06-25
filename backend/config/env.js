
import dotenv from "dotenv";

dotenv.config();

const REQUIRED_ENV_VARS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "CRON_SECRET",
  "GROQ_API_KEY",
];

const PLACEHOLDERS = [
  "your-supabase-service-role-key",
  "your_supabase_service_role_key_here",
  "your_jwt_secret_here",
  "your-secure-jwt-access-secret",
  "your-secure-jwt-refresh-secret",
  "your-render-cron-job-shared-secret",
  "your-groq-api-key",
  "your_api_key",
  "change-me",
];

function clean(value) {
  return String(value ?? "").trim();
}

function isInvalidValue(value) {
  const normalized = clean(value).toLowerCase();

  if (!normalized) {
    return true;
  }

  return PLACEHOLDERS.some((placeholder) =>
    normalized.includes(
      placeholder.toLowerCase()
    )
  );
}

function printFatalError(missingVariables) {
  console.error(
    "\n============================================================"
  );
  console.error(
    "❌ [FATAL] Не настроены переменные окружения"
  );
  console.error(
    "============================================================"
  );

  for (const variableName of missingVariables) {
    console.error(`  - ${variableName}`);
  }

  console.error(
    "\nПроверьте файл backend/.env."
  );
  console.error(
    "============================================================\n"
  );
}

function validateRequiredVariables() {
  const missingVariables =
    REQUIRED_ENV_VARS.filter(
      (variableName) =>
        isInvalidValue(
          process.env[variableName]
        )
    );

  if (missingVariables.length > 0) {
    printFatalError(missingVariables);
    process.exit(1);
  }
}

function validateSmtpConfiguration() {
  const smtpDisabled =
    clean(process.env.SMTP_DISABLED)
      .toLowerCase() === "true";

  if (smtpDisabled) {
    console.log(
      "ℹ️ SMTP отключён через SMTP_DISABLED=true."
    );

    return;
  }

  const smtpVariables = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
  ];

  const missingSmtp =
    smtpVariables.filter(
      (variableName) =>
        !clean(
          process.env[variableName]
        )
    );

  if (missingSmtp.length > 0) {
    console.warn(
      `⚠️ SMTP настроен не полностью: ${missingSmtp.join(
        ", "
      )}.`
    );
  }
}

export function validateEnv() {
  validateRequiredVariables();
  validateSmtpConfiguration();

  console.log(
    "✅ Переменные Clinic OS проверены."
  );

  console.log(
    "✅ Groq настроен для AI-консультанта и поиска лекарств."
  );
}
