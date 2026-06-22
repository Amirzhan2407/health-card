import express from "express";
import {
  proposeAppointmentTransfer,
  acceptAppointmentTransfer,
  declineAppointmentTransfer,
  getTransfers,
} from "../controllers/transferController.js";
import { authenticateToken, requireRoles } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", getTransfers);
router.post("/propose", requireRoles(["organization_admin"]), proposeAppointmentTransfer);
router.post("/:id/confirm", requireRoles(["patient"]), acceptAppointmentTransfer);
router.post("/:id/decline", requireRoles(["patient"]), declineAppointmentTransfer);

export default router;
