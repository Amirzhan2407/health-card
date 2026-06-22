
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value) {
  return String(value ?? "").trim();
}

function isValidUuid(value) {
  return UUID_PATTERN.test(clean(value));
}

export function validateDoctorCreate(
  req,
  res,
  next
) {
  const iin = clean(req.body?.iin);
  const fullName = clean(
    req.body?.fullName
  );
  const email = clean(req.body?.email);
  const phone = clean(req.body?.phone);

  const specialtyId = clean(
    req.body?.specialtyId
  );

  const roomId = clean(
    req.body?.roomId
  );

  if (!iin || !fullName || !email) {
    return res.status(400).json({
      success: false,
      message:
        "ИИН, ФИО и электронная почта обязательны.",
    });
  }

  if (!/^\d{12}$/.test(iin)) {
    return res.status(400).json({
      success: false,
      message:
        "ИИН должен содержать ровно 12 цифр.",
    });
  }

  if (fullName.length < 3) {
    return res.status(400).json({
      success: false,
      message:
        "ФИО должно содержать не менее 3 символов.",
    });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({
      success: false,
      message:
        "Укажите корректную электронную почту.",
    });
  }

  if (
    phone &&
    !/^[+\d\s()-]{7,20}$/.test(phone)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Укажите корректный номер телефона.",
    });
  }

  if (
    specialtyId &&
    !isValidUuid(specialtyId)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Некорректный идентификатор специальности.",
    });
  }

  if (roomId && !isValidUuid(roomId)) {
    return res.status(400).json({
      success: false,
      message:
        "Некорректный идентификатор кабинета.",
    });
  }

  req.body = {
    ...req.body,
    iin,
    fullName,
    email,
    phone: phone || null,
    specialtyId:
      specialtyId || null,
    roomId: roomId || null,
  };

  // Пароль здесь больше не принимается.
  delete req.body.password;

  next();
}

export function validateDoctorUpdate(
  req,
  res,
  next
) {
  const {
    specialtyId,
    roomId,
    status,
  } = req.body || {};

  if (
    specialtyId !== undefined &&
    specialtyId !== null &&
    specialtyId !== "" &&
    !isValidUuid(specialtyId)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Некорректный идентификатор специальности.",
    });
  }

  if (
    roomId !== undefined &&
    roomId !== null &&
    roomId !== "" &&
    !isValidUuid(roomId)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Некорректный идентификатор кабинета.",
    });
  }

  if (
    status !== undefined &&
    !["active", "archived"].includes(
      status
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Недопустимый статус врача. Разрешено: active, archived.",
    });
  }

  next();
}

