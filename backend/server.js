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
  res.status(200).json({
    success: true,
    version: "v2-roles-fix"
  });
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