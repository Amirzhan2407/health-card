import express from "express";
import { askGemini } from "../services/geminiService.js";

const router = express.Router();

router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        answer: "История сообщений пустая",
      });
    }

    const answer = await askGemini(messages);

    res.json({ answer });
  } catch (error) {
    console.error("AI ERROR:", error.response?.data || error.message);

    res.status(500).json({
      answer: "Ошибка сервера ИИ",
    });
  }
});

export default router;