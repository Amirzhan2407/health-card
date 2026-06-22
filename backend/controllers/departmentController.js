import * as departmentService from "../services/departmentService.js";

export async function getDepartments(req, res, next) {
  try {
    const { role, organization_id } = req.user;
    let targetOrgId;

    if (role === "patient" || role === "support") {
      targetOrgId = req.query.organizationId;
      if (!targetOrgId) {
        return res.status(400).json({
          success: false,
          message: "Необходимо указать organizationId в запросе.",
        });
      }
    } else {
      targetOrgId = organization_id;
    }

    const depts = await departmentService.listDepartments(targetOrgId);
    return res.status(200).json({ success: true, data: depts });
  } catch (error) {
    next(error);
  }
}

export async function addDepartment(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const { name } = req.body;
    const dept = await departmentService.createDepartment(orgId, name);
    return res.status(201).json({
      success: true,
      message: "Отделение успешно создано.",
      data: dept,
    });
  } catch (error) {
    next(error);
  }
}

export async function editDepartment(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const { id } = req.params;
    const { name } = req.body;
    const dept = await departmentService.updateDepartment(orgId, id, name);
    return res.status(200).json({
      success: true,
      message: "Отделение успешно обновлено.",
      data: dept,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeDepartment(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const { id } = req.params;
    await departmentService.deleteDepartment(orgId, id);
    return res.status(200).json({
      success: true,
      message: "Отделение успешно удалено.",
    });
  } catch (error) {
    next(error);
  }
}
