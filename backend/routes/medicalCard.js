import express from "express";

import {
  getDoctorPatients,
  getMedicalCard,
  updateOwnMedicalProfile,
  updateMedicalProfile,
  saveCurrentVisit,
} from "../controllers/medicalCardController.js";

import {
  authenticateToken,
} from "../middleware/auth.js";

const router = express.Router();

/*
 * Все маршруты медицинской карты
 * требуют авторизации.
 */
router.use(authenticateToken);

/*
 * Врач получает список пациентов,
 * которые ранее записывались к нему.
 *
 * GET /api/medical-card/doctor/patients
 */
router.get(
  "/doctor/patients",
  getDoctorPatients
);

/*
 * Пациент получает собственную
 * медицинскую карту.
 *
 * GET /api/medical-card
 */
router.get(
  "/",
  getMedicalCard
);

/*
 * Пациент создаёт или обновляет
 * собственные общие медицинские данные.
 *
 * PATCH /api/medical-card/profile
 */
router.patch(
  "/profile",
  updateOwnMedicalProfile
);

/*
 * Врач получает медицинскую карту
 * выбранного пациента.
 *
 * GET /api/medical-card/:patientId
 */
router.get(
  "/:patientId",
  getMedicalCard
);

/*
 * Врач обновляет общие сведения
 * медицинской карты пациента.
 *
 * Доступ разрешён только во время
 * активного медицинского приёма.
 *
 * PATCH /api/medical-card/:patientId/profile
 */
router.patch(
  "/:patientId/profile",
  updateMedicalProfile
);

/*
 * Врач сохраняет данные текущего приёма:
 * жалобы, симптомы, результаты осмотра,
 * диагноз, лечение и рекомендации.
 *
 * PUT /api/medical-card/:patientId/visits/:appointmentId
 */
router.put(
  "/:patientId/visits/:appointmentId",
  saveCurrentVisit
);

export default router;