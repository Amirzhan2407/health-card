
import * as roomService from "../services/roomService.js";

function getOrganizationId(req) {
  return String(
    req.user?.organization_id ||
      req.user?.organizationId ||
      ""
  ).trim();
}

export async function getRooms(req, res, next) {
  try {
    const role = String(
      req.user?.role || ""
    ).toLowerCase();

    let organizationId = getOrganizationId(req);

    if (role === "patient" || role === "support") {
      organizationId = String(
        req.query?.organizationId || ""
      ).trim();
    }

    const departmentId = String(
      req.query?.departmentId || ""
    ).trim();

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message:
          "Не указана медицинская организация.",
      });
    }

    const rooms = await roomService.listRooms(
      organizationId,
      departmentId || null
    );

    return res.status(200).json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    next(error);
  }
}

export async function addRoom(req, res, next) {
  try {
    const organizationId = getOrganizationId(req);

    const departmentId = String(
      req.body?.departmentId || ""
    ).trim();

    const number = String(
      req.body?.number || ""
    ).trim();

    const name = String(
      req.body?.name || ""
    ).trim();

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message:
          "Администратор не привязан к организации.",
      });
    }

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message:
          "Выберите отделение для кабинета.",
      });
    }

    if (!number) {
      return res.status(400).json({
        success: false,
        message:
          "Номер кабинета обязателен.",
      });
    }

    const room = await roomService.createRoom(
      organizationId,
      {
        departmentId,
        number,
        name,
      }
    );

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
    const organizationId = getOrganizationId(req);

    const roomId = String(
      req.params?.id || ""
    ).trim();

    const departmentId = String(
      req.body?.departmentId || ""
    ).trim();

    const number = String(
      req.body?.number || ""
    ).trim();

    const name = String(
      req.body?.name || ""
    ).trim();

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message:
          "Администратор не привязан к организации.",
      });
    }

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message:
          "Не указан идентификатор кабинета.",
      });
    }

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message:
          "Выберите отделение для кабинета.",
      });
    }

    if (!number) {
      return res.status(400).json({
        success: false,
        message:
          "Номер кабинета обязателен.",
      });
    }

    const room = await roomService.updateRoom(
      organizationId,
      roomId,
      {
        departmentId,
        number,
        name,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Кабинет успешно обновлён.",
      data: room,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeRoom(req, res, next) {
  try {
    const organizationId = getOrganizationId(req);

    const roomId = String(
      req.params?.id || ""
    ).trim();

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message:
          "Администратор не привязан к организации.",
      });
    }

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message:
          "Не указан идентификатор кабинета.",
      });
    }

    const result = await roomService.deleteRoom(
      organizationId,
      roomId
    );

    return res.status(200).json({
      success: true,
      message: "Кабинет успешно удалён.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
