import express from "express";
import { verifyAdminToken } from "../services/adminService.js";
import {
  getAdminChannels,
  getChannelMessages,
  sendChannelMessage,
} from "../services/adminChannelService.js";

const router = express.Router();

function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Нет токена авторизации.",
      });
    }

    req.admin = verifyAdminToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Неверный или просроченный токен.",
    });
  }
}

router.get("/", requireAdminAuth, async (req, res) => {
  const result = await getAdminChannels(req.admin);
  return res.status(result.status).json(result);
});

router.get("/:category/messages", requireAdminAuth, async (req, res) => {
  const result = await getChannelMessages({
    currentAdmin: req.admin,
    category: req.params.category,
  });

  return res.status(result.status).json(result);
});

router.post("/:category/messages", requireAdminAuth, async (req, res) => {
  const result = await sendChannelMessage({
    currentAdmin: req.admin,
    category: req.params.category,
    message: req.body.message,
    applicationId: req.body.applicationId || null,
    organizationId: req.body.organizationId || null,
  });

  return res.status(result.status).json(result);
});

export default router;