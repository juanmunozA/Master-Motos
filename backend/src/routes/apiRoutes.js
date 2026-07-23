const { getData, health, saveData } = require("../controllers/dataController");
const { login, logout, me } = require("../controllers/authController");
const { listUsersHandler, createUserHandler, deleteUserHandler } = require("../controllers/userController");
const { shouldRequireAuth } = require("../config/env");
const { getSessionFromRequest } = require("../services/sessionService");
const { sendJson } = require("../utils/http");

function requireAuth(request, response) {
  if (!shouldRequireAuth()) return true;

  const { session } = getSessionFromRequest(request);
  if (!session) {
    sendJson(response, 401, { ok: false, error: "Sesión requerida." });
    return false;
  }

  return true;
}

async function handleApiRoute(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === "/api/health" && (request.method === "GET" || request.method === "HEAD")) {
    health(request, response);
    return;
  }

  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    await login(request, response);
    return;
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    logout(request, response);
    return;
  }

  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    me(request, response);
    return;
  }

  if (url.pathname === "/api/data" && request.method === "GET") {
    if (!requireAuth(request, response)) return;
    await getData(request, response);
    return;
  }

  if (url.pathname === "/api/data" && request.method === "POST") {
    if (!requireAuth(request, response)) return;
    await saveData(request, response);
    return;
  }

  if (url.pathname === "/api/users" && request.method === "GET") {
    if (!requireAuth(request, response)) return;
    await listUsersHandler(request, response);
    return;
  }

  if (url.pathname === "/api/users" && request.method === "POST") {
    if (!requireAuth(request, response)) return;
    await createUserHandler(request, response);
    return;
  }

  if (url.pathname.startsWith("/api/users/") && request.method === "DELETE") {
    if (!requireAuth(request, response)) return;
    const userId = decodeURIComponent(url.pathname.slice("/api/users/".length));
    await deleteUserHandler(request, response, userId);
    return;
  }

  sendJson(response, 404, { ok: false, error: "Ruta API no encontrada." });
}

module.exports = { handleApiRoute };
