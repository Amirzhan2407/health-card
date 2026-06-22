  
import express from "express";

import {
  getOrganizations,
  getOrganization,
  updateOrg,
  changeOrgStatus,
  deleteOrg,
} from "../controllers/orgController.js";

import {
  authenticateToken,
  requireRoles,
  requireOrganizationBoundary,
} from "../middleware/auth.js";

import {
  validateOrgUpdate,
  validateBlockOrg,
} from "../validators/orgValidators.js";

const router = express.Router();

// Техподдержка получает все организации
router.get(
  "/",
  authenticateToken,
  requireRoles(["support"]),
  getOrganizations
);

// Пользователи получают активные организации
router.get(
  "/active/list",
  authenticateToken,
  getOrganizations
);

// Просмотр организации
router.get(
  "/:id",
  authenticateToken,
  getOrganization
);

// Изменение организации
router.put(
  "/:id",
  authenticateToken,
  requireRoles([
    "organization_admin",
    "support",
  ]),
  requireOrganizationBoundary,
  validateOrgUpdate,
  updateOrg
);

// Блокировка и разблокировка
router.patch(
  "/:id/status",
  authenticateToken,
  requireRoles(["support"]),
  validateBlockOrg,
  changeOrgStatus
);

// Полное удаление организации техподдержкой
router.delete(
  "/:id",
  authenticateToken,
  requireRoles(["support"]),
  deleteOrg
);

export default router;

