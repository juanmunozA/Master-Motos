const fs = require("fs");
const { paths } = require("../config/paths");
const { writeExcelBackup } = require("../services/excelBackupService");

const emptyData = {
  invoices: [],
  orders: [],
  parts: [],
  settings: null,
  meta: {},
};

function cloneEmptyData() {
  return JSON.parse(JSON.stringify(emptyData));
}

function ensureDataFiles() {
  if (!fs.existsSync(paths.dataDir)) fs.mkdirSync(paths.dataDir, { recursive: true });
  if (!fs.existsSync(paths.csvFile)) writeCsvData(emptyData);
}

function readCsvData() {
  ensureDataFiles();
  const text = fs.readFileSync(paths.csvFile, "utf8").trim();
  if (!text) return cloneEmptyData();

  const data = cloneEmptyData();
  const lines = text.split(/\r?\n/).slice(1);

  for (const line of lines) {
    if (!line.trim()) continue;
    const [type, id, number, date, name, total, payload] = splitCsvLine(line);
    if (!type || !payload) continue;

    try {
      const item = decodePayload(payload);
      if (type === "settings") data.settings = item;
      if (type === "meta") data.meta = item;
      if (type === "invoice") data.invoices.push(item);
      if (type === "order") data.orders.push(item);
      if (type === "part") data.parts.push(item);
    } catch {
      console.warn(`No se pudo leer registro ${type}:${id || number || date || name || total}`);
    }
  }

  return data;
}

function writeCsvData(data) {
  if (!fs.existsSync(paths.dataDir)) fs.mkdirSync(paths.dataDir, { recursive: true });

  const rows = [["tipo", "id", "numero", "fecha", "nombre", "total", "json_base64"]];
  const pushRow = (type, item, number, date, name, total) => {
    rows.push([
      type,
      item?.id || type,
      number || "",
      date || "",
      name || "",
      total || "",
      encodePayload(item || {}),
    ]);
  };

  pushRow("settings", data.settings || {}, "", "", "Datos del taller", "");
  pushRow("meta", data.meta || {}, "", "", "Consecutivos", "");
  (data.invoices || []).forEach((invoice) =>
    pushRow(
      "invoice",
      invoice,
      invoice.invoiceNumber,
      invoice.invoiceDate,
      invoice.customerName,
      invoice.totals?.total,
    ),
  );
  (data.orders || []).forEach((order) =>
    pushRow("order", order, order.orderNumber, order.orderDate, order.customerName, ""),
  );
  (data.parts || []).forEach((part) =>
    pushRow("part", part, part.code, "", part.name, part.price),
  );

  fs.writeFileSync(paths.csvFile, rows.map((row) => row.map(csvEscape).join(",")).join("\n"), "utf8");
  writeExcelBackup(data);
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function csvUnescape(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('"')) return trimmed;
  return trimmed.slice(1, -1).replaceAll('""', '"');
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells.map(csvUnescape);
}

function encodePayload(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function decodePayload(value) {
  return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
}

module.exports = { readCsvData, writeCsvData };
