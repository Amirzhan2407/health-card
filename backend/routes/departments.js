import express from "express";
import {
  getDepartments,
  addDepartment,
  editDepartment,
  removeDepartment,
} from "../controllers/departmentController.js";
import { authenticateToken, requireRoles } from "../middleware/auth.js";
import { validateDepartmentCreate } from "../validators/departmentValidators.js";

const router = express.Router();

router.get("/", authenticateToken, getDepartments);

// Only organization admin can manage departments of their organization
router.post("/", authenticateToken, requireRoles(["organization_admin"]), validateDepartmentCreate, addDepartment);
router.put("/:id", authenticateToken, requireRoles(["organization_admin"]), validateDepartmentCreate, editDepartment);
router.delete("/:id", authenticateToken, requireRoles(["organization_admin"]), removeDepartment);

export default router;
