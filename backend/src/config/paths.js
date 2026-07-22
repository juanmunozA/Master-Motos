const path = require("path");
const { env } = require("./env");

const paths = {
  projectRoot: env.projectRoot,
  backendRoot: env.backendRoot,
  frontendRoot: env.frontendRoot,
  dataDir: path.join(env.backendRoot, "data"),
  clientDist: path.join(env.frontendRoot, "dist"),
  clientDev: env.frontendRoot,
  csvFile: path.join(env.backendRoot, "data", "master-data.csv"),
  xlsFile: path.join(env.backendRoot, "data", "master-data.xls"),
};

module.exports = { paths };
