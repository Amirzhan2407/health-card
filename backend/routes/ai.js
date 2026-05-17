import express from "express";
import { askGemini } from "../services/geminiService.js";

const router = express.Router();

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        answer: "Сообщение пустое",
      });
    }

    const answer = await askGemini(message);

    res.json({ answer });
  } catch (error) {
    console.error("AI ERROR:", error.response?.data || error.message);

    res.status(500).json({
      answer: "Ошибка сервера ИИ",
    });
  }
});

export default router;