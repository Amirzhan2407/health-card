
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

import { supabase } from "../config/supabaseClient.js";
import { verifyPassword, hashPassword } from "../utils/crypto.js";
import { sendRegistrationCodeEmail } from "../services/emailService.js";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "7d";

const REGISTRATION_CODES_TABLE = "patient_registration_codes";
const REGISTRATION_CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

function hashToken(value) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

function secureHashEquals(leftHash, rightHash) {
  const left = Buffer.from(String(leftHash), "hex");
  const right = Buffer.from(String(rightHash), "hex");

  if (left.length !== right.length || left.length === 0) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function parseTtlToMs(ttl, fallbackMs) {
  if (!ttl) {
    return fallbackMs;
  }

  const match = String(ttl)
    .trim()
    .match(/^(\d+)([dhms])?$/i);

  if (!match) {
    return fallbackMs;
  }

  const value = Number(match[1]);
  const unit = (match[2] || "ms").toLowerCase();

  if (unit === "d") {
    return value * 24 * 60 * 60 * 1000;
  }

  if (unit === "h") {
    return value * 60 * 60 * 1000;
  }

  if (unit === "m") {
    return value * 60 * 1000;
  }

  if (unit === "s") {
    return value * 1000;
  }

  return value;
}

const ACCESS_TOKEN_TTL_MS = parseTtlToMs(
  ACCESS_TOKEN_EXPIRY,
  15 * 60 * 1000
);

const REFRESH_TOKEN_TTL_MS = parseTtlToMs(
  REFRESH_TOKEN_TTL,
  7 * 24 * 60 * 60 * 1000
);

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(username) {
  return /^[\p{L}\p{N}._-]{3,30}$/u.test(username);
}

function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

function generateRegistrationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
}

function setCookies(res, accessToken, refreshToken) {
  const commonOptions = getCookieOptions();

  res.cookie("refreshToken", refreshToken, {
    ...commonOptions,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });

  res.cookie("accessToken", accessToken, {
    ...commonOptions,
    maxAge: ACCESS_TOKEN_TTL_MS,
  });
}

function clearCookies(res) {
  const commonOptions = getCookieOptions();

  res.clearCookie("refreshToken", commonOptions);
  res.clearCookie("accessToken", commonOptions);
}

function publicUser(profile) {
  return {
    id: profile.id,
    username: profile.username || null,
    email: profile.email || null,
    fullName: profile.full_name,
    role: profile.role,
    preferredLanguage:
      profile.preferred_language || "ru",
  };
}

async function generateTokens(
  profileId,
  oldRefreshTokenId = null,
  familyId = null
) {
  const accessToken = jwt.sign(
    { id: profileId },
    JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = crypto
    .randomBytes(48)
    .toString("hex");

  const tokenHash = hashToken(refreshToken);
  const finalFamilyId = familyId || uuidv4();

  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_MS
  );

  const { data: tokenData, error: tokenError } =
    await supabase
      .from("user_refresh_tokens")
      .insert({
        profile_id: profileId,
        token_hash: tokenHash,
        family_id: finalFamilyId,
        expires_at: expiresAt.toISOString(),
        is_revoked: false,
      })
      .select("id, family_id")
      .single();

  if (tokenError || !tokenData) {
    throw new Error(
      "Не удалось сохранить сессию авторизации."
    );
  }

  if (oldRefreshTokenId) {
    const { error: revokeError } = await supabase
      .from("user_refresh_tokens")
      .update({
        is_revoked: true,
        revoked_at: new Date().toISOString(),
        replaced_by: tokenData.id,
      })
      .eq("id", oldRefreshTokenId);

    if (revokeError) {
      throw new Error(
        "Не удалось обновить сессию авторизации."
      );
    }
  }

  return {
    accessToken,
    refreshToken,
    familyId: finalFamilyId,
  };
}


async function findProfileByLogin(loginValue) {
  const username = normalizeUsername(loginValue);

  if (!username) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}



async function ensureRegistrationIdentityAvailable(
  username,
  email
) {
  const {
    data: usernameProfile,
    error: usernameError,
  } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (usernameError) {
    throw usernameError;
  }

  if (usernameProfile) {
    return "Этот логин уже используется.";
  }

  const {
    data: emailProfile,
    error: emailError,
  } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (emailError) {
    throw emailError;
  }

  if (emailProfile) {
    return "Пользователь с такой электронной почтой уже зарегистрирован.";
  }

  return null;
}

async function getLatestPendingRegistration(email) {
  const { data, error } = await supabase
    .from(REGISTRATION_CODES_TABLE)
    .select("*")
    .eq("email", email)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] || null;
}


export async function login(req, res, next) {
  try {
    const loginValue = normalizeUsername(
      req.body?.login
    );

    const password = String(
      req.body?.password || ""
    );

    const organizationBin = String(
      req.body?.organizationBin || ""
    )
      .replace(/\D/g, "")
      .slice(0, 12);

    if (!loginValue || !password) {
      return res.status(400).json({
        success: false,
        message: "Логин и пароль обязательны.",
      });
    }

    const profile = await findProfileByLogin(
      loginValue
    );

    if (!profile || !profile.password_hash) {
      return res.status(401).json({
        success: false,
        message: "Неверный логин или пароль.",
      });
    }

    if (profile.status !== "active") {
      return res.status(403).json({
        success: false,
        message:
          "Ваша учётная запись заблокирована.",
      });
    }

    if (
      !verifyPassword(
        password,
        profile.password_hash
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          profile.role === "organization_admin"
            ? "Неверный логин, БИН организации или пароль."
            : "Неверный логин или пароль.",
      });
    }

    if (profile.role === "organization_admin") {
      if (!/^\d{12}$/.test(organizationBin)) {
        return res.status(400).json({
          success: false,
          message:
            "Для входа администратора укажите БИН организации из 12 цифр.",
        });
      }

      if (!profile.organization_id) {
        return res.status(403).json({
          success: false,
          message:
            "Администратор не привязан к медицинской организации.",
        });
      }

      const {
        data: organization,
        error: organizationError,
      } = await supabase
        .from("organizations")
        .select("id, bin, status")
        .eq("id", profile.organization_id)
        .maybeSingle();

      if (organizationError) {
        throw organizationError;
      }

      if (
        !organization ||
        String(organization.bin || "") !==
          organizationBin
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Неверный логин, БИН организации или пароль.",
        });
      }

      if (
        organization.status &&
        organization.status !== "active"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Медицинская организация заблокирована.",
        });
      }
    }

    const {
      accessToken,
      refreshToken,
    } = await generateTokens(profile.id);

    setCookies(
      res,
      accessToken,
      refreshToken
    );

    return res.status(200).json({
      success: true,
      message: "Вход выполнен успешно.",
      accessToken,
      user: {
        ...publicUser(profile),
        organizationId:
          profile.organization_id || null,
      },
    });
  } catch (error) {
    next(error);
  }
}



