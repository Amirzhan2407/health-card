import express from "express";
import {
  getCertificates,
  createCertificate,
} from "../controllers/certificatesController.js";
import { authenticateToken, requireRoles } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", getCertificates);
router.post("/", requireRoles(["doctor"]), createCertificate);

export default router;
