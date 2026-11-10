/**
 * Servidor local mínimo para probar la landing y el endpoint /api/lead
 * exactamente como se comportarán en Vercel.
 *
 *   npm run dev      → http://localhost:3000
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const lead = require("./api/lead.js");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function send(res, code, body, type) {
  res.writeHead(code, { "Content-Type": type || "text/plain; charset=utf-8" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1e6) req.destroy();
    });
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  // API
  if (pathname === "/api/lead" || pathname === "/api/lead/") {
    const raw = await readBody(req);
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
    const fakeRes = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      status(c) { this.statusCode = c; return this; },
      json(obj) {
        res.writeHead(this.statusCode, { "Content-Type": "application/json; charset=utf-8", ...this.headers });
        res.end(JSON.stringify(obj));
      },
      end() {
        res.writeHead(this.statusCode, this.headers);
        res.end();
      },
    };
    try {
      await lead(
        { method: req.method, headers: req.headers || {}, socket: req.socket, url: req.url, body },
        fakeRes
      );
    } catch (e) {
      console.error(e);
      if (!res.headersSent) send(res, 500, "error");
    }
    return;
  }

  // Estáticos: /public primero, luego raíz (index.html, etc.)
  if (pathname === "/" || pathname === "") pathname = "/index.html";
  const candidates = [path.join(PUBLIC, pathname), path.join(ROOT, pathname)];
  const file = candidates.find((p) => p.startsWith(ROOT) && fs.existsSync(p) && fs.statSync(p).isFile());

  if (!file) {
    const notFound = path.join(ROOT, "404.html");
    if (fs.existsSync(notFound)) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(fs.readFileSync(notFound));
    }
    return send(res, 404, "404 — no encontrado");
  }

  const ext = path.extname(file).toLowerCase();
  const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
  if (pathname.startsWith("/media/") || pathname.startsWith("/fonts/")) {
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  } else {
    headers["Cache-Control"] = "no-cache";
  }

  // Soporte de rangos (necesario para el vídeo en algunos navegadores)
  const stat = fs.statSync(file);
  const range = req.headers.range;
  if (range && ext === ".mp4") {
    const [s, e] = range.replace("bytes=", "").split("-");
    const start = parseInt(s, 10) || 0;
    const end = e ? parseInt(e, 10) : stat.size - 1;
    res.writeHead(206, {
      ...headers,
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
    });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }

  res.writeHead(200, { ...headers, "Content-Length": stat.size });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Landing en http://localhost:${PORT}`);
  console.log(`Formulario en modo ${process.env.RESEND_API_KEY ? "EMAIL" : "DEMO (sin RESEND_API_KEY)"}`);
});