export async function requestRegistrationCode(
  req,
  res,
  next
) {
  try {
    const username = normalizeUsername(
      req.body?.username
    );

    const email = normalizeEmail(
      req.body?.email
    );

    const password = String(
      req.body?.password || ""
    );

    const confirmPassword = String(
      req.body?.confirmPassword || ""
    );

    const fullName = String(
      req.body?.fullName || username
    ).trim();

    const preferredLanguage =
      req.body?.preferredLanguage === "kz"
        ? "kz"
        : "ru";

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Укажите логин, электронную почту и пароль.",
      });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({
        success: false,
        message:
          "Логин должен содержать от 3 до 30 букв, цифр или символов . _ -",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message:
          "Введите корректную электронную почту.",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Пароль должен содержать минимум 8 символов.",
      });
    }

    if (
      confirmPassword &&
      password !== confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "Пароли не совпадают.",
      });
    }

    const identityError =
      await ensureRegistrationIdentityAvailable(
        username,
        email
      );

    if (identityError) {
      return res.status(409).json({
        success: false,
        message: identityError,
      });
    }

    const code = generateRegistrationCode();
    const passwordHash = hashPassword(password);

    const expiresAt = new Date(
      Date.now() + REGISTRATION_CODE_TTL_MS
    );

    await supabase
      .from(REGISTRATION_CODES_TABLE)
      .delete()
      .eq("email", email)
      .is("used_at", null);

    const {
      data: pendingRegistration,
      error: insertError,
    } = await supabase
      .from(REGISTRATION_CODES_TABLE)
      .insert({
        username,
        email,
        full_name: fullName || username,
        password_hash: passwordHash,
        code_hash: hashToken(code),
        preferred_language: preferredLanguage,
        attempts: 0,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (
      insertError ||
      !pendingRegistration
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Не удалось подготовить регистрацию.",
      });
    }

    try {
      await sendRegistrationCodeEmail(
        email,
        code
      );
    } catch (emailError) {
      await supabase
        .from(REGISTRATION_CODES_TABLE)
        .delete()
        .eq("id", pendingRegistration.id);

      return res.status(503).json({
        success: false,
        message:
          emailError?.message ||
          "Не удалось отправить код на электронную почту.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Код подтверждения отправлен на электронную почту.",
      expiresInSeconds:
        REGISTRATION_CODE_TTL_MS / 1000,
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmRegistration(
  req,
  res,
  next
) {
  try {
    const email = normalizeEmail(
      req.body?.email
    );

    const code = String(
      req.body?.code || ""
    ).trim();

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message:
          "Укажите электронную почту и код подтверждения.",
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message:
          "Код должен содержать 6 цифр.",
      });
    }

    const pendingRegistration =
      await getLatestPendingRegistration(email);

    if (!pendingRegistration) {
      return res.status(404).json({
        success: false,
        message:
          "Активный код регистрации не найден.",
      });
    }

    if (
      Number(
        pendingRegistration.attempts || 0
      ) >= MAX_CODE_ATTEMPTS
    ) {
      return res.status(429).json({
        success: false,
        message:
          "Превышено количество попыток. Запросите новый код.",
      });
    }

    if (
      new Date(
        pendingRegistration.expires_at
      ) <= new Date()
    ) {
      return res.status(410).json({
        success: false,
        message:
          "Срок действия кода истёк. Запросите новый код.",
      });
    }

    const enteredCodeHash = hashToken(code);

    if (
      !secureHashEquals(
        enteredCodeHash,
        pendingRegistration.code_hash
      )
    ) {
      await supabase
        .from(REGISTRATION_CODES_TABLE)
        .update({
          attempts:
            Number(
              pendingRegistration.attempts || 0
            ) + 1,
        })
        .eq("id", pendingRegistration.id);

      return res.status(400).json({
        success: false,
        message:
          "Неверный код подтверждения.",
      });
    }

    const identityError =
      await ensureRegistrationIdentityAvailable(
        pendingRegistration.username,
        pendingRegistration.email
      );

    if (identityError) {
      return res.status(409).json({
        success: false,
        message: identityError,
      });
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .insert({
        username:
          pendingRegistration.username,
        email:
          pendingRegistration.email,
        full_name:
          pendingRegistration.full_name ||
          pendingRegistration.username,
        password_hash:
          pendingRegistration.password_hash,
        role: "patient",
        status: "active",
        preferred_language:
          pendingRegistration.preferred_language ||
          "ru",
      })
      .select("*")
      .single();

    if (profileError || !profile) {
      return res.status(500).json({
        success: false,
        message:
          profileError?.message ||
          "Не удалось создать аккаунт пациента.",
      });
    }

    await supabase
      .from(REGISTRATION_CODES_TABLE)
      .update({
        used_at: new Date().toISOString(),
      })
      .eq("id", pendingRegistration.id);

    const {
      accessToken,
      refreshToken,
    } = await generateTokens(profile.id);

    setCookies(
      res,
      accessToken,
      refreshToken
    );

    return res.status(201).json({
      success: true,
      message:
        "Регистрация успешно завершена.",
      accessToken,
      user: publicUser(profile),
    });
  } catch (error) {
    next(error);
  }
}

export async function resendRegistrationCode(
  req,
  res,
  next
) {
  try {
    const email = normalizeEmail(
      req.body?.email
    );

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message:
          "Введите корректную электронную почту.",
      });
    }

    const pendingRegistration =
      await getLatestPendingRegistration(email);

    if (!pendingRegistration) {
      return res.status(404).json({
        success: false,
        message:
          "Незавершённая регистрация не найдена. Заполните форму повторно.",
      });
    }

    const code = generateRegistrationCode();

    const expiresAt = new Date(
      Date.now() + REGISTRATION_CODE_TTL_MS
    );

    const { error: updateError } =
      await supabase
        .from(REGISTRATION_CODES_TABLE)
        .update({
          code_hash: hashToken(code),
          attempts: 0,
          expires_at:
            expiresAt.toISOString(),
          created_at:
            new Date().toISOString(),
        })
        .eq("id", pendingRegistration.id);

    if (updateError) {
      return res.status(500).json({
        success: false,
        message:
          "Не удалось обновить код подтверждения.",
      });
    }

    try {
      await sendRegistrationCodeEmail(
        email,
        code
      );
    } catch (emailError) {
      return res.status(503).json({
        success: false,
        message:
          emailError?.message ||
          "Не удалось повторно отправить код подтверждения.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Новый код отправлен на электронную почту.",
      expiresInSeconds:
        REGISTRATION_CODE_TTL_MS / 1000,
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(
  req,
  res,
  next
) {
  try {
    const oldRefreshToken =
      req.cookies?.refreshToken;

    if (!oldRefreshToken) {
      return res.status(401).json({
        success: false,
        message:
          "Отсутствует refresh-токен.",
      });
    }

    const tokenHash = hashToken(
      oldRefreshToken
    );

    const {
      data: tokenRecord,
      error: tokenError,
    } = await supabase
      .from("user_refresh_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenError || !tokenRecord) {
      clearCookies(res);

      return res.status(401).json({
        success: false,
        message:
          "Недействительный refresh-токен.",
      });
    }

    if (
      tokenRecord.is_revoked ||
      new Date(
        tokenRecord.expires_at
      ) <= new Date()
    ) {
      await supabase
        .from("user_refresh_tokens")
        .update({
          is_revoked: true,
          revoked_at:
            new Date().toISOString(),
        })
        .eq(
          "family_id",
          tokenRecord.family_id
        );

      clearCookies(res);

      return res.status(401).json({
        success: false,
        message:
          "Сессия недействительна. Выполните повторный вход.",
      });
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("id, status")
      .eq("id", tokenRecord.profile_id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.status !== "active"
    ) {
      clearCookies(res);

      return res.status(401).json({
        success: false,
        message:
          "Пользователь недоступен или заблокирован.",
      });
    }

    const {
      accessToken,
      refreshToken,
    } = await generateTokens(
      tokenRecord.profile_id,
      tokenRecord.id,
      tokenRecord.family_id
    );

    setCookies(
      res,
      accessToken,
      refreshToken
    );

    return res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(
  req,
  res,
  next
) {
  try {
    const refreshToken =
      req.cookies?.refreshToken;

    if (refreshToken) {
      await supabase
        .from("user_refresh_tokens")
        .update({
          is_revoked: true,
          revoked_at:
            new Date().toISOString(),
        })
        .eq(
          "token_hash",
          hashToken(refreshToken)
        );
    }

    clearCookies(res);

    return res.status(200).json({
      success: true,
      message: "Вы вышли из системы.",
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(
  req,
  res,
  next
) {
  try {
    const currentPassword = String(
      req.body?.currentPassword || ""
    );

    const newPassword = String(
      req.body?.newPassword || ""
    );

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Укажите текущий и новый пароли.",
      });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Новый пароль должен содержать минимум 8 символов.",
      });
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("id, password_hash")
      .eq("id", req.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        message: "Профиль не найден.",
      });
    }

    if (
      !verifyPassword(
        currentPassword,
        profile.password_hash
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Неверный текущий пароль.",
      });
    }

    const { error: updateError } =
      await supabase
        .from("profiles")
        .update({
          password_hash:
            hashPassword(newPassword),
        })
        .eq("id", req.user.id);

    if (updateError) {
      return res.status(500).json({
        success: false,
        message:
          "Не удалось изменить пароль.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Пароль успешно изменён.",
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(
  req,
  res,
  next
) {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
}

