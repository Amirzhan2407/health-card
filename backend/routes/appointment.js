import express from "express";
import {
  bookAppointment,
  confirmPatientAppointment,
  cancelAppointment,
  getAppointments,
  getAppointmentDetails,
  requestStartCode,
  startAppointmentSession,
  requestFinishCode,
  finishAppointmentSession,
  setAppointmentNoShow,
} from "../controllers/appointmentController.js";
import { authenticateToken, requireRoles } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateToken);

// Booking list and details
router.get("/", getAppointments);
router.get("/:id", getAppointmentDetails);

// Patient booking flow
router.post("/", requireRoles(["patient"]), bookAppointment);
router.post("/:id/confirm", requireRoles(["patient"]), confirmPatientAppointment);
router.post("/:id/cancel", cancelAppointment);

// Doctor check-in & verification codes flow
router.post("/:id/request-start", requireRoles(["doctor"]), requestStartCode);
router.post("/:id/start", requireRoles(["doctor"]), startAppointmentSession);
router.post("/:id/request-finish", requireRoles(["doctor"]), requestFinishCode);
router.post("/:id/finish", requireRoles(["doctor"]), finishAppointmentSession);
router.post("/:id/no-show", requireRoles(["doctor"]), setAppointmentNoShow);

export default router;
