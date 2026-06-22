import * as supportService from "../services/supportService.js";

export async function createTicket(req, res, next) {
  try {
    const { subject, description } = req.body;
    const orgId = req.user.organization_id;
    const userId = req.user.id;

    if (!subject) {
      return res.status(400).json({ success: false, message: "Тема обращения обязательна." });
    }

    if (!orgId) {
      return res.status(403).json({
        success: false,
        message: "Доступ запрещен. Только представители клиники могут создавать тикеты поддержки.",
      });
    }

    const conv = await supportService.createConversation(orgId, userId, subject, description);
    return res.status(201).json({
      success: true,
      message: "Тикет обращения успешно создан.",
      data: conv,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTickets(req, res, next) {
  try {
    const user = req.user;

    let orgId = null;
    if (user.role !== "support") {
      orgId = user.organization_id;
      if (!orgId) {
        return res.status(403).json({ success: false, message: "Доступ запрещен." });
      }
    }

    const tickets = await supportService.listConversations(orgId);
    return res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    next(error);
  }
}

export async function getTicketDetails(req, res, next) {
  try {
    const { id } = req.params;
    const user = req.user;

    const details = await supportService.getConversationDetails(id);

    // Permission checks: clients can only view their own organization's tickets
    if (user.role !== "support" && details.organization_id !== user.organization_id) {
      return res.status(403).json({ success: false, message: "Доступ к чужому тикету запрещен." });
    }

    return res.status(200).json({ success: true, data: details });
  } catch (error) {
    next(error);
  }
}

export async function addTicketMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { messageText, attachmentUrl } = req.body;
    const user = req.user;

    if (!messageText) {
      return res.status(400).json({ success: false, message: "Текст сообщения обязателен." });
    }

    // Verify ticket access
    const details = await supportService.getConversationDetails(id);
    if (user.role !== "support" && details.organization_id !== user.organization_id) {
      return res.status(403).json({ success: false, message: "Доступ запрещен." });
    }

    const msg = await supportService.postMessage(id, user.id, messageText, attachmentUrl);
    return res.status(201).json({ success: true, data: msg });
  } catch (error) {
    next(error);
  }
}

export async function changeTicketStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Статус обязателен." });
    }

    const conv = await supportService.updateConversationStatus(id, status);
    return res.status(200).json({
      success: true,
      message: `Статус тикета изменен на ${status}.`,
      data: conv,
    });
  } catch (error) {
    next(error);
  }
}
