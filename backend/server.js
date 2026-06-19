import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import pharmacyRoutes from "./routes/pharmacy.js";
import aiRoutes from "./routes/ai.js";
import adminRoutes from "./routes/admin.js";

import organizationApplicationRoutes from "./routes/organizationApplications.js";
import adminChannelsRoutes from "./routes/adminChannels.js";
import auditLogsRoutes from "./routes/auditLogs.js";
import organizationsRoutes from "./routes/organizations.js";
import adminDashboardRoutes from "./routes/adminDashboard.js";
import organizationStructureRoutes from "./routes/organizationStructure.js";
import { supabase } from "./lib/supabaseAdmin.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://health-card-rose.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-organization-id"],
  })
);

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "clinisOS backend is running",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is healthy",
  });
});

app.get("/api/check-version", (req, res) => {
  const url = process.env.SUPABASE_URL || "NOT SET";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "NOT SET";
  const maskedKey = key !== "NOT SET" ? key.substring(0, 8) + "..." : "NOT SET";
  res.status(200).json({
    success: true,
    version: "v2-roles-fix",
    supabaseUrl: url,
    supabaseKeyMasked: maskedKey
  });
});



app.get("/api/test-db-insert", async (req, res) => {
  const rolesToTest = [
    "chief",
    "chief_doctor",
    "admin",
    "organization_admin",
    "hr",
    "hr_specialist",
    "hr_manager",
    "employee",
    "deputy_chief_doctor",
    "department_head",
    "registrar",
    "doctor",
    "nurse"
  ];
  const results = {};

  try {
    for (const role of rolesToTest) {
      const login = "test_role_" + role + "_" + Math.floor(Math.random() * 100000);
      const dummyUser = {
        organization_id: "00000000-0000-0000-0000-000000000000",
        city: "TestCity",
        bin: "123456789012",
        full_name: "Test User",
        phone: "123456",
        email: "test@test.com",
        role: role,
        login: login,
        password_hash: "hash",
        must_change_password: true,
        status: "active"
      };

      const { error } = await supabase
        .from("organization_users")
        .insert(dummyUser);

      if (error) {
        results[role] = { success: false, code: error.code, message: error.message };
      } else {
        results[role] = { success: true };
        // Clean up
        await supabase.from("organization_users").delete().eq("login", login);
      }
    }
    res.status(200).json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.get("/api/debug-constraint-rpc", async (req, res) => {
  try {
    const { data: constraints, error: constError } = await supabase
      .rpc('get_constraint_definition', { t_name: 'organization_users', c_name: 'organization_users_role_check' });
    
    res.status(200).json({ success: true, constraints, error: constError });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/admin-dashboard", adminDashboardRoutes);
app.use("/api/organization-applications", organizationApplicationRoutes);
app.use("/api/admin-channels", adminChannelsRoutes);
app.use("/api/audit-logs", auditLogsRoutes);
app.use("/api/organizations", organizationsRoutes);
app.use("/api/organization-structure", organizationStructureRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Маршрут не найден.",
    path: req.originalUrl,
  });
});

app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);

  res.status(500).json({
    success: false,
    message: error.message || "Внутренняя ошибка сервера.",
  });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});