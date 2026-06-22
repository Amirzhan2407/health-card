export function validateAppCreate(req, res, next) {
  const { organizationName, bin, city, contactEmail, contactPhone, adminName } = req.body;
  if (!organizationName || !bin || !city || !contactEmail || !contactPhone || !adminName) {
    return res.status(400).json({
      success: false,
      message: "Все поля заявки обязательны для заполнения.",
    });
  }

  if (bin.length !== 12 || !/^\d+$/.test(bin)) {
    return res.status(400).json({
      success: false,
      message: "БИН организации должен содержать ровно 12 цифр.",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(contactEmail)) {
    return res.status(400).json({
      success: false,
      message: "Неверный формат контактного email.",
    });
  }

  next();
}

export function validateAppReject(req, res, next) {
  const { reason } = req.body;
  if (!reason || reason.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Необходимо указать причину отказа.",
    });
  }
  next();
}
