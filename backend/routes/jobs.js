import express from "express";
import { runReminderJob } from "../controllers/schedulerController.js";

const router = express.Router();

// Cron job executes this endpoint periodically (Render Cron Job)
router.get("/reminders", runReminderJob);
router.post("/reminders", runReminderJob);

export default router;
