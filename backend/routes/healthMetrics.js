import express from "express";
import {
  getMetrics,
  addMetric,
} from "../controllers/healthMetricsController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", getMetrics);
router.post("/", addMetric);

export default router;
