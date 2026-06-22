import * as doctorService from "../services/doctorService.js";

export async function getDoctors(req, res, next) {
  try {
    const { role, organization_id } = req.user;
    const { specialtyId } = req.query;

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
      // Organization Admin or Doctor within the organization
      targetOrgId = organization_id;
    }

    const doctors = await doctorService.listDoctors(targetOrgId, specialtyId);
    return res.status(200).json({ success: true, data: doctors });
  } catch (error) {
    next(error);
  }
}

export async function getDoctor(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await doctorService.getDoctorById(id);
    return res.status(200).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
}

export async function addDoctor(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const result = await doctorService.createDoctor(orgId, req.body);
    return res.status(201).json({
      success: true,
      message: "Профиль врача успешно создан и добавлен в клинику.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDoctorDetails(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const { id } = req.params;
    const doc = await doctorService.updateDoctor(orgId, id, req.body);
    return res.status(200).json({
      success: true,
      message: "Запись врача успешно обновлена.",
      data: doc,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeDoctor(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const { id } = req.params;
    await doctorService.archiveDoctor(orgId, id);
    return res.status(200).json({
      success: true,
      message: "Врач успешно отправлен в архив.",
    });
  } catch (error) {
    next(error);
  }
}
