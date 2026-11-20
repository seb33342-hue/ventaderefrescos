"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PAGE_FILE = path.join(__dirname, "pagina_web_refresco_V0.22_SOLO_HUELLA.html");
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

const config = {
  supabaseUrl: String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, ""),
  supabaseAnonKey: String(process.env.SUPABASE_ANON_KEY || "").trim(),
  whatsappNumber: String(process.env.WHATSAPP_NUMBER || "584123168479").trim()
};

const cloudEnabled =
  /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(config.supabaseUrl) &&
  config.supabaseAnonKey.length >= 24;

const configScript =
  "  <script>window.__APP_CONFIG__ = " +
  JSON.stringify(config).replace(/</g, "\\u003c") +
  ";</script>\n";

let cachedPage = null;

function buildPage() {
  if (cachedPage) return cachedPage;
  const html = fs.readFileSync(PAGE_FILE, "utf8");
  cachedPage = html.includes("</head>")
    ? html.replace("</head>", configScript + "</head>")
    : html;
  return cachedPage;
}

const baseHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    ...baseHeaders,
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  } catch (_) {
    res.writeHead(400, { ...baseHeaders, "Content-Type": "text/plain; charset=utf-8" });
    res.end("Solicitud invalida");
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { ...baseHeaders, "Allow": "GET, HEAD" });
    res.end("Metodo no permitido");
    return;
  }

  if (url.pathname === "/healthz") {
    let host = null;
    try {
      host = config.supabaseUrl ? new URL(config.supabaseUrl).host : null;
    } catch (_) {}
    sendJson(res, 200, { ok: true, cloud: cloudEnabled, supabaseHost: host });
    return;
  }

  const isPage =
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    url.pathname === "/" + path.basename(PAGE_FILE);

  if (isPage) {
    try {
      const page = buildPage();
      res.writeHead(200, {
        ...baseHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      });
      res.end(req.method === "HEAD" ? undefined : page);
    } catch (err) {
      console.error("No se pudo servir la pagina:", err);
      res.writeHead(500, { ...baseHeaders, "Content-Type": "text/plain; charset=utf-8" });
      res.end("No se pudo cargar la pagina.");
    }
    return;
  }

  res.writeHead(404, { ...baseHeaders, "Content-Type": "text/plain; charset=utf-8" });
  res.end("No encontrado");
});

server.listen(PORT, HOST, () => {
  console.log(`Catalogo de refrescos escuchando en http://${HOST}:${PORT}`);
  console.log(
    cloudEnabled
      ? "Supabase configurado: catalogo compartido."
      : "Supabase sin configurar: catalogo en modo local."
  );
});

function shutdown(signal) {
  console.log(`Recibida ${signal}, cerrando el servidor.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
