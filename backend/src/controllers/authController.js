const { env, shouldRequireAuth, shouldUsePostgres } = require("../config/env");
const { verifyPassword } = require("../utils/password");
const {
  ensureSchema,
  findUserByUsername,
  seedAdminFromEnvIfEmpty,
} = require("../repositories/userRepository");
const {
  createSession,
  destroySession,
  getSessionFromRequest,
  buildSessionCookie,
  buildClearCookie,
} = require("../services/sessionService");
const { readBody, sendJson } = require("../utils/http");

async function login(request, response) {
  const body = JSON.parse((await readBody(request)) || "{}");
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (shouldUsePostgres()) {
    await ensureSchema();
    await seedAdminFromEnvIfEmpty(env);

    const user = await findUserByUsername(username);
    if (!user || !verifyPassword(password, user.password_hash)) {
      sendJson(response, 401, { ok: false, error: "Cedula o contraseña incorrectos." });
      return;
    }

    const displayName = user.display_name || user.username;
    const token = createSession({ userId: user.id, username: user.username, role: user.role, displayName });
    response.setHeader("Set-Cookie", buildSessionCookie(token));
    sendJson(response, 200, { ok: true, username: user.username, displayName, role: user.role });
    return;
  }

  const expectedUsername = env.authUsername.trim();
  const validUsername = Boolean(expectedUsername) && username === expectedUsername;
  const validPassword = validUsername && verifyPassword(password, env.authPasswordHash);

  if (!validUsername || !validPassword) {
    sendJson(response, 401, { ok: false, error: "Cedula o contraseña incorrectos." });
    return;
  }

  const displayName = env.authDisplayName || expectedUsername;
  const token = createSession({ username: expectedUsername, role: "admin", displayName });
  response.setHeader("Set-Cookie", buildSessionCookie(token));
  sendJson(response, 200, { ok: true, username: expectedUsername, displayName, role: "admin" });
}

function logout(request, response) {
  const { token } = getSessionFromRequest(request);
  destroySession(token);
  response.setHeader("Set-Cookie", buildClearCookie());
  sendJson(response, 200, { ok: true });
}

function me(request, response) {
  if (!shouldRequireAuth()) {
    sendJson(response, 200, { ok: true, authRequired: false });
    return;
  }

  const { session } = getSessionFromRequest(request);
  if (!session) {
    sendJson(response, 401, { ok: false, authRequired: true });
    return;
  }

  sendJson(response, 200, {
    ok: true,
    authRequired: true,
    username: session.username,
    displayName: session.displayName || session.username,
    role: session.role || "admin",
  });
}

module.exports = { login, logout, me };
