
import express from "express";

import {
  getDoctors,
  getDoctor,
  addDoctor,
  updateDoctorDetails,
  removeDoctor,
  grantDoctorAccess,
  resetDoctorPassword,
  blockDoctorAccess,
  unblockDoctorAccess,
} from "../controllers/doctorController.js";

import {
  authenticateToken,
  requireRoles,
} from "../middleware/auth.js";

import {
  validateDoctorCreate,
  validateDoctorUpdate,
} from "../validators/doctorValidators.js";

const router = express.Router();

// Просмотр врачей
router.get(
  "/",
  authenticateToken,
  getDoctors
);

router.get(
  "/:id",
  authenticateToken,
  getDoctor
);

// Создание карточки врача
router.post(
  "/",
  authenticateToken,
  requireRoles(["organization_admin"]),
  validateDoctorCreate,
  addDoctor
);

// Редактирование данных врача
router.put(
  "/:id",
  authenticateToken,
  requireRoles(["organization_admin"]),
  validateDoctorUpdate,
  updateDoctorDetails
);

// Выдача логина и временного пароля
router.post(
  "/:id/access",
  authenticateToken,
  requireRoles(["organization_admin"]),
  grantDoctorAccess
);

// Создание нового временного пароля
router.post(
  "/:id/access/reset-password",
  authenticateToken,
  requireRoles(["organization_admin"]),
  resetDoctorPassword
);

// Блокировка входа врача
router.patch(
  "/:id/access/block",
  authenticateToken,
  requireRoles(["organization_admin"]),
  blockDoctorAccess
);

// Разблокировка входа врача
router.patch(
  "/:id/access/unblock",
  authenticateToken,
  requireRoles(["organization_admin"]),
  unblockDoctorAccess
);

// Архивирование врача
router.delete(
  "/:id",
  authenticateToken,
  requireRoles(["organization_admin"]),
  removeDoctor
);

export default router;

