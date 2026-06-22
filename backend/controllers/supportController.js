
import * as supportService from "../services/supportService.js";

const ALLOWED_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];

function getOrganizationId(user) {
  return (
    user?.organization_id ||
    user?.organizationId ||
    null
  );
}

function getErrorMessage(error, fallback) {
  return (
    error?.message ||
    fallback
  );
}

async function verifyConversationAccess(
  conversationId,
  user
) {
  const conversation =
    await supportService.getConversationDetails(
      conversationId
    );

  if (!conversation) {
    const error = new Error(
      "Обращение не найдено."
    );
    error.statusCode = 404;
    throw error;
  }

  const organizationId =
    conversation.organization_id ||
    conversation.organizationId ||
    conversation.organization?.id;

  if (
    user.role !== "support" &&
    organizationId !==
      getOrganizationId(user)
  ) {
    const error = new Error(
      "Доступ к этому обращению запрещён."
    );
    error.statusCode = 403;
    throw error;
  }

  return conversation;
}

export async function createTicket(
  req,
  res,
  next
) {
  try {
    const subject = String(
      req.body?.subject || ""
    ).trim();

    const description = String(
      req.body?.description ||
        req.body?.messageText ||
        ""
    ).trim();

    const organizationId =
      getOrganizationId(req.user);

    const userId = req.user?.id;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message:
          "Только администратор медицинской организации может создавать обращения.",
      });
    }

    if (!subject) {
      return res.status(400).json({
        success: false,
        message:
          "Укажите тему обращения.",
      });
    }

    if (subject.length > 200) {
      return res.status(400).json({
        success: false,
        message:
          "Тема обращения не должна превышать 200 символов.",
      });
    }

    if (!description && !req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Опишите проблему или прикрепите файл.",
      });
    }

    const conversation =
      await supportService.createConversation({
        organizationId,
        createdBy: userId,
        subject,
        description,
        attachment: req.file || null,
      });

    return res.status(201).json({
      success: true,
      message:
        "Обращение успешно создано.",
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTickets(
  req,
  res,
  next
) {
  try {
    const organizationId =
      req.user.role === "support"
        ? null
        : getOrganizationId(req.user);

    if (
      req.user.role !== "support" &&
      !organizationId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "У пользователя не указана медицинская организация.",
      });
    }

    const status = String(
      req.query?.status || ""
    ).trim();

    const tickets =
      await supportService.listConversations({
        organizationId,
        status:
          status &&
          ALLOWED_STATUSES.includes(status)
            ? status
            : null,
        viewerId: req.user.id,
        viewerRole: req.user.role,
      });

    return res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTicketDetails(
  req,
  res,
  next
) {
  try {
    const conversation =
      await verifyConversationAccess(
        req.params.id,
        req.user
      );

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    if (error.statusCode) {
      return res
        .status(error.statusCode)
        .json({
          success: false,
          message: error.message,
        });
    }

    next(error);
  }
}

export async function addTicketMessage(
  req,
  res,
  next
) {
  try {
    const conversationId =
      req.params.id;

    const messageText = String(
      req.body?.messageText ||
        req.body?.message_text ||
        ""
    ).trim();

    await verifyConversationAccess(
      conversationId,
      req.user
    );

    if (!messageText && !req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Введите сообщение или прикрепите файл.",
      });
    }

    if (messageText.length > 5000) {
      return res.status(400).json({
        success: false,
        message:
          "Сообщение не должно превышать 5000 символов.",
      });
    }

    const message =
      await supportService.postMessage({
        conversationId,
        senderId: req.user.id,
        senderRole: req.user.role,
        messageText,
        attachment: req.file || null,
      });

    return res.status(201).json({
      success: true,
      message: "Сообщение отправлено.",
      data: message,
    });
  } catch (error) {
    if (error.statusCode) {
      return res
        .status(error.statusCode)
        .json({
          success: false,
          message: error.message,
        });
    }

    next(error);
  }
}

export async function changeTicketStatus(
  req,
  res,
  next
) {
  try {
    const conversationId =
      req.params.id;

    const status = String(
      req.body?.status || ""
    ).trim();

    if (
      !ALLOWED_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Допустимые статусы: open, in_progress, resolved, closed.",
      });
    }

    await verifyConversationAccess(
      conversationId,
      req.user
    );

    const conversation =
      await supportService.updateConversationStatus({
        conversationId,
        status,
        changedBy: req.user.id,
      });

    return res.status(200).json({
      success: true,
      message:
        "Статус обращения успешно изменён.",
      data: conversation,
    });
  } catch (error) {
    if (error.statusCode) {
      return res
        .status(error.statusCode)
        .json({
          success: false,
          message: error.message,
        });
    }

    next(error);
  }
}

export async function markTicketRead(
  req,
  res,
  next
) {
  try {
    const conversationId =
      req.params.id;

    await verifyConversationAccess(
      conversationId,
      req.user
    );

    await supportService.markConversationRead({
      conversationId,
      userId: req.user.id,
      userRole: req.user.role,
    });

    return res.status(200).json({
      success: true,
      message:
        "Сообщения отмечены как прочитанные.",
    });
  } catch (error) {
    if (error.statusCode) {
      return res
        .status(error.statusCode)
        .json({
          success: false,
          message: error.message,
        });
    }

    next(
      new Error(
        getErrorMessage(
          error,
          "Не удалось отметить сообщения как прочитанные."
        )
      )
    );
  }
}

