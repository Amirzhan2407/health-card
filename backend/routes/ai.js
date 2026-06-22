import express from "express";
import { consultAdvisor, getAiHistory } from "../controllers/aiController.js";
import { authenticateToken, requireRoles } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateToken, requireRoles(["patient"]));

router.post("/consult", consultAdvisor);
router.get("/history", getAiHistory);

export default router;
