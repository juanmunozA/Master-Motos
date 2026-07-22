const { getPool } = require("../config/database");
const { normalizeData } = require("../utils/dataShape");

async function ensureSchema() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS workshop_records (
      type TEXT NOT NULL,
      id TEXT NOT NULL,
      number TEXT,
      record_date TEXT,
      name TEXT,
      total NUMERIC,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (type, id)
    );
  `);
}

async function readWorkshopData() {
  const result = await getPool().query(`
    SELECT type, payload
    FROM workshop_records
    ORDER BY
      CASE type
        WHEN 'invoice' THEN 1
        WHEN 'order' THEN 2
        WHEN 'part' THEN 3
        WHEN 'settings' THEN 4
        WHEN 'meta' THEN 5
        ELSE 9
      END,
      COALESCE(number, '') DESC
  `);

  const data = normalizeData();
  for (const row of result.rows) {
    if (row.type === "settings") data.settings = row.payload;
    if (row.type === "meta") data.meta = row.payload;
    if (row.type === "invoice") data.invoices.push(row.payload);
    if (row.type === "order") data.orders.push(row.payload);
    if (row.type === "part") data.parts.push(row.payload);
  }

  data.invoices.sort((a, b) => Number(b.invoiceNumber) - Number(a.invoiceNumber));
  data.orders.sort((a, b) => Number(b.orderNumber) - Number(a.orderNumber));
  data.parts.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

  return data;
}

async function replaceWorkshopData(data) {
  const rows = buildRows(data);
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM workshop_records");

    for (const row of rows) {
      await client.query(
        `
          INSERT INTO workshop_records (type, id, number, record_date, name, total, payload, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
        `,
        [
          row.type,
          row.id,
          row.number,
          row.recordDate,
          row.name,
          row.total,
          JSON.stringify(row.payload),
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function buildRows(data) {
  const rows = [
    {
      type: "settings",
      id: "settings",
      number: "",
      recordDate: "",
      name: "Datos del taller",
      total: null,
      payload: data.settings || {},
    },
    {
      type: "meta",
      id: "meta",
      number: "",
      recordDate: "",
      name: "Consecutivos",
      total: null,
      payload: data.meta || {},
    },
  ];

  for (const invoice of data.invoices || []) {
    rows.push({
      type: "invoice",
      id: invoice.id || String(invoice.invoiceNumber),
      number: String(invoice.invoiceNumber || ""),
      recordDate: invoice.invoiceDate || "",
      name: invoice.customerName || "",
      total: Number(invoice.totals?.total) || 0,
      payload: invoice,
    });
  }

  for (const order of data.orders || []) {
    rows.push({
      type: "order",
      id: order.id || String(order.orderNumber),
      number: String(order.orderNumber || ""),
      recordDate: order.orderDate || "",
      name: order.customerName || "",
      total: null,
      payload: order,
    });
  }

  for (const part of data.parts || []) {
    rows.push({
      type: "part",
      id: part.id || part.code,
      number: part.code || "",
      recordDate: "",
      name: part.name || "",
      total: Number(part.price) || 0,
      payload: part,
    });
  }

  return rows;
}

module.exports = { ensureSchema, readWorkshopData, replaceWorkshopData };
