import express from "express";
import { getMedicalCard } from "../controllers/medicalCardController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateToken);

// Doctor or patient gets full medical card
router.get("/", getMedicalCard);
router.get("/:patientId", getMedicalCard);

export default router;
