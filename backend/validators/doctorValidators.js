export function validateDoctorCreate(req, res, next) {
  const { iin, fullName, email, phone, password, specialtyId, roomId } = req.body;
  if (!iin || !fullName || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "ИИН, ФИО, Email и пароль обязательны.",
    });
  }

  if (iin.length !== 12 || !/^\d+$/.test(iin)) {
    return res.status(400).json({
      success: false,
      message: "ИИН должен содержать ровно 12 цифр.",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Пароль должен содержать минимум 8 символов.",
    });
  }

  next();
}

export function validateDoctorUpdate(req, res, next) {
  const { specialtyId, roomId, status } = req.body;
  if (status && !["active", "archived"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Недопустимый статус врача. Разрешено: active, archived.",
    });
  }
  next();
}
