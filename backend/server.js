import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { errorHandler } from "./utils/errorHandler.js";

dotenv.config();

const app = express();

const whitelist = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://health-card-rose.vercel.app",
];

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
