
import * as orgService from "../services/orgService.js";

export async function getOrganizations(
  req,
  res,
  next
) {
  try {
    const status = String(
      req.query?.status || ""
    )
      .trim()
      .toLowerCase();

    const organizations =
      await orgService.listOrganizations(
        status || null
      );

    return res.status(200).json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Список активных медицинских организаций
 * для пациента.
 */
export async function getActiveOrganizations(
  req,
  res,
  next
) {
  try {
    const organizations =
      await orgService.listOrganizations(
        "active"
      );

    return res.status(200).json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrganization(
  req,
  res,
  next
) {
  try {
    const organizationId = String(
      req.params?.id || ""
    ).trim();

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message:
          "Не указан идентификатор организации.",
      });
    }

    const organization =
      await orgService.getOrganizationById(
        organizationId
      );

    return res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrg(
  req,
  res,
  next
) {
  try {
    const organizationId = String(
      req.params?.id || ""
    ).trim();

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message:
          "Не указан идентификатор организации.",
      });
    }

    const organization =
      await orgService.updateOrganization(
        organizationId,
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
    const organizationId = String(
      req.params?.id || ""
    ).trim();

    const status = String(
      req.body?.status || ""
    )
      .trim()
      .toLowerCase();

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message:
          "Не указан идентификатор организации.",
      });
    }

    const organization =
      await orgService.blockOrganization(
        organizationId,
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

export async function deleteOrg(
  req,
  res,
  next
) {
  try {
    const organizationId = String(
      req.params?.id || ""
    ).trim();

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message:
          "Не указан идентификатор организации.",
      });
    }

    const result =
      await orgService.deleteOrganization(
        organizationId
      );

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

