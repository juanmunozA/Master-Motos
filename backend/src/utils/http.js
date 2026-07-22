function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10_000_000) {
        request.destroy();
        reject(new Error("Payload demasiado grande"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

module.exports = { readBody, sendJson };
