import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import pharmacyRoutes from "./routes/pharmacy.js";
import aiRoutes from "./routes/ai.js";
import adminRoutes from "./routes/admin.js";
import organizationApplicationRoutes from "./routes/organizationApplications.js";

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
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "clinisOS backend is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is healthy",
  });
});

app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/organization-applications", organizationApplicationRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Маршрут не найден.",
  });
});

app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Внутренняя ошибка сервера.",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});