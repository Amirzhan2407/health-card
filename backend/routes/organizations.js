import express from "express";
import {
  getOrganizations,
  getOrganization,
  updateOrg,
  changeOrgStatus,
} from "../controllers/orgController.js";
import { authenticateToken, requireRoles, requireOrganizationBoundary } from "../middleware/auth.js";
import { validateOrgUpdate, validateBlockOrg } from "../validators/orgValidators.js";

const router = express.Router();

// Support only lists all organizations
router.get("/", authenticateToken, requireRoles(["support"]), getOrganizations);

// Patients & other users can list active organizations
router.get("/active/list", authenticateToken, getOrganizations);

// Any authenticated user can view details of an organization
router.get("/:id", authenticateToken, getOrganization);

// Update organization details
router.put(
  "/:id",
  authenticateToken,
  requireRoles(["organization_admin", "support"]),
  requireOrganizationBoundary,
  validateOrgUpdate,
  updateOrg
);

// Block/Unblock organization (Support only)
router.patch(
  "/:id/status",
  authenticateToken,
  requireRoles(["support"]),
  validateBlockOrg,
  changeOrgStatus
);

export default router;
