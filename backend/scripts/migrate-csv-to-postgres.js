const { ensureSchema, replaceWorkshopData } = require("../src/repositories/postgresRepository");
const { readCsvData } = require("../src/repositories/csvRepository");

async function main() {
  const data = readCsvData();
  await ensureSchema();
  await replaceWorkshopData(data);
  console.log("Migracion completada: CSV -> PostgreSQL");
  console.log(`Facturas: ${data.invoices.length}`);
  console.log(`Ingresos: ${data.orders.length}`);
  console.log(`Repuestos: ${data.parts.length}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
