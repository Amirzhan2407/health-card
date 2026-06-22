import crypto from "crypto";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, savedHash) {
  if (!password || !savedHash) return false;

  const [salt, hash] = String(savedHash).split(":");
  if (!salt || !hash) return false;

  const checkHash = crypto
    .scryptSync(String(password), salt, 64)
    .toString("hex");

  return hash === checkHash;
}
