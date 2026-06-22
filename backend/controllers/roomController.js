import * as roomService from "../services/roomService.js";

export async function getRooms(req, res, next) {
  try {
    const { departmentId } = req.query;
    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: "Необходимо указать departmentId в запросе.",
      });
    }

    const rooms = await roomService.listRooms(departmentId);
    return res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
}

export async function addRoom(req, res, next) {
  try {
    const { departmentId, number, name } = req.body;
    const room = await roomService.createRoom(departmentId, number, name);
    return res.status(201).json({
      success: true,
      message: "Кабинет успешно создан.",
      data: room,
    });
  } catch (error) {
    next(error);
  }
}

export async function editRoom(req, res, next) {
  try {
    const { id } = req.params;
    const { number, name } = req.body;
    const room = await roomService.updateRoom(id, number, name);
    return res.status(200).json({
      success: true,
      message: "Кабинет успешно обновлен.",
      data: room,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeRoom(req, res, next) {
  try {
    const { id } = req.params;
    await roomService.deleteRoom(id);
    return res.status(200).json({
      success: true,
      message: "Кабинет успешно удален.",
    });
  } catch (error) {
    next(error);
  }
}
