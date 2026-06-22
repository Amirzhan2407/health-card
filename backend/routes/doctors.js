import express from "express";
import {
  getDoctors,
  getDoctor,
  addDoctor,
  updateDoctorDetails,
  removeDoctor,
} from "../controllers/doctorController.js";
import { authenticateToken, requireRoles } from "../middleware/auth.js";
import { validateDoctorCreate, validateDoctorUpdate } from "../validators/doctorValidators.js";

const router = express.Router();

// Any logged-in user can view lists or detail views
router.get("/", authenticateToken, getDoctors);
router.get("/:id", authenticateToken, getDoctor);

// Only organization admin can manage doctors
router.post("/", authenticateToken, requireRoles(["organization_admin"]), validateDoctorCreate, addDoctor);
router.put("/:id", authenticateToken, requireRoles(["organization_admin"]), validateDoctorUpdate, updateDoctorDetails);
router.delete("/:id", authenticateToken, requireRoles(["organization_admin"]), removeDoctor);

export default router;
