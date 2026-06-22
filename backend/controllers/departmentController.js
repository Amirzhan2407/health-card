
import * as departmentService from "../services/departmentService.js";

function getOrganizationId(req) {
  return (
    req.user?.organization_id ||
    req.user?.organizationId ||
    ""
  );
}

export async function getDepartments(req, res, next) {
  try {
    const role = req.user?.role;

    let organizationId = getOrganizationId(req);

    if (role === "patient" || role === "support") {
      organizationId = String(
        req.query?.organizationId || ""
      ).trim();

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message:
            "Необходимо указать organizationId.",
        });
      }
    }

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message:
          "Пользователь не привязан к медицинской организации.",
      });
    }

    const departments =
      await departmentService.listDepartments(
        organizationId
      );

    return res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
}

export async function addDepartment(req, res, next) {
  try {
    const organizationId =
      getOrganizationId(req);

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message:
          "Администратор не привязан к организации.",
      });
    }

    const name = String(
      req.body?.name || ""
    ).trim();

    const description = String(
      req.body?.description || ""
    ).trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        message:
          "Название отделения обязательно.",
      });
    }

    const department =
      await departmentService.createDepartment(
        organizationId,
        {
          name,
          description,
        }
      );

    return res.status(201).json({
      success: true,
      message:
        "Отделение успешно создано.",
      data: department,
    });
  } catch (error) {
    next(error);
  }
}

export async function editDepartment(req, res, next) {
  try {
    const organizationId =
      getOrganizationId(req);

    const departmentId = String(
      req.params?.id || ""
    ).trim();

    const name = String(
      req.body?.name || ""
    ).trim();

    const description = String(
      req.body?.description || ""
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
          "Не указан идентификатор отделения.",
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message:
          "Название отделения обязательно.",
      });
    }

    const department =
      await departmentService.updateDepartment(
        organizationId,
        departmentId,
        {
          name,
          description,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Отделение успешно обновлено.",
      data: department,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeDepartment(req, res, next) {
  try {
    const organizationId =
      getOrganizationId(req);

    const departmentId = String(
      req.params?.id || ""
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
          "Не указан идентификатор отделения.",
      });
    }

    await departmentService.deleteDepartment(
      organizationId,
      departmentId
    );

    return res.status(200).json({
      success: true,
      message:
        "Отделение успешно удалено.",
    });
  } catch (error) {
    next(error);
  }
}

