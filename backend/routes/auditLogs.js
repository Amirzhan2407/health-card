import express from "express";
import { requireAdminAuth } from "../middleware/requireAdminAuth.js";
import { getAuditLogs } from "../services/adminAuditService.js";

const router = express.Router();

router.get("/", requireAdminAuth, async (req, res) => {
  const result = await getAuditLogs({ admin: req.admin });

  return res.status(result.status || 200).json(result);
});

export default router;