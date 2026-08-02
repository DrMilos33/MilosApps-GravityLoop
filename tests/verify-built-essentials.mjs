import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const distRoot = path.join(root, "dist");
const html = await readFile(path.join(distRoot, "index.html"), "utf8");

function fail(message) {
  throw new Error(`built essentials verification failed: ${message}`);
}

function linkByMarker(marker) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const tag = tags.find((candidate) =>
    new RegExp(`\\b${marker}(?:=|\\s|>)`, "i").test(candidate),
  );
  if (!tag) fail(`missing ${marker} stylesheet link`);
  const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
  if (!href) fail(`${marker} has no href`);
  return href;
}

const hrefs = [
  linkByMarker("data-milos-app-essentials"),
  linkByMarker("data-milos-app-essentials-theme"),
];

if (new Set(hrefs).size !== 2) fail("base and theme stylesheets must remain separate");

for (const href of hrefs) {
  if (/^(?:data:|https?:|\/\/)/i.test(href)) {
    fail(`stylesheet must be an external same-origin build artifact: ${href}`);
  }
  const pathname = href.split(/[?#]/, 1)[0].replace(/^\.\//, "").replace(/^\//, "");
  if (!pathname || pathname.includes("..")) fail(`unsafe stylesheet path: ${href}`);
  await access(path.join(distRoot, ...pathname.split("/")));
}

const scripts = html.match(/<script\b[^>]*>/gi) ?? [];
const bootstrapTag = scripts.find((candidate) =>
  /\bdata-milos-app-essentials-bootstrap(?:=|\s|>)/i.test(candidate),
);
if (!bootstrapTag) fail("missing external essentials bootstrap");
const bootstrapSource = bootstrapTag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
if (!bootstrapSource || /^(?:data:|https?:|\/\/)/i.test(bootstrapSource)) {
  fail("essentials bootstrap must remain a relative same-origin module");
}

for (const artifact of [
  "milos-app-essentials.css",
  "milos-app-essentials-theme.css",
  "milos-app-essentials.js",
  "bootstrap.js",
  "verify.mjs",
]) {
  await access(path.join(distRoot, "vendor", "milosapps-essentials", "v1", artifact));
}

if (/style=["'][^"']*--milos-essential-/i.test(html)) {
  fail("inline essentials theme tokens are forbidden");
}

process.stdout.write(`built essentials verification: PASS (${hrefs.join(", ")})\n`);
