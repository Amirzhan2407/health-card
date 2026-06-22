import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../config/supabaseClient.js";
import { verifyPassword, hashPassword } from "../utils/crypto.js";
import { verifySignature } from "../services/edsService.js";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "your_jwt_secret_here";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "your_jwt_secret_here";
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "7d";

function parseTtlToDays(ttl) {
  if (!ttl) return 7;
  const match = ttl.toString().match(/^(\d+)([dhm])?$/);
  if (!match) return 7;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === "h") return val / 24;
  if (unit === "m") return val / (24 * 60);
  return val; // default to days
}

function parseTtlToMs(ttl) {
  if (!ttl) return 15 * 60 * 1000;
  const match = ttl.toString().match(/^(\d+)([dhm])?$/);
  if (!match) return 15 * 60 * 1000;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === "d") return val * 24 * 60 * 60 * 1000;
  if (unit === "h") return val * 60 * 60 * 1000;
  if (unit === "m") return val * 60 * 1000;
  return val; // milliseconds
}

const REFRESH_TOKEN_EXPIRY_DAYS = parseTtlToDays(REFRESH_TOKEN_TTL);

// Helper to set httpOnly cookies
function setCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === "production";
  
  const refreshAge = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const accessAge = parseTtlToMs(ACCESS_TOKEN_EXPIRY);

  // Secure cookie configuration
  const refreshCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    maxAge: refreshAge,
    path: "/",
  };

  const accessCookieOptions = {
    httpOnly: true, // access token in httpOnly cookie for backup, though frontend can store in-memory
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    maxAge: accessAge,
    path: "/",
  };

  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
  res.cookie("accessToken", accessToken, accessCookieOptions);
}

// Helper to clear cookies
function clearCookies(res) {
  const isProd = process.env.NODE_ENV === "production";
  
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    path: "/",
  };

  res.clearCookie("refreshToken", cookieOptions);
  res.clearCookie("accessToken", cookieOptions);
}

