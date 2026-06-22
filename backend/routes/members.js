import express from "express";
import {
  getMembers,
  inviteMember,
  changeMemberStatus,
  removeMember,
} from "../controllers/memberController.js";
import { authenticateToken, requireRoles } from "../middleware/auth.js";
import { validateMemberAdd, validateMemberStatus } from "../validators/memberValidators.js";

const router = express.Router();

// Only organization admin manages members of their organization
router.use(authenticateToken, requireRoles(["organization_admin"]));

router.get("/", getMembers);
router.post("/", validateMemberAdd, inviteMember);
router.patch("/:id/status", validateMemberStatus, changeMemberStatus);
router.delete("/:id", removeMember);

export default router;
