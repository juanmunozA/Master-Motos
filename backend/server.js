const { createApp } = require("./src/app");
const { env } = require("./src/config/env");

const server = createApp();

server.listen(env.port, env.host, () => {
  console.log(`API Master Motos lista en http://${env.host}:${env.port}`);
  console.log(`Aplicacion local: http://${env.host}:${env.port}/`);
  console.log(`Almacenamiento: ${env.storageDriver}`);
});
