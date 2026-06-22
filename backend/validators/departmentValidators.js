export function validateDepartmentCreate(req, res, next) {
  const { name } = req.body;
  if (!name || name.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Название отделения обязательно.",
    });
  }
  next();
}
