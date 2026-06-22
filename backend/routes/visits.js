import express from "express";
import {
  getVisits,
  getVisitDetails,
  updateVisit,
} from "../controllers/visitsController.js";
import { authenticateToken, requireRoles } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", getVisits);
router.get("/:id", getVisitDetails);
router.put("/:id", requireRoles(["doctor"]), updateVisit);

export default router;
