import express from "express";
import {
  login,
  loginEds,
  registerPatient,
  refresh,
  logout,
  changePassword,
  getMe,
} from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";
import { csrfProtection } from "../middleware/csrf.js";

const router = express.Router();

router.get("/me", authenticateToken, getMe);
router.post("/login", login);
router.post("/login-eds", loginEds);
router.post("/register", registerPatient);
router.post("/refresh", csrfProtection, refresh);
router.post("/logout", csrfProtection, logout);
router.post("/change-password", authenticateToken, changePassword);

export default router;

