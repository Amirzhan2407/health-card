export function validateMemberAdd(req, res, next) {
  const { profileId, role } = req.body;
  if (!profileId || !role) {
    return res.status(400).json({
      success: false,
      message: "profileId и role обязательны.",
    });
  }
  if (!["doctor", "organization_admin"].includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Недопустимая роль сотрудника. Разрешено: doctor, organization_admin.",
    });
  }
  next();
}

export function validateMemberStatus(req, res, next) {
  const { status } = req.body;
  if (!status || !["active", "blocked", "archived"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Недопустимый статус сотрудника. Разрешено: active, blocked, archived.",
    });
  }
  next();
}
