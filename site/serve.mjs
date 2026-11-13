import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] ? path.resolve(process.argv[2]) : __dirname;
const port = Number(process.argv[3] || 5173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".toml": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".svg": "image/svg+xml",
};

http
  .createServer((req, res) => {
    let u = decodeURIComponent((req.url || "/").split("?")[0]);
    if (u.endsWith("/")) u += "index.html";
    else if (u === "/") u = "/index.html";
    let fp = path.normalize(path.join(root, u));
    if (!fp.startsWith(root)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    // Directory without trailing slash → index.html
    try {
      if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) {
        fp = path.join(fp, "index.html");
      }
    } catch {
      /* fall through to readFile 404 */
    }
    fs.readFile(fp, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("404 " + u);
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(fp)] || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(data);
    });
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`serving ${root} at http://127.0.0.1:${port}`);
  });
