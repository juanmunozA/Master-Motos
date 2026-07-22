const http = require("http");
const { handleApiRoute } = require("./routes/apiRoutes");
const { serveStatic } = require("./routes/staticRoutes");

function createApp() {
  return http.createServer(async (request, response) => {
    try {
      if (request.url.startsWith("/api/")) {
        await handleApiRoute(request, response);
        return;
      }

      serveStatic(request, response);
    } catch (error) {
      console.error(error);
      response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ ok: false, error: error.message }));
    }
  });
}

module.exports = { createApp };
