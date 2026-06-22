import express from "express";
import {
  submitApplication,
  getApplications,
  approveApp,
  rejectApp,
} from "../controllers/appController.js";
import { authenticateToken, requireRoles } from "../middleware/auth.js";
import { validateAppCreate, validateAppReject } from "../validators/appValidators.js";

const router = express.Router();

// Public endpoint to submit application
router.post("/", validateAppCreate, submitApplication);

// Technical support routes to manage applications
router.get("/", authenticateToken, requireRoles(["support"]), getApplications);
router.post("/:id/approve", authenticateToken, requireRoles(["support"]), approveApp);
router.post("/:id/reject", authenticateToken, requireRoles(["support"]), validateAppReject, rejectApp);

export default router;
