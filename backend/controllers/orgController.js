
import * as orgService from "../services/orgService.js";

export async function getOrganizations(req, res, next) {
  try {
    const { status } = req.query;

    const organizations =
      await orgService.listOrganizations(status);

    return res.status(200).json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrganization(req, res, next) {
  try {
    const { id } = req.params;

    const organization =
      await orgService.getOrganizationById(id);

    return res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrg(req, res, next) {
  try {
    const { id } = req.params;

    const organization =
      await orgService.updateOrganization(
        id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        "Информация об организации успешно обновлена.",
      data: organization,
    });
  } catch (error) {
    next(error);
  }
}

export async function changeOrgStatus(
  req,
  res,
  next
) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const organization =
      await orgService.blockOrganization(
        id,
        status
      );

    return res.status(200).json({
      success: true,
      message:
        status === "blocked"
          ? "Организация успешно заблокирована."
          : "Организация успешно разблокирована.",
      data: organization,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteOrg(req, res, next) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Не указан идентификатор организации.",
      });
    }

    const result =
      await orgService.deleteOrganization(id);

    return res.status(200).json({
      success: true,
      message:
        "Организация и связанные учётные записи успешно удалены.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
