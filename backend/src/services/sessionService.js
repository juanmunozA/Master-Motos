const crypto = require("crypto");
const { env } = require("../config/env");

const SESSION_COOKIE = "mm_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const sessions = new Map();

function createSession(sessionData) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { ...sessionData, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

function getSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;

  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }

  return session;
}

function destroySession(token) {
  if (token) sessions.delete(token);
}

function parseCookies(request) {
  const header = request.headers.cookie || "";
  const cookies = {};

  for (const part of header.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) continue;
    const name = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value);
  }

  return cookies;
}

function getSessionFromRequest(request) {
  const token = parseCookies(request)[SESSION_COOKIE];
  return { token, session: getSession(token) };
}

function buildSessionCookie(token) {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (env.nodeEnv === "production") parts.push("Secure");
  return parts.join("; ");
}

function buildClearCookie() {
  const parts = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (env.nodeEnv === "production") parts.push("Secure");
  return parts.join("; ");
}

module.exports = {
  createSession,
  getSession,
  destroySession,
  getSessionFromRequest,
  buildSessionCookie,
  buildClearCookie,
};
