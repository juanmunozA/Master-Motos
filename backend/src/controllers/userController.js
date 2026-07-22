const crypto = require("crypto");
const { hashPassword } = require("../utils/password");
const { getSessionFromRequest } = require("../services/sessionService");
const {
  ensureSchema,
  listUsers,
  createUser,
  deleteUser,
  findUserByUsername,
} = require("../repositories/userRepository");
const { readBody, sendJson } = require("../utils/http");

function requireAdmin(request, response) {
  const { session } = getSessionFromRequest(request);
  if (!session || session.role !== "admin") {
    sendJson(response, 403, { ok: false, error: "Solo un administrador puede hacer esto." });
    return null;
  }
  return session;
}

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    createdAt: user.created_at,
  };
}

async function listUsersHandler(request, response) {
  if (!requireAdmin(request, response)) return;
  await ensureSchema();
  const users = await listUsers();
  sendJson(response, 200, { ok: true, users: users.map(toPublicUser) });
}

async function createUserHandler(request, response) {
  if (!requireAdmin(request, response)) return;
  await ensureSchema();

  const body = JSON.parse((await readBody(request)) || "{}");
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const displayName = String(body.displayName || "").trim();
  const role = body.role === "admin" ? "admin" : "user";

  if (!username || !password) {
    sendJson(response, 400, { ok: false, error: "Cedula y contraseña son obligatorias." });
    return;
  }
  if (password.length < 4) {
    sendJson(response, 400, { ok: false, error: "La contraseña debe tener al menos 4 caracteres." });
    return;
  }

  const existing = await findUserByUsername(username);
  if (existing) {
    sendJson(response, 409, { ok: false, error: "Ya existe un usuario con esa cedula." });
    return;
  }

  const id = crypto.randomUUID();
  await createUser({
    id,
    username,
    passwordHash: hashPassword(password),
    displayName: displayName || username,
    role,
  });

  sendJson(response, 200, {
    ok: true,
    user: { id, username, displayName: displayName || username, role },
  });
}

async function deleteUserHandler(request, response, userId) {
  const session = requireAdmin(request, response);
  if (!session) return;

  if (session.userId === userId) {
    sendJson(response, 400, { ok: false, error: "No puedes eliminar tu propio usuario." });
    return;
  }

  await deleteUser(userId);
  sendJson(response, 200, { ok: true });
}

module.exports = { listUsersHandler, createUserHandler, deleteUserHandler };
