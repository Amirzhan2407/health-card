import * as appService from "../services/appService.js";

export async function submitApplication(req, res, next) {
  try {
    const app = await appService.createApplication(req.body);
    return res.status(201).json({
      success: true,
      message: "Заявка успешно подана и находится на рассмотрении.",
      data: app,
    });
  } catch (error) {
    next(error);
  }
}

export async function getApplications(req, res, next) {
  try {
    const { status } = req.query;
    const apps = await appService.listApplications(status);
    return res.status(200).json({ success: true, data: apps });
  } catch (error) {
    next(error);
  }
}


export async function approveApp(req, res, next) {
  try {
    const applicationId = String(
      req.params?.id || ""
    ).trim();

    const username = String(
      req.body?.username || ""
    )
      .trim()
      .toLowerCase();

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Не указан идентификатор заявки.",
      });
    }

    if (!username) {
      return res.status(400).json({
        success: false,
        message:
          "Перед одобрением укажите логин администратора.",
      });
    }

    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      return res.status(400).json({
        success: false,
        message:
          "Логин должен содержать от 3 до 30 латинских букв, цифр или символов . _ -",
      });
    }

    const result =
      await appService.approveApplication(
        applicationId,
        username
      );

    return res.status(200).json({
      success: true,
      message:
        "Заявка одобрена. БИН, логин и временный пароль отправлены администратору на Email.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}



export async function rejectApp(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const app = await appService.rejectApplication(id, reason);
    return res.status(200).json({
      success: true,
      message: "Заявка отклонена.",
      data: app,
    });
  } catch (error) {
    next(error);
  }
}
