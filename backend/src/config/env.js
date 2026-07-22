const path = require("path");
const dotenv = require("dotenv");

const projectRoot = path.resolve(__dirname, "../../..");
const backendRoot = path.resolve(__dirname, "../..");
const frontendRoot = path.join(projectRoot, "frontend");

dotenv.config({ path: path.join(projectRoot, ".env") });

const env = {
  projectRoot,
  backendRoot,
  frontendRoot,
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT) || 8182,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  storageDriver: process.env.STORAGE_DRIVER || "auto",
  pgSsl: process.env.PGSSL === "true",
  authUsername: process.env.AUTH_USERNAME || "",
  authPasswordHash: process.env.AUTH_PASSWORD_HASH || "",
  authDisplayName: process.env.AUTH_DISPLAY_NAME || "",
};

function shouldUsePostgres() {
  if (env.storageDriver === "postgres") return true;
  if (env.storageDriver === "file") return false;
  return Boolean(env.databaseUrl);
}

function shouldRequireAuth() {
  if (shouldUsePostgres()) return true;
  return Boolean(env.authUsername && env.authPasswordHash);
}

module.exports = { env, shouldUsePostgres, shouldRequireAuth };
