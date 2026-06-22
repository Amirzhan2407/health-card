import * as specialtyService from "../services/specialtyService.js";

export async function getSpecialties(req, res, next) {
  try {
    const specialties = await specialtyService.listSpecialties();
    return res.status(200).json({ success: true, data: specialties });
  } catch (error) {
    next(error);
  }
}

export async function addSpecialty(req, res, next) {
  try {
    const specialty = await specialtyService.createSpecialty(req.body);
    return res.status(201).json({
      success: true,
      message: "Специальность успешно добавлена.",
      data: specialty,
    });
  } catch (error) {
    next(error);
  }
}

export async function editSpecialty(req, res, next) {
  try {
    const { id } = req.params;
    const specialty = await specialtyService.updateSpecialty(id, req.body);
    return res.status(200).json({
      success: true,
      message: "Специальность успешно обновлена.",
      data: specialty,
    });
  } catch (error) {
    next(error);
  }
}
