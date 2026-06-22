import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { errorHandler } from "./utils/errorHandler.js";
import authRouter from "./routes/auth.js";
import organizationsRouter from "./routes/organizations.js";
import applicationsRouter from "./routes/applications.js";
import membersRouter from "./routes/members.js";
import doctorsRouter from "./routes/doctors.js";
import specialtiesRouter from "./routes/specialties.js";
import departmentsRouter from "./routes/departments.js";
import roomsRouter from "./routes/rooms.js";
import scheduleRouter from "./routes/schedule.js";
import appointmentRouter from "./routes/appointment.js";
import visitsRouter from "./routes/visits.js";
import certificatesRouter from "./routes/certificates.js";
import healthMetricsRouter from "./routes/healthMetrics.js";
import medicalDocumentsRouter from "./routes/medicalDocuments.js";
import medicalCardRouter from "./routes/medicalCard.js";
import transfersRouter from "./routes/transfers.js";
import supportRouter from "./routes/support.js";
import jobsRouter from "./routes/jobs.js";
import aiRouter from "./routes/ai.js";
import medicineRouter from "./routes/medicine.js";
import notificationsRouter from "./routes/notifications.js";

dotenv.config();

const app = express();


const whitelist = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://health-card-rose.vercel.app",
];
if (process.env.FRONTEND_URL) {
  whitelist.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Не разрешено политикой CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/organizations", organizationsRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/members", membersRouter);
app.use("/api/doctors", doctorsRouter);
app.use("/api/specialties", specialtiesRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/schedule", scheduleRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/visits", visitsRouter);
app.use("/api/certificates", certificatesRouter);
app.use("/api/health-metrics", healthMetricsRouter);
app.use("/api/medical-documents", medicalDocumentsRouter);
app.use("/api/medical-card", medicalCardRouter);
app.use("/api/transfers", transfersRouter);
app.use("/api/support", supportRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/medicine", medicineRouter);
app.use("/api/notifications", notificationsRouter);

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Clinic OS API is healthy",
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Clinic OS API Backend is running",
  });
});

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Сервер Clinic OS запущен на порту ${PORT}`);
});

export default app;
