import dotenv from "dotenv";
dotenv.config();

const REQUIRED_ENV_VARS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "CRON_SECRET",
];

export function validateEnv() {
  const missing = [];
  const placeholders = [
    "your-supabase-service-role-key",
    "YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE",
    "your_jwt_secret_here",
    "your-secure-jwt-access-secret-key-at-least-32-characters",
    "your-secure-jwt-refresh-secret-key-at-least-32-characters",
    "your-render-cron-job-shared-secret-key"
  ];

  for (const v of REQUIRED_ENV_VARS) {
    const val = process.env[v];
    if (!val || placeholders.some(p => val.toLowerCase().includes(p.toLowerCase()))) {
      missing.push(v);
    }
  }

  if (missing.length > 0) {
    console.error("\n=====================================================================");
    console.error("❌ [FATAL] CRITICAL CONFIGURATION ERROR");
    console.error("=====================================================================");
    console.error(`The following environment variables are missing or use default placeholders:`);
    missing.forEach(m => console.error(`  - ${m}`));
    console.error("\nFor production and testing, these variables MUST be configured");
    console.error("in your .env file with real, secure keys.");
    console.error("=====================================================================\n");
    process.exit(1);
  }

  // Check SMTP setup
  // SMTP is considered disabled ONLY if SMTP_DISABLED=true is explicitly set
  const smtpDisabled = process.env.SMTP_DISABLED === "true";
  if (!smtpDisabled) {
    const requiredSmtp = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
    const missingSmtp = requiredSmtp.filter(v => !process.env[v] || process.env[v].includes("your-smtp"));
    if (missingSmtp.length > 0) {
      console.warn(`⚠️ [WARNING] SMTP credentials are not fully configured (${missingSmtp.join(", ")}).`);
      console.warn("Mail notifications will fallback to mock logging.");
    }
  }
}
