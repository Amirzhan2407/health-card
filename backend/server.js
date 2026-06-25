
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import { errorHandler } from "./utils/errorHandler.js";
import { validateEnv } from "./config/env.js";

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
import notificationsRouter from "./routes/notifications.js";


import { autoCompleteExpiredAppointments,} from "./services/appointmentService.js";

dotenv.config();
validateEnv();

const app = express();

function normalizeOrigin(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

if (process.env.FRONTEND_URL) {
  const frontendOrigin = normalizeOrigin(
    process.env.FRONTEND_URL
  );

  if (frontendOrigin) {
    allowedOrigins.add(frontendOrigin);
  }
}

if (process.env.FRONTEND_URLS) {
  const additionalOrigins = String(
    process.env.FRONTEND_URLS
  ).split(",");

  for (const origin of additionalOrigins) {
    const normalizedOrigin =
      normalizeOrigin(origin);

    if (normalizedOrigin) {
      allowedOrigins.add(normalizedOrigin);
    }
  }
}

const corsOptions = {
  origin(origin, callback) {
    // Разрешаем запросы без Origin:
    // Postman, серверные задачи и локальные проверки.
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin =
      normalizeOrigin(origin);

    if (allowedOrigins.has(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    const error = new Error(
      `Источник ${normalizedOrigin} не разрешён политикой CORS.`
    );

    error.statusCode = 403;
    callback(error);
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-organization-id",
  ],
};

/*
 * Глобальный CORS сам обрабатывает OPTIONS-запросы.
 * app.options("*", ...) здесь использовать нельзя,
 * поскольку Express 5 не поддерживает такой wildcard.
 */
app.use(cors(corsOptions));

app.use(cookieParser());

app.use(
  express.json({
    limit: "15mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "15mb",
  })
);

/*
 * Авторизация.
 */
app.use("/api/auth", authRouter);

/*
 * Организации и сотрудники.
 */
app.use(
  "/api/organizations",
  organizationsRouter
);

app.use(
  "/api/applications",
  applicationsRouter
);

app.use("/api/members", membersRouter);
app.use("/api/doctors", doctorsRouter);

app.use(
  "/api/specialties",
  specialtiesRouter
);

app.use(
  "/api/departments",
  departmentsRouter
);

app.use("/api/rooms", roomsRouter);

/*
 * Основной адрес расписания:
 *
 * GET  /api/schedule/standard
 * POST /api/schedule/standard
 * GET  /api/schedule/slots
 * POST /api/schedule/exception
 * POST /api/schedule/absence
 */
app.use("/api/schedule", scheduleRouter);

/*
 * Совместимый адрес для страниц,
 * которые используют множественное число.
 */
app.use("/api/schedules", scheduleRouter);

/*
 * Записи и медицинские данные.
 */
app.use(
  "/api/appointments",
  appointmentRouter
);

app.use("/api/visits", visitsRouter);

app.use(
  "/api/certificates",
  certificatesRouter
);

app.use(
  "/api/health-metrics",
  healthMetricsRouter
);

app.use(
  "/api/medical-documents",
  medicalDocumentsRouter
);

app.use(
  "/api/medical-card",
  medicalCardRouter
);

app.use(
  "/api/transfers",
  transfersRouter
);

/*
 * Поддержка и фоновые задачи.
 */
app.use("/api/support", supportRouter);
app.use("/api/jobs", jobsRouter);

/*
 * Дополнительные сервисы.
 */
app.use("/api/ai", aiRouter);


app.use(
  "/api/notifications",
  notificationsRouter
);

/*
 * Проверка работоспособности backend.
 */
app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Clinic OS API работает.",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "Clinic OS API Backend is running",
  });
});

/*
 * Обработка неизвестных API-маршрутов.
 */
app.use("/api", (req, res) => {
  return res.status(404).json({
    success: false,
    message:
      `API-маршрут не найден: ` +
      `${req.method} ${req.originalUrl}`,
  });
});

/*
 * Обработчик ошибок подключается последним.
 */
app.use(errorHandler);

const PORT = Number(
  process.env.PORT || 10000
);

const AUTO_COMPLETE_INTERVAL_MS =
  60 * 1000;

async function runAutoCompleteAppointments() {
  try {
    const completedCount =
      await autoCompleteExpiredAppointments();

    if (completedCount > 0) {
      console.log(
        `[Clinic OS] Автоматически завершено приёмов: ${completedCount}`
      );
    }
  } catch (error) {
    console.error(
      "[Clinic OS] Ошибка автоматического завершения приёмов:",
      error?.message || error
    );
  }
}

/*
 * Проверяем сразу после запуска backend.
 */
runAutoCompleteAppointments();

/*
 * Затем проверяем каждую минуту.
 */
const autoCompleteTimer =
  setInterval(
    runAutoCompleteAppointments,
    AUTO_COMPLETE_INTERVAL_MS
  );

/*
 * Таймер не должен мешать корректному
 * завершению Node.js процесса.
 */
if (
  typeof autoCompleteTimer.unref ===
  "function"
) {
  autoCompleteTimer.unref();
}


app.listen(PORT, () => {
  console.log(
    `Сервер Clinic OS запущен на порту ${PORT}`
  );

  console.log(
    `Проверка API: http://localhost:${PORT}/api/health`
  );

  console.log(
    `Расписание: http://localhost:${PORT}/api/schedule`
  );

  console.log(
    `Совместимый адрес: http://localhost:${PORT}/api/schedules`
  );
});

export default app;
