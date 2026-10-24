const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = process.cwd();
const port = Number(process.env.PORT || 4179);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${port}`).pathname);
    const file = path.join(root, pathname === "/" ? "index.html" : pathname);
    if (!file.startsWith(root)) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    const body = await fs.readFile(file);
    response.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(body);
  } catch (error) {
    response.writeHead(error.statusCode || 404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error.statusCode === 403 ? "Forbidden" : "Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Affiliate user mock listening on http://127.0.0.1:${port}`);
});
