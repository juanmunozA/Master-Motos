const fs = require("fs");
const path = require("path");
const { paths } = require("../config/paths");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function getStaticRoot() {
  return fs.existsSync(path.join(paths.clientDist, "index.html"))
    ? paths.clientDist
    : paths.clientDev;
}

function cacheControlFor(filePath) {
  return path.normalize(filePath).includes(`${path.sep}assets${path.sep}`)
    ? "public, max-age=31536000, immutable"
    : "no-store";
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const staticRoot = getStaticRoot();
  const pathname = url.pathname === "/" || url.pathname === "/index.html" ? "/index.html" : url.pathname;
  const requested = decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(staticRoot, requested));

  if (!filePath.startsWith(staticRoot)) {
    response.writeHead(403);
    response.end("Prohibido");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      serveIndex(staticRoot, response);
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": cacheControlFor(filePath),
    });
    response.end(content);
  });
}

function serveIndex(staticRoot, response) {
  const indexPath = path.join(staticRoot, "index.html");
  fs.readFile(indexPath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("No encontrado. Ejecuta npm run build o npm run dev.");
      return;
    }

    response.writeHead(200, { "Content-Type": mimeTypes[".html"], "Cache-Control": "no-store" });
    response.end(content);
  });
}

module.exports = { serveStatic };
