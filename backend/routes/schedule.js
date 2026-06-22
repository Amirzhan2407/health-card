
import express from "express";

import {
  getAvailableSlots,
  getStandardSchedule,
  saveStandardSchedule,
  saveScheduleException,
  saveDoctorAbsence,
} from "../controllers/scheduleController.js";

import {
  authenticateToken,
  requireRoles,
} from "../middleware/auth.js";

const router = express.Router();

// Получение свободных и занятых интервалов врача
router.get(
  "/slots",
  authenticateToken,
  getAvailableSlots
);

// Получение сохранённого недельного графика
router.get(
  "/standard",
  authenticateToken,
  requireRoles([
    "organization_admin",
    "doctor",
  ]),
  getStandardSchedule
);

// Создание или обновление недельного графика
router.post(
  "/standard",
  authenticateToken,
  requireRoles(["organization_admin"]),
  saveStandardSchedule
);

// Временное изменение графика на конкретную дату
router.post(
  "/exception",
  authenticateToken,
  requireRoles(["organization_admin"]),
  saveScheduleException
);

// Плановое или экстренное отсутствие врача
router.post(
  "/absence",
  authenticateToken,
  requireRoles([
    "organization_admin",
    "doctor",
  ]),
  saveDoctorAbsence
);

export default router;

