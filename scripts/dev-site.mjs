import http from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";
import lead from "../api/lead.js";
import event from "../api/event.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const preview = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_LOCAL_PREVIEW === "1";
for (const name of preview ? [] : [".env.local", ".env"]) {
  const path = resolve(root, name);
  if (existsSync(path)) process.loadEnvFile(path);
}
const port = Number(process.env.PORT || process.argv[2] || 8123);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".xml": "application/xml", ".txt": "text/plain", ".mp4": "video/mp4", ".webm": "video/webm" };
http.createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (preview && url.pathname === "/__preview") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.end(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MUCO LABS · Local preview</title><style>body{margin:0;background:#0e1824;color:#edf4fb;font:17px/1.65 system-ui}main{max-width:900px;margin:auto;padding:60px 24px}h1{font-size:clamp(32px,5vw,56px);line-height:1.15}nav{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin:32px 0}a{color:inherit;text-decoration:none;border:1px solid #48627e;background:#172a3b;border-radius:12px;padding:24px;display:block}a:hover,a:focus-visible{outline:2px solid #9cdbff}small,p{color:#b5c8dc}strong{display:block;font-size:21px}</style><main><small>MUCO LABS · DEVELOPMENT</small><h1>Explore every workspace.</h1><p>Click Sign in to enter. No email, password or Google account is needed. These are fictional sample records, with edits saved only on this computer.</p><nav><a href="/"><strong>Public website</strong>Services, learning and contact</a><a href="http://localhost:3104/login"><strong>Customer</strong>Projects, requests, billing and profile</a><a href="http://localhost:3101/login"><strong>Admin</strong>Requests, people and studio operations</a><a href="http://localhost:3102/login"><strong>Employee</strong>Tasks, projects and mentoring</a><a href="http://localhost:3103/login"><strong>Intern</strong>Learning, work log and internship</a></nav><p>Supabase authentication, emails and invitations are disconnected for this preview. The live websites have not been changed.</p></main></html>`);
      return;
    }
    if (["/api/lead", "/api/event"].includes(url.pathname)) {
      if (preview) {
        res.setHeader("Content-Type", "application/json");
        if (url.pathname === "/api/event") res.writeHead(200).end(JSON.stringify({ ok: true, preview: true, recorded: false }));
        else res.writeHead(409).end(JSON.stringify({ ok: false, error: "Use the local Customer workspace Support page to save a sample request. No email or WhatsApp message has been sent." }));
        return;
      }
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
    if (req.method === "HEAD") res.end();
    else if (preview && extname(selected) === ".html") {
      let html = readFileSync(selected, "utf8");
      const ports = { client: 3104, portal: 3104, admin: 3101, employee: 3102, intern: 3103 };
      html = html.replace(/https:\/\/(client|portal|admin|employee|intern)\.mucolabs\.com/g, (_, name) => `http://localhost:${ports[name]}`);
      html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, script => /googletagmanager|google-analytics|analytics\.js/.test(script) ? "" : script);
      html = html.replace(/<noscript>[\s\S]*?<\/noscript>/gi, block => block.includes("googletagmanager") ? "" : block);
      html = html.replace("</body>", '<a href="/__preview" style="position:fixed;left:12px;bottom:12px;z-index:9999;background:#172b3a;color:#fff;padding:12px 16px;border:1px solid #9cdbff;border-radius:8px;font:14px system-ui;text-decoration:none">Local preview · Workspaces</a></body>');
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.end(html);
    } else res.end(readFileSync(selected));
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
