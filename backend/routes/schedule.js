import express from "express";
import {
  getAvailableSlots,
  saveStandardSchedule,
  saveScheduleException,
  saveDoctorAbsence,
} from "../controllers/scheduleController.js";
import { authenticateToken, requireRoles } from "../middleware/auth.js";

const router = express.Router();

// Any authenticated user can view available slots
router.get("/slots", authenticateToken, getAvailableSlots);

// Standard schedule and exceptions (Org Admin only)
router.post("/standard", authenticateToken, requireRoles(["organization_admin"]), saveStandardSchedule);
router.post("/exception", authenticateToken, requireRoles(["organization_admin"]), saveScheduleException);

// Absences (Org Admin or Doctor)
router.post("/absence", authenticateToken, requireRoles(["organization_admin", "doctor"]), saveDoctorAbsence);

export default router;
