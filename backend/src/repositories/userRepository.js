const { getPool } = require("../config/database");

async function ensureSchema() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function findUserByUsername(username) {
  const result = await getPool().query(
    `SELECT id, username, password_hash, display_name, role FROM app_users WHERE username = $1`,
    [username],
  );
  return result.rows[0] || null;
}

async function listUsers() {
  const result = await getPool().query(
    `SELECT id, username, display_name, role, created_at FROM app_users ORDER BY created_at ASC`,
  );
  return result.rows;
}

async function countUsers() {
  const result = await getPool().query(`SELECT COUNT(*)::int AS count FROM app_users`);
  return result.rows[0].count;
}

async function createUser({ id, username, passwordHash, displayName, role }) {
  await getPool().query(
    `INSERT INTO app_users (id, username, password_hash, display_name, role) VALUES ($1, $2, $3, $4, $5)`,
    [id, username, passwordHash, displayName, role],
  );
}

async function deleteUser(id) {
  await getPool().query(`DELETE FROM app_users WHERE id = $1`, [id]);
}

async function seedAdminFromEnvIfEmpty(env) {
  const count = await countUsers();
  if (count > 0) return;
  if (!env.authUsername || !env.authPasswordHash) return;

  await createUser({
    id: require("crypto").randomUUID(),
    username: env.authUsername,
    passwordHash: env.authPasswordHash,
    displayName: env.authDisplayName || env.authUsername,
    role: "admin",
  });
}

module.exports = {
  ensureSchema,
  findUserByUsername,
  listUsers,
  countUsers,
  createUser,
  deleteUser,
  seedAdminFromEnvIfEmpty,
};
