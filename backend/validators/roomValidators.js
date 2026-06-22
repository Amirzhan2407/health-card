export function validateRoomCreate(req, res, next) {
  const { departmentId, number } = req.body;
  if (!departmentId || !number) {
    return res.status(400).json({
      success: false,
      message: "departmentId и номер кабинета обязательны.",
    });
  }
  next();
}

export function validateRoomUpdate(req, res, next) {
  const { number } = req.body;
  if (number !== undefined && String(number).trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Номер кабинета не может быть пустым.",
    });
  }
  next();
}
