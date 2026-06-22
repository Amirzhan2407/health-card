
import express from "express";

import { supabase } from "../config/supabaseClient.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateToken);

function getOrganizationId(user) {
  return (
    user?.organization_id ||
    user?.organizationId ||
    null
  );
}

function buildAccessFilter(user) {
  const filters = [];

  if (user?.id) {
    filters.push(`profile_id.eq.${user.id}`);
  }

  if (user?.role === "support") {
    filters.push("recipient_role.eq.support");
  }

  if (
    user?.role === "organization_admin" &&
    getOrganizationId(user)
  ) {
    filters.push(
      `and(recipient_role.eq.organization_admin,organization_id.eq.${getOrganizationId(
        user
      )})`
    );
  }

  if (user?.role === "doctor") {
    filters.push("recipient_role.eq.doctor");
  }

  if (user?.role === "patient") {
    filters.push("recipient_role.eq.patient");
  }

  return filters.join(",");
}

async function getAccessibleNotification(
  notificationId,
  user
) {
  const accessFilter =
    buildAccessFilter(user);

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("id", notificationId);

  if (accessFilter) {
    query = query.or(accessFilter);
  }

  const { data, error } =
    await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Получение уведомлений текущего пользователя.
 */
router.get("/", async (req, res, next) => {
  try {
    const accessFilter =
      buildAccessFilter(req.user);

    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(200);

    if (accessFilter) {
      query = query.or(accessFilter);
    } else {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return res.status(200).json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Отметка всех доступных уведомлений как прочитанных.
 */
router.patch(
  "/read-all",
  async (req, res, next) => {
    try {
      const accessFilter =
        buildAccessFilter(req.user);

      if (!accessFilter) {
        return res.status(200).json({
          success: true,
          message:
            "Нет уведомлений для обработки.",
          data: [],
        });
      }

      const {
        data: accessibleNotifications,
        error: selectError,
      } = await supabase
        .from("notifications")
        .select("id")
        .or(accessFilter)
        .eq("is_read", false);

      if (selectError) {
        throw new Error(
          selectError.message
        );
      }

      const notificationIds = (
        accessibleNotifications || []
      ).map((notification) => notification.id);

      if (notificationIds.length === 0) {
        return res.status(200).json({
          success: true,
          message:
            "Все уведомления уже прочитаны.",
          data: [],
        });
      }

      const readAt =
        new Date().toISOString();

      const { data, error } =
        await supabase
          .from("notifications")
          .update({
            is_read: true,
            read_at: readAt,
          })
          .in("id", notificationIds)
          .select("*");

      if (error) {
        throw new Error(error.message);
      }

      return res.status(200).json({
        success: true,
        message:
          "Все уведомления отмечены как прочитанные.",
        data: data || [],
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Отметка одного уведомления как прочитанного.
 */
router.patch(
  "/:id/read",
  async (req, res, next) => {
    try {
      const notification =
        await getAccessibleNotification(
          req.params.id,
          req.user
        );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Уведомление не найдено или недоступно.",
        });
      }

      if (
        notification.is_read ||
        notification.read_at
      ) {
        return res.status(200).json({
          success: true,
          message:
            "Уведомление уже прочитано.",
          data: notification,
        });
      }

      const { data, error } =
        await supabase
          .from("notifications")
          .update({
            is_read: true,
            read_at:
              new Date().toISOString(),
          })
          .eq("id", notification.id)
          .select("*")
          .single();

      if (error) {
        throw new Error(error.message);
      }

      return res.status(200).json({
        success: true,
        message:
          "Уведомление отмечено как прочитанное.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

