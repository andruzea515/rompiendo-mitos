const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");

const rootDir = __dirname;
const certPath = path.join(rootDir, ".https", "localhost.pfx");
const certPassphrase = process.env.HTTPS_CERT_PASSPHRASE || "copilot-local";
const port = Number(process.env.HTTPS_PORT || 8443);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp"
};

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl, `https://localhost:${port}`);
  const safePath = path.normalize(decodeURIComponent(url.pathname)).replace(/^([.][.][/\\])+/, "");
  let resolvedPath = path.join(rootDir, safePath);

  if (resolvedPath.endsWith(path.sep)) {
    resolvedPath = path.join(resolvedPath, "index.html");
  }

  return resolvedPath;
}

const server = https.createServer(
  {
    pfx: fs.readFileSync(certPath),
    passphrase: certPassphrase
  },
  (req, res) => {
    const filePath = resolveRequestPath(req.url);

    if (!filePath.startsWith(rootDir)) {
      send(res, 403, "Forbidden");
      return;
    }

    fs.stat(filePath, (statError, stats) => {
      if (statError) {
        send(res, 404, "Not found");
        return;
      }

      const targetPath = stats.isDirectory() ? path.join(filePath, "index.html") : filePath;

      fs.readFile(targetPath, (readError, content) => {
        if (readError) {
          send(res, 404, "Not found");
          return;
        }

        const extension = path.extname(targetPath).toLowerCase();
        send(res, 200, content, {
          "Content-Type": mimeTypes[extension] || "application/octet-stream",
          "Cache-Control": "no-cache"
        });
      });
    });
  }
);

server.listen(port, () => {
  console.log(`HTTPS server ready at https://localhost:${port}`);
});