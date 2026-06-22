export function validateOrgUpdate(req, res, next) {
  const { name, city, address } = req.body;
  if (!name || !city) {
    return res.status(400).json({
      success: false,
      message: "Название организации и город обязательны.",
    });
  }
  next();
}

export function validateBlockOrg(req, res, next) {
  const { status } = req.body;
  if (!status || !["active", "blocked"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Недопустимый статус организации. Разрешено: active, blocked.",
    });
  }
  next();
}
