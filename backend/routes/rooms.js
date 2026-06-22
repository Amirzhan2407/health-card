import express from "express";
import {
  getRooms,
  addRoom,
  editRoom,
  removeRoom,
} from "../controllers/roomController.js";
import { authenticateToken, requireRoles } from "../middleware/auth.js";
import { validateRoomCreate, validateRoomUpdate } from "../validators/roomValidators.js";

const router = express.Router();

router.get("/", authenticateToken, getRooms);

// Only organization admin can manage rooms
router.post("/", authenticateToken, requireRoles(["organization_admin"]), validateRoomCreate, addRoom);
router.put("/:id", authenticateToken, requireRoles(["organization_admin"]), validateRoomUpdate, editRoom);
router.delete("/:id", authenticateToken, requireRoles(["organization_admin"]), removeRoom);

export default router;
