export function validateSpecialtyCreate(req, res, next) {
  const { nameRu } = req.body;
  if (!nameRu || nameRu.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Название специальности на русском обязательно.",
    });
  }
  next();
}
