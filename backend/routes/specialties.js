import express from "express";
import {
  getSpecialties,
  addSpecialty,
  editSpecialty,
} from "../controllers/specialtyController.js";
import { authenticateToken, requireRoles } from "../middleware/auth.js";
import { validateSpecialtyCreate } from "../validators/specialtyValidators.js";

const router = express.Router();

router.get("/", authenticateToken, getSpecialties);

// Only technical support can create/edit global specialties list
router.post("/", authenticateToken, requireRoles(["support"]), validateSpecialtyCreate, addSpecialty);
router.put("/:id", authenticateToken, requireRoles(["support"]), validateSpecialtyCreate, editSpecialty);

export default router;
