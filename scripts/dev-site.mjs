import http from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";
import lead from "../api/lead.js";
import event from "../api/event.js";

const root = fileURLToPath(new URL("../", import.meta.url));
for (const name of [".env.local", ".env"]) {
  const path = resolve(root, name);
  if (existsSync(path)) process.loadEnvFile(path);
}
const port = Number(process.env.PORT || process.argv[2] || 8123);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".xml": "application/xml", ".txt": "text/plain", ".mp4": "video/mp4", ".webm": "video/webm" };
http.createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (["/api/lead", "/api/event"].includes(url.pathname)) {
      if (req.method === "POST" && req.headers.origin && ![`http://localhost:${port}`, `http://127.0.0.1:${port}`].includes(req.headers.origin)) { res.writeHead(403).end(); return; }
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 65536) { res.writeHead(413).end("Request too large"); return; }
      }
      req.body = body;
      req.headers["x-forwarded-for"] = req.socket.remoteAddress || "local";
      res.status = code => { res.statusCode = code; return res; };
      res.json = value => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(value)); return res; };
      await (url.pathname === "/api/lead" ? lead : event)(req, res);
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405).end(); return; }
    let name = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (!name) name = "index.html";
    if (!extname(name)) name += ".html";
    const path = resolve(root, name);
    const allowed = path.startsWith(root.endsWith(sep) ? root : root + sep) && !name.split(/[\\/]/).some(part => part.startsWith("."))
      && (name.startsWith("assets/") || (!/[\\/]/.test(name) && (name.endsWith(".html") || ["style.css", "main.js", "analytics.js", "robots.txt", "sitemap.xml", "llms.txt", "site.webmanifest", "favicon.svg", "logo-mark.svg", "logo-full.svg"].includes(name))));
    const found = allowed && existsSync(path) && statSync(path).isFile();
    res.statusCode = found ? 200 : 404;
    const selected = found ? path : resolve(root, "404.html");
    res.setHeader("Content-Type", types[extname(selected)] || "application/octet-stream");
    const config = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));
    for (const header of config.headers.find(h => h.source === "/(.*)").headers) {
      // HTTPS upgrade belongs to production; preserve the rest locally.
      res.setHeader(header.key, header.value.replace("; upgrade-insecure-requests", ""));
    }
    if (req.method === "HEAD") res.end(); else res.end(readFileSync(selected));
  } catch { if (!res.headersSent) res.writeHead(500); res.end("Local request failed. Check setup and try again."); }
}).on("error", error => {
  // Without this the server dies on an unhandled 'error' event and prints a
  // stack trace, which hides the one thing worth knowing: the port is taken.
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the other dev server, or pick another port:
  node scripts/dev-site.mjs ${port + 1}`);
    process.exit(1);
  }
  throw error;
}).listen(port, "127.0.0.1", () => console.log(`Website + API: http://localhost:${port}`));
