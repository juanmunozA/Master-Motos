const { shouldUsePostgres } = require("../config/env");
const { readCsvData, writeCsvData } = require("../repositories/csvRepository");
const {
  ensureSchema,
  readWorkshopData,
  replaceWorkshopData,
} = require("../repositories/postgresRepository");
const { normalizeData } = require("../utils/dataShape");

async function getAllData() {
  if (shouldUsePostgres()) {
    await ensureSchema();
    return readWorkshopData();
  }

  return readCsvData();
}

async function replaceAllData(data) {
  const normalized = normalizeData(data);

  if (shouldUsePostgres()) {
    await ensureSchema();
    await replaceWorkshopData(normalized);
    return normalized;
  }

  writeCsvData(normalized);
  return normalized;
}

module.exports = { getAllData, replaceAllData, normalizeData };
