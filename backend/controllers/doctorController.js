
import * as doctorService from "../services/doctorService.js";

function getOrganizationId(req) {
  return String(
    req.user?.organization_id ||
      req.user?.organizationId ||
      ""
  ).trim();
}

function getDoctorId(req) {
  return String(req.params?.id || "").trim();
}

export async function getDoctors(req, res, next) {
  try {
    const role = String(
      req.user?.role || ""
    ).trim();

    const currentOrganizationId =
      getOrganizationId(req);

    const specialtyId = String(
      req.query?.specialtyId || ""
    ).trim();

    let targetOrganizationId =
      currentOrganizationId;

    if (
      role === "patient" ||
      role === "support"
    ) {
      targetOrganizationId = String(
        req.query?.organizationId || ""
      ).trim();

      if (!targetOrganizationId) {
        return res.status(400).json({
          success: false,
          message:
            "Необходимо указать organizationId.",
        });
      }
    }

    if (!targetOrganizationId) {
      return res.status(403).json({
        success: false,
        message:
          "Пользователь не привязан к организации.",
      });
    }

    const doctors =
      await doctorService.listDoctors(
        targetOrganizationId,
        specialtyId || null
      );

    return res.status(200).json({
      success: true,
      data: doctors,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDoctor(req, res, next) {
  try {
    const doctorId = getDoctorId(req);

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message:
          "Не указан идентификатор врача.",
      });
    }

    const doctor =
      await doctorService.getDoctorById(
        doctorId
      );

    return res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
}

export async function addDoctor(req, res, next) {
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

    const result =
      await doctorService.createDoctor(
        organizationId,
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        "Карточка врача успешно создана.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDoctorDetails(
  req,
  res,
  next
) {
  try {
    const organizationId =
      getOrganizationId(req);

    const doctorId = getDoctorId(req);

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message:
          "Администратор не привязан к организации.",
      });
    }

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message:
          "Не указан идентификатор врача.",
      });
    }

    const doctor =
      await doctorService.updateDoctor(
        organizationId,
        doctorId,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        "Данные врача успешно обновлены.",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
}

export async function grantDoctorAccess(
  req,
  res,
  next
) {
  try {
    const organizationId =
      getOrganizationId(req);

    const doctorId = getDoctorId(req);

    const username = String(
      req.body?.username || ""
    )
      .trim()
      .toLowerCase();

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message:
          "Администратор не привязан к организации.",
      });
    }

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message:
          "Не указан идентификатор врача.",
      });
    }

    if (!username) {
      return res.status(400).json({
        success: false,
        message:
          "Укажите логин врача.",
      });
    }

    if (
      !/^[\p{L}\p{N}._-]{3,30}$/u.test(
        username
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Логин должен содержать от 3 до 30 букв, цифр или символов . _ -",
      });
    }

    const access =
      await doctorService.grantDoctorAccess(
        organizationId,
        doctorId,
        username
      );

    return res.status(200).json({
      success: true,
      message:
        "Доступ врачу успешно выдан.",
      data: access,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetDoctorPassword(
  req,
  res,
  next
) {
  try {
    const organizationId =
      getOrganizationId(req);

    const doctorId = getDoctorId(req);

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message:
          "Администратор не привязан к организации.",
      });
    }

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message:
          "Не указан идентификатор врача.",
      });
    }

    const access =
      await doctorService.resetDoctorPassword(
        organizationId,
        doctorId
      );

    return res.status(200).json({
      success: true,
      message:
        "Временный пароль врача обновлён.",
      data: access,
    });
  } catch (error) {
    next(error);
  }
}

export async function blockDoctorAccess(
  req,
  res,
  next
) {
  try {
    const organizationId =
      getOrganizationId(req);

    const doctorId = getDoctorId(req);

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message:
          "Администратор не привязан к организации.",
      });
    }

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message:
          "Не указан идентификатор врача.",
      });
    }

    const doctor =
      await doctorService.setDoctorAccessStatus(
        organizationId,
        doctorId,
        "blocked"
      );

    return res.status(200).json({
      success: true,
      message:
        "Доступ врача заблокирован.",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
}

export async function unblockDoctorAccess(
  req,
  res,
  next
) {
  try {
    const organizationId =
      getOrganizationId(req);

    const doctorId = getDoctorId(req);

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message:
          "Администратор не привязан к организации.",
      });
    }

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message:
          "Не указан идентификатор врача.",
      });
    }

    const doctor =
      await doctorService.setDoctorAccessStatus(
        organizationId,
        doctorId,
        "active"
      );

    return res.status(200).json({
      success: true,
      message:
        "Доступ врача разблокирован.",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeDoctor(
  req,
  res,
  next
) {
  try {
    const organizationId =
      getOrganizationId(req);

    const doctorId = getDoctorId(req);

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message:
          "Администратор не привязан к организации.",
      });
    }

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message:
          "Не указан идентификатор врача.",
      });
    }

    await doctorService.archiveDoctor(
      organizationId,
      doctorId
    );

    return res.status(200).json({
      success: true,
      message:
        "Врач успешно отправлен в архив.",
    });
  } catch (error) {
    next(error);
  }
}

