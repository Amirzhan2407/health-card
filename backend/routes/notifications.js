import express from "express";
import { supabase } from "../config/supabaseClient.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateToken);

// Get notifications for current user
router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.patch("/:id/read", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("profile_id", req.user.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
