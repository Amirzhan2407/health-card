import * as aiService from "../services/aiService.js";
import { supabase } from "../config/supabaseClient.js";

export async function consultAdvisor(req, res, next) {
  try {
    const { message, mode } = req.body;
    const patientId = req.user.id;

    if (!message || message.trim() === "") {
      return res.status(400).json({ success: false, message: "Сообщение не может быть пустым." });
    }

    const reply = await aiService.askAdvisor(patientId, message, mode || "medical");
    return res.status(200).json({ success: true, reply });
  } catch (error) {
    next(error);
  }
}

export async function getAiHistory(req, res, next) {
  try {
    const patientId = req.user.id;
    const { mode } = req.query;

    const { data: history, error } = await supabase
      .from("ai_history")
      .select("*")
      .eq("patient_id", patientId)
      .eq("mode", mode || "medical")
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    return res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
}
