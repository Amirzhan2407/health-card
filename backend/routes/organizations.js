
import express from "express";

import {
  getOrganizations,
  getActiveOrganizations,
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

/*
 * Техническая поддержка получает
 * полный список организаций.
 */
router.get(
  "/",
  authenticateToken,
  requireRoles(["support"]),
  getOrganizations
);

/*
 * Пациенты и другие авторизованные
 * пользователи получают только
 * активные медицинские организации.
 *
 * GET /api/organizations/active/list
 */
router.get(
  "/active/list",
  authenticateToken,
  getActiveOrganizations
);

/*
 * Просмотр одной организации.
 */
router.get(
  "/:id",
  authenticateToken,
  getOrganization
);

/*
 * Изменение данных организации.
 */
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

/*
 * Блокировка и разблокировка организации.
 */
router.patch(
  "/:id/status",
  authenticateToken,
  requireRoles(["support"]),
  validateBlockOrg,
  changeOrgStatus
);

/*
 * Полное удаление организации
 * технической поддержкой.
 */
router.delete(
  "/:id",
  authenticateToken,
  requireRoles(["support"]),
  deleteOrg
);

export default router;

