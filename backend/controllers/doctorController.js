
import * as doctorService from "../services/doctorService.js";

function getOrganizationId(req) {
  return String(
    req.user?.organization_id ||
      req.user?.organizationId ||
      ""
  ).trim();
}

function getDoctorId(req) {
  return String(
    req.params?.id || ""
  ).trim();
}
function getCurrentProfileId(req) {
  return String(
    req.user?.profile_id ||
      req.user?.profileId ||
      req.user?.id ||
      ""
  ).trim();
}
function validateOrganizationAndDoctor(
  req,
  res
) {
  const organizationId =
    getOrganizationId(req);

  const doctorId = getDoctorId(req);

  if (!organizationId) {
    res.status(403).json({
      success: false,
      message:
        "Администратор не привязан к организации.",
    });

    return null;
  }

  if (!doctorId) {
    res.status(400).json({
      success: false,
      message:
        "Не указан идентификатор врача.",
    });

    return null;
  }

  return {
    organizationId,
    doctorId,
  };
}

export async function getDoctors(
  req,
  res,
  next
) {
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

export async function getDoctor(
  req,
  res,
  next
) {
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

export async function addDoctor(
  req,
  res,
  next
) {
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

    const doctor =
      await doctorService.createDoctor(
        organizationId,
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        "Карточка врача успешно создана.",
      data: doctor,
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
    const context =
      validateOrganizationAndDoctor(
        req,
        res
      );

    if (!context) {
      return;
    }

    const doctor =
      await doctorService.updateDoctor(
        context.organizationId,
        context.doctorId,
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
    const context =
      validateOrganizationAndDoctor(
        req,
        res
      );

    if (!context) {
      return;
    }

    const username = String(
      req.body?.username || ""
    )
      .trim()
      .toLowerCase();

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
        context.organizationId,
        context.doctorId,
        username
      );

    return res.status(200).json({
      success: true,
      message:
        "Доступ врачу успешно выдан. Скопируйте логин и временный пароль.",
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
    const context =
      validateOrganizationAndDoctor(
        req,
        res
      );

    if (!context) {
      return;
    }

    const access =
      await doctorService.resetDoctorPassword(
        context.organizationId,
        context.doctorId
      );

    return res.status(200).json({
      success: true,
      message:
        "Новый временный пароль создан. Скопируйте его и передайте врачу.",
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
    const context =
      validateOrganizationAndDoctor(
        req,
        res
      );

    if (!context) {
      return;
    }

    const administratorProfileId =
      getCurrentProfileId(req);

    const result =
      await doctorService.blockDoctorAccessAndCancelAppointments(
        context.organizationId,
        context.doctorId,
        administratorProfileId
      );

    const cancelledAppointmentsCount =
      Number(
        result?.cancelledAppointmentsCount ||
          0
      );

    return res.status(200).json({
      success: true,

      message:
        cancelledAppointmentsCount > 0
          ? `Доступ врача заблокирован. Отменено будущих записей: ${cancelledAppointmentsCount}.`
          : "Доступ врача заблокирован. Активных будущих записей не найдено.",

      data: result,

      cancelledAppointmentsCount,
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
    const context =
      validateOrganizationAndDoctor(
        req,
        res
      );

    if (!context) {
      return;
    }

    const doctor =
      await doctorService.setDoctorAccessStatus(
        context.organizationId,
        context.doctorId,
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
    const context =
      validateOrganizationAndDoctor(
        req,
        res
      );

    if (!context) {
      return;
    }

    const doctor =
      await doctorService.archiveDoctor(
        context.organizationId,
        context.doctorId
      );

    return res.status(200).json({
      success: true,
      message:
        "Врач успешно отправлен в архив.",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
}

export async function restoreDoctor(
  req,
  res,
  next
) {
  try {
    const context =
      validateOrganizationAndDoctor(
        req,
        res
      );

    if (!context) {
      return;
    }

    const doctor =
      await doctorService.restoreDoctor(
        context.organizationId,
        context.doctorId
      );

    return res.status(200).json({
      success: true,
      message:
        "Врач восстановлен из архива.",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteDoctorPermanently(
  req,
  res,
  next
) {
  try {
    const context =
      validateOrganizationAndDoctor(
        req,
        res
      );

    if (!context) {
      return;
    }

    const result =
      await doctorService.deleteDoctorPermanently(
        context.organizationId,
        context.doctorId
      );

    return res.status(200).json({
      success: true,
      message:
        "Врач и связанные с ним учётные данные полностью удалены из базы.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

