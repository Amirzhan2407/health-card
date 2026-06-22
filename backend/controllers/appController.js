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
    const { id } = req.params;
    const result = await appService.approveApplication(id);
    return res.status(200).json({
      success: true,
      message: "Заявка успешно одобрена. Администратору клиники отправлено письмо с доступами.",
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
