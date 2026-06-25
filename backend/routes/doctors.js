
import express from "express";

import {
  getDoctors,
  getDoctor,
  addDoctor,
  updateDoctorDetails,
  removeDoctor,
  restoreDoctor,
  deleteDoctorPermanently,
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

const organizationAdminOnly = [
  authenticateToken,
  requireRoles(["organization_admin"]),
];

/*
 * Просмотр списка врачей.
 */
router.get(
  "/",
  authenticateToken,
  getDoctors
);

/*
 * Просмотр одного врача.
 */
router.get(
  "/:id",
  authenticateToken,
  getDoctor
);

/*
 * Создание карточки врача.
 * Логин и пароль при создании не выдаются.
 */
router.post(
  "/",
  ...organizationAdminOnly,
  validateDoctorCreate,
  addDoctor
);

/*
 * Редактирование специальности,
 * кабинета и статуса врача.
 */
router.put(
  "/:id",
  ...organizationAdminOnly,
  validateDoctorUpdate,
  updateDoctorDetails
);

/*
 * Выдача логина и временного пароля.
 */
router.post(
  "/:id/access",
  ...organizationAdminOnly,
  grantDoctorAccess
);

/*
 * Создание нового временного пароля.
 */
router.post(
  "/:id/access/reset-password",
  ...organizationAdminOnly,
  resetDoctorPassword
);

/*
 * Блокировка входа врача.
 */
router.patch(
  "/:id/access/block",
  ...organizationAdminOnly,
  blockDoctorAccess
);

/*
 * Разблокировка входа действующего врача.
 */
router.patch(
  "/:id/access/unblock",
  ...organizationAdminOnly,
  unblockDoctorAccess
);

/*
 * Восстановление врача из архива.
 */
router.patch(
  "/:id/restore",
  ...organizationAdminOnly,
  restoreDoctor
);

/*
 * Архивирование врача.
 */
router.delete(
  "/:id",
  ...organizationAdminOnly,
  removeDoctor
);

/*
 * Полное удаление врача из базы.
 *
 * Разрешено только для архивного врача,
 * у которого отсутствуют записи и история приёмов.
 */
router.delete(
  "/:id/permanent",
  ...organizationAdminOnly,
  deleteDoctorPermanently
);

export default router;

