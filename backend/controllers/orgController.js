import * as orgService from "../services/orgService.js";

export async function getOrganizations(req, res, next) {
  try {
    const { status } = req.query;
    const orgs = await orgService.listOrganizations(status);
    return res.status(200).json({ success: true, data: orgs });
  } catch (error) {
    next(error);
  }
}

export async function getOrganization(req, res, next) {
  try {
    const { id } = req.params;
    const org = await orgService.getOrganizationById(id);
    return res.status(200).json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
}

export async function updateOrg(req, res, next) {
  try {
    const { id } = req.params;
    const org = await orgService.updateOrganization(id, req.body);
    return res.status(200).json({
      success: true,
      message: "Информация об организации успешно обновлена.",
      data: org,
    });
  } catch (error) {
    next(error);
  }
}

export async function changeOrgStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const org = await orgService.blockOrganization(id, status);
    return res.status(200).json({
      success: true,
      message: `Статус организации успешно изменен на ${status}.`,
      data: org,
    });
  } catch (error) {
    next(error);
  }
}
