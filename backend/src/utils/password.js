const crypto = require("crypto");

const KEY_LENGTH = 64;

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(plainPassword, salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString("hex")}`;
}

function verifyPassword(plainPassword, storedHash) {
  const [salt, hashHex] = String(storedHash || "").split(":");
  if (!salt || !hashHex) return false;

  const derivedKey = crypto.scryptSync(plainPassword, salt, KEY_LENGTH);
  const storedKey = Buffer.from(hashHex, "hex");

  if (derivedKey.length !== storedKey.length) return false;
  return crypto.timingSafeEqual(derivedKey, storedKey);
}

module.exports = { hashPassword, verifyPassword };
