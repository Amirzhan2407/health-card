import express from "express";
import {
  createTicket,
  getTickets,
  getTicketDetails,
  addTicketMessage,
  changeTicketStatus,
} from "../controllers/supportController.js";
import { authenticateToken, requireRoles } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateToken);

// Support tickets list & details
router.get("/conversations", getTickets);
router.post("/conversations", createTicket);
router.get("/conversations/:id", getTicketDetails);
router.post("/conversations/:id/messages", addTicketMessage);

// Change conversation status (Support only)
router.patch("/conversations/:id/status", requireRoles(["support"]), changeTicketStatus);

export default router;
