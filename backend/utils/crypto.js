
import crypto from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

function isBcryptHash(value) {
  return /^\$2[aby]\$\d{2}\$/.test(String(value || ""));
}

function verifyScryptPassword(password, savedHash) {
  const parts = String(savedHash || "").split(":");

  if (parts.length !== 2) {
    return false;
  }

  const [salt, storedHash] = parts;

  if (!salt || !storedHash) {
    return false;
  }

  try {
    const calculatedHash = crypto
      .scryptSync(String(password), salt, 64)
      .toString("hex");

    const storedBuffer = Buffer.from(storedHash, "hex");
    const calculatedBuffer = Buffer.from(calculatedHash, "hex");

    if (
      storedBuffer.length === 0 ||
      storedBuffer.length !== calculatedBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      storedBuffer,
      calculatedBuffer
    );
  } catch {
    return false;
  }
}

export function hashPassword(password) {
  if (!password) {
    throw new Error("Пароль не указан.");
  }

  return bcrypt.hashSync(
    String(password),
    BCRYPT_ROUNDS
  );
}

export function verifyPassword(password, savedHash) {
  if (!password || !savedHash) {
    return false;
  }

  try {
    if (isBcryptHash(savedHash)) {
      return bcrypt.compareSync(
        String(password),
        String(savedHash)
      );
    }

    return verifyScryptPassword(
      password,
      savedHash
    );
  } catch {
    return false;
  }
}