// Generate new token pair and insert/rotate in DB
async function generateTokens(profileId, oldRefreshTokenId = null, familyId = null) {
  const accessToken = jwt.sign({ id: profileId }, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = uuidv4(); // Secure UUID token

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  const finalFamilyId = familyId || uuidv4();

  // If rotating, invalidate old refresh token
  if (oldRefreshTokenId) {
    await supabase
      .from("user_refresh_tokens")
      .update({ is_revoked: true })
      .eq("id", oldRefreshTokenId);
  }

  // Insert new refresh token
  const { data: tokenData, error: tokenErr } = await supabase
    .from("user_refresh_tokens")
    .insert({
      profile_id: profileId,
      token: refreshToken,
      family_id: finalFamilyId,
      expires_at: expiresAt.toISOString(),
    })
    .select("id, family_id")
    .single();

  if (tokenErr) {
    throw new Error("Не удалось сохранить сессию авторизации.");
  }

  return {
    accessToken,
    refreshToken,
    familyId: finalFamilyId,
  };
}

export async function login(req, res, next) {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ success: false, message: "Логин и пароль обязательны." });
    }

    // Load profile from DB
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .or(`email.eq.${login},iin.eq.${login}`)
      .maybeSingle();

    if (error || !profile) {
      return res.status(401).json({ success: false, message: "Неверный логин или пароль." });
    }

    if (profile.status !== "active") {
      return res.status(403).json({ success: false, message: "Ваша учетная запись заблокирована." });
    }

    // Match password hash
    if (!verifyPassword(password, profile.password_hash)) {
      return res.status(401).json({ success: false, message: "Неверный логин или пароль." });
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(profile.id);

    setCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Вход выполнен успешно.",
      accessToken,
      user: {
        id: profile.id,
        fullName: profile.full_name,
        role: profile.role,
        preferredLanguage: profile.preferred_language,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function loginEds(req, res, next) {
  try {
    const { signature, payload } = req.body;

    if (!signature || !payload) {
      return res.status(400).json({ success: false, message: "Подпись и payload обязательны." });
    }

    // Verify signature cryptographically
    const edsResult = verifySignature(signature, payload);

    if (!edsResult.success) {
      return res.status(401).json({ success: false, message: edsResult.error });
    }

    // Signature is verified. Check if the IIN matches an active profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("iin", edsResult.iin)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    // If profile does not exist, return a register token to allow patient registration
    if (!profile) {
      return res.status(200).json({
        success: true,
        needRegister: true,
        iin: edsResult.iin,
        fullName: edsResult.fullName,
        certExpire: edsResult.certExpire,
      });
    }

    if (profile.status !== "active") {
      return res.status(403).json({ success: false, message: "Ваш аккаунт заблокирован." });
    }

    // Generate tokens and create session
    const { accessToken, refreshToken } = await generateTokens(profile.id);

    setCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: profile.id,
        fullName: profile.full_name,
        role: profile.role,
        preferredLanguage: profile.preferred_language,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function registerPatient(req, res, next) {
  try {
    const { iin, fullName, gender, password } = req.body;

    if (!iin || !fullName || !password) {
      return res.status(400).json({ success: false, message: "Все поля обязательны." });
    }

    // Protect password requirements
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Пароль должен содержать минимум 8 символов." });
    }

    const passwordHash = hashPassword(password);

    // Insert new profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .insert({
        iin,
        full_name: fullName,
        gender: gender || "unknown",
        password_hash: passwordHash,
        role: "patient",
        status: "active",
      })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: "Пользователь с таким ИИН уже зарегистрирован." });
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(profile.id);

    setCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      success: true,
      message: "Регистрация успешна.",
      accessToken,
      user: {
        id: profile.id,
        fullName: profile.full_name,
        role: profile.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const oldRefreshToken = req.cookies.refreshToken;

    if (!oldRefreshToken) {
      return res.status(401).json({ success: false, message: "Отсутствует refresh токен." });
    }

    // Find token in database
    const { data: tokenRecord, error } = await supabase
      .from("user_refresh_tokens")
      .select("*")
      .eq("token", oldRefreshToken)
      .maybeSingle();

    if (error || !tokenRecord) {
      return res.status(401).json({ success: false, message: "Недействительный refresh токен." });
    }

    // 1. Refresh Token Reuse / Rotation Detection
    if (tokenRecord.is_revoked || new Date(tokenRecord.expires_at) < new Date()) {
      // Invalidate the entire family block as a security breach!
      await supabase
        .from("user_refresh_tokens")
        .update({ is_revoked: true })
        .eq("family_id", tokenRecord.family_id);

      clearCookies(res);
      return res.status(401).json({
        success: false,
        message: "Попытка повторного использования токена! Все сессии аннулированы.",
      });
    }

    // 2. Token rotation: generate new access and refresh tokens
    const { accessToken, refreshToken, familyId } = await generateTokens(
      tokenRecord.profile_id,
      tokenRecord.id,
      tokenRecord.family_id
    );

    setCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Revoke in database
      await supabase
        .from("user_refresh_tokens")
        .update({ is_revoked: true })
        .eq("token", refreshToken);
    }

    clearCookies(res);

    return res.status(200).json({
      success: true,
      message: "Вы вышли из системы.",
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Укажите текущий и новый пароли." });
    }

    // Load actual profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ success: false, message: "Профиль не найден." });
    }

    if (!verifyPassword(currentPassword, profile.password_hash)) {
      return res.status(400).json({ success: false, message: "Неверный текущий пароль." });
    }

    const newHash = hashPassword(newPassword);

    await supabase
      .from("profiles")
      .update({ password_hash: newHash })
      .eq("id", req.user.id);

    return res.status(200).json({ success: true, message: "Пароль успешно изменен." });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (err) {
    next(err);
  }
}

