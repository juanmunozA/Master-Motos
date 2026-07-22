const { getAllData, replaceAllData } = require("../models/workshopDataModel");
const { shouldRequireAuth } = require("../config/env");
const { getSessionFromRequest } = require("../services/sessionService");
const { readBody, sendJson } = require("../utils/http");

function isAdminRequest(request) {
  if (!shouldRequireAuth()) return true;
  const { session } = getSessionFromRequest(request);
  return Boolean(session && session.role === "admin");
}

function redactForNonAdmin(data) {
  return {
    invoices: (data.invoices || []).map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      sourceOrderId: invoice.sourceOrderId,
      sourceOrderNumber: invoice.sourceOrderNumber,
    })),
    orders: data.orders || [],
    parts: data.parts || [],
    settings: {},
    meta: {},
  };
}

async function getData(request, response) {
  const data = await getAllData();
  sendJson(response, 200, isAdminRequest(request) ? data : redactForNonAdmin(data));
}

async function saveData(request, response) {
  const payload = JSON.parse(await readBody(request));

  if (isAdminRequest(request)) {
    await replaceAllData(payload);
    sendJson(response, 200, { ok: true });
    return;
  }

  const current = await getAllData();
  const merged = {
    invoices: current.invoices,
    settings: current.settings,
    meta: current.meta,
    orders: Array.isArray(payload.orders) ? payload.orders : current.orders,
    parts: Array.isArray(payload.parts) ? payload.parts : current.parts,
  };
  await replaceAllData(merged);
  sendJson(response, 200, { ok: true });
}

function health(_request, response) {
  sendJson(response, 200, { ok: true, service: "master-motos-api" });
}

module.exports = { getData, saveData, health };
