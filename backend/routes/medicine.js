import express from "express";
import { searchDrugs } from "../controllers/medicineController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/search", authenticateToken, searchDrugs);

export default router;
