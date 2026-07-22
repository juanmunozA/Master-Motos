const fs = require("fs");
const { paths } = require("../config/paths");

function writeExcelBackup(data) {
  const html = `
    <!doctype html>
    <html>
      <head><meta charset="UTF-8" /></head>
      <body>
        ${table("Facturas", ["Numero", "Fecha", "Cliente", "Moto", "Placa", "Total"], (data.invoices || []).map((item) => [
          item.invoiceNumber,
          item.invoiceDate,
          item.customerName,
          item.motorcycle,
          item.plate,
          item.totals?.total,
        ]))}
        ${table("Ingresos", ["Numero", "Fecha", "Cliente", "Moto", "Placa", "Atiende", "Motivo"], (data.orders || []).map((item) => [
          item.orderNumber,
          item.orderDate,
          item.customerName,
          item.motorcycle,
          item.plate,
          item.attendant,
          item.reason,
        ]))}
        ${table("Inventario", ["Codigo", "Repuesto", "Precio", "Stock"], (data.parts || []).map((item) => [
          item.code,
          item.name,
          item.price,
          item.stock,
        ]))}
      </body>
    </html>
  `;
  fs.writeFileSync(paths.xlsFile, html, "utf8");
}

function table(title, headers, rows) {
  return `
    <h2>${htmlEscape(title)}</h2>
    <table border="1">
      <thead><tr>${headers.map((header) => `<th>${htmlEscape(header)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows
          .map((row) => `<tr>${row.map((cell) => `<td>${htmlEscape(cell)}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>
  `;
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

module.exports = { writeExcelBackup };
