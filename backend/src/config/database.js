const { Pool } = require("pg");
const { env } = require("./env");

let pool;

function getPool() {
  if (!env.databaseUrl) {
    throw new Error("Falta DATABASE_URL en .env para usar PostgreSQL.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.pgSsl ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool;
}

module.exports = { getPool };
