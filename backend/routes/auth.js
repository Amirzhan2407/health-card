
import express from "express";

import {
  login,
  requestRegistrationCode,
  confirmRegistration,
  resendRegistrationCode,
  refresh,
  logout,
  changePassword,
  getMe,
} from "../controllers/authController.js";

import { authenticateToken } from "../middleware/auth.js";
import { csrfProtection } from "../middleware/csrf.js";

const router = express.Router();

/**
 * Текущий пользователь
 */
router.get("/me", authenticateToken, getMe);

/**
 * Обычный вход по логину или Email и паролю
 */
router.post("/login", login);

/**
 * Первый этап регистрации пациента:
 * принимает логин, Email и пароль,
 * затем отправляет шестизначный код на почту.
 */
router.post("/register/request-code", requestRegistrationCode);

/**
 * Второй этап регистрации:
 * проверяет Email и одноразовый код,
 * создаёт пациента и открывает сессию.
 */
router.post("/register/confirm", confirmRegistration);

/**
 * Повторная отправка регистрационного кода
 */
router.post("/register/resend-code", resendRegistrationCode);

/**
 * Обновление access-токена
 */
router.post("/refresh", csrfProtection, refresh);

/**
 * Выход из системы
 */
router.post("/logout", csrfProtection, logout);

/**
 * Смена пароля авторизованного пользователя
 */
router.post(
  "/change-password",
  authenticateToken,
  changePassword
);

export default router;

