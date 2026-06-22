import * as medicineService from "../services/medicineService.js";

export async function searchDrugs(req, res, next) {
  try {
    const { q, city } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Параметр поиска q обязателен.",
      });
    }

    const results = await medicineService.searchMedicine(q, city);
    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
}
