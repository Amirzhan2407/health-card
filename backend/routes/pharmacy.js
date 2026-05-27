import express from "express";
import { searchMedicine } from "../services/itekaParser.js";

const router = express.Router();

router.get("/search", async (req, res) => {
  try {
    const { medicine, city, priority } = req.query;

    if (!medicine || !city) {
      return res.status(400).json({
        success: false,
        error: "medicine and city required",
      });
    }

    const data = await searchMedicine(
      medicine,
      city,
      priority || "price"
    );

    res.json(data);
  } catch (error) {
    console.error("PHARMACY ROUTE ERROR:", error.message);

    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

export default router;