const { hashPassword } = require("../src/utils/password");

const plainPassword = process.argv[2];

if (!plainPassword) {
  console.error("Uso: node backend/scripts/hash-password.js <contraseña>");
  process.exit(1);
}

console.log(hashPassword(plainPassword));
