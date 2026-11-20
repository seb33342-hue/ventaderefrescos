"use strict";

// Verificacion del proyecto: integridad del HTML, ids usados por el JavaScript,
// sintaxis del script incrustado y del servidor, y presencia de la integracion Supabase.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const pagePath = path.join(root, "pagina_web_refresco_V0.22_SOLO_HUELLA.html");
const html = fs.readFileSync(pagePath, "utf8");
const problems = [];

function fail(message) {
  problems.push(message);
}

// 1) Marcadores de configuracion sin rellenar
["TU-PROYECTO", "sb_publishable_TU_CLAVE", "UUID_DEL_USUARIO_ADMIN"].forEach((marker) => {
  if (html.includes(marker)) fail(`Queda un marcador de configuracion pendiente: ${marker}`);
});

// 2) Todo $("id") debe existir en el marcado
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const usedIds = new Set([...html.matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]));
usedIds.forEach((id) => {
  if (!ids.has(id)) fail(`El codigo usa $("${id}") pero ese id no existe en el HTML.`);
});

// 3) Elementos imprescindibles del catalogo y del panel
["adminLoginForm", "adminEmail", "adminPassword", "adminSessionStatus", "passkeyLoginStatus",
 "productForm", "productName", "productPrice", "productSize", "productBrand",
 "adminProducts", "catalogGrid"].forEach((id) => {
  if (!ids.has(id)) fail(`Falta el elemento obligatorio #${id}.`);
});

// 4) Integracion Supabase presente
[
  ["window.__APP_CONFIG__", "la configuracion inyectada por el servidor"],
  ["refresco_catalog", "la tabla del catalogo"],
  ["rpc/is_admin", "la comprobacion de permisos de administrador"],
  ["grant_type=password", "el acceso con correo y contrasena"]
].forEach(([needle, label]) => {
  if (!html.includes(needle)) fail(`Falta ${label} (${needle}).`);
});

// 5) Sintaxis del JavaScript incrustado
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (scripts.length === 0) fail("No se encontro el script principal de la pagina.");
scripts.forEach((code, index) => {
  const file = path.join(os.tmpdir(), `appjet-page-script-${process.pid}-${index}.js`);
  fs.writeFileSync(file, code);
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (err) {
    const detail = (err.stderr || Buffer.from("")).toString().split("\n").slice(0, 8).join("\n");
    fail(`El script incrustado #${index + 1} tiene un error de sintaxis:\n${detail}`);
  } finally {
    fs.rmSync(file, { force: true });
  }
});

// 6) Sintaxis del servidor
try {
  execFileSync(process.execPath, ["--check", path.join(root, "server.js")], { stdio: "pipe" });
} catch (err) {
  fail("server.js tiene un error de sintaxis: " + (err.stderr || "").toString());
}

if (problems.length > 0) {
  console.error("Verificacion fallida:\n- " + problems.join("\n- "));
  process.exit(1);
}

console.log(`Verificacion correcta: ${ids.size} elementos, ${usedIds.size} referencias de JavaScript, script y servidor sin errores de sintaxis.`);
