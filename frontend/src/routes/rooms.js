
import express from "express";

import {
  getRooms,
  addRoom,
  editRoom,
  removeRoom,
} from "../controllers/roomController.js";

import {
  authenticateToken,
  requireRoles,
} from "../middleware/auth.js";

const router = express.Router();

// Получение кабинетов.
// Администратор и врач получают кабинеты своей организации.
// Пациент может передать organizationId и departmentId.
router.get(
  "/",
  authenticateToken,
  getRooms
);

// Создание кабинета
router.post(
  "/",
  authenticateToken,
  requireRoles(["organization_admin"]),
  addRoom
);

// Редактирование кабинета
router.put(
  "/:id",
  authenticateToken,
  requireRoles(["organization_admin"]),
  editRoom
);

// Удаление кабинета
router.delete(
  "/:id",
  authenticateToken,
  requireRoles(["organization_admin"]),
  removeRoom
);

export default router;

