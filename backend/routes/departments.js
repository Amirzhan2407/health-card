
import express from "express";

import {
  getDepartments,
  addDepartment,
  editDepartment,
  removeDepartment,
} from "../controllers/departmentController.js";

import {
  authenticateToken,
  requireRoles,
} from "../middleware/auth.js";

import {
  validateDepartmentCreate,
} from "../validators/departmentValidators.js";

const router = express.Router();

// Получение отделений своей организации
router.get(
  "/",
  authenticateToken,
  getDepartments
);

// Создание отделения
router.post(
  "/",
  authenticateToken,
  requireRoles(["organization_admin"]),
  validateDepartmentCreate,
  addDepartment
);

// Редактирование отделения
router.put(
  "/:id",
  authenticateToken,
  requireRoles(["organization_admin"]),
  validateDepartmentCreate,
  editDepartment
);

// Удаление отделения
router.delete(
  "/:id",
  authenticateToken,
  requireRoles(["organization_admin"]),
  removeDepartment
);

export default router;

