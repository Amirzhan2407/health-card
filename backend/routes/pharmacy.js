import express from "express";
import { searchMedicine } from "../services/itekaParser.js";

const router = express.Router();

router.get("/search", async (req, res) => {
  try {
    const { medicine, city } = req.query;

    if (!medicine || !city) {
      return res.status(400).json({
        error: "medicine and city required",
      });
    }

    const data = await searchMedicine(medicine, city);

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Server error",
    });
  }
});

export default router;