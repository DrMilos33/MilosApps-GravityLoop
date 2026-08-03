import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = process.cwd();
const distRoot = path.join(root, "dist");
const html = await readFile(path.join(distRoot, "index.html"), "utf8");
const manifest = JSON.parse(await readFile(path.join(root, "milos-essentials.json"), "utf8"));

function fail(message) {
  throw new Error(`built essentials verification failed: ${message}`);
}

if (html.split(/\r?\n/).some((line) => /[\t ]+$/.test(line))) {
  fail("built index.html contains trailing whitespace");
}

if (
  !/<body\b[^>]*\bdata-milos-essentials-loading(?:=|\s|>)/i.test(html) ||
  !/\bdata-milos-app-loading(?:=|\s|>)/i.test(html)
) {
  fail("built public app must retain the mandatory startup loader markers");
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

function localBuildPath(value, label) {
  if (!value || /^(?:data:|https?:|\/\/)/i.test(value) || /[?#]/.test(value)) {
    fail(`${label} must be an exact same-origin build path: ${value ?? "missing"}`);
  }
  const pathname = value.replace(/^\.\//, "").replace(/^\//, "");
  if (!pathname || pathname.split("/").includes("..")) fail(`unsafe ${label} path: ${value}`);
  return path.join(distRoot, ...pathname.split("/"));
}

const consumerTag = scripts.find(
  (candidate) =>
    /\btype=["']module["']/i.test(candidate) &&
    !/\bdata-milos-app-essentials-bootstrap(?:=|\s|>)/i.test(candidate),
);
const consumerSource = consumerTag?.match(/\bsrc=["']([^"']+)["']/i)?.[1];
if (!consumerSource) fail("built app must reference its generated consumer module");
await access(localBuildPath(consumerSource, "consumer module"));

const iconTag = (html.match(/<img\b[^>]*>/gi) ?? []).find((candidate) =>
  /\bdata-milos-loading-icon(?:=|\s|>)/i.test(candidate),
);
const iconSource = iconTag?.match(/\bsrc=["']([^"']+)["']/i)?.[1];
const expectedIconSource = manifest.loading.iconRuntimePath ?? manifest.loading.iconPath;
const normalizeLocalUrl = (value) => value.replace(/^\.\//, "").replace(/^\//, "");
if (!iconSource || normalizeLocalUrl(iconSource) !== normalizeLocalUrl(expectedIconSource)) {
  fail(`built loading icon must use ${expectedIconSource}`);
}
const sourceIcon = await readFile(path.join(root, ...manifest.loading.iconPath.split("/")));
const builtIcon = await readFile(localBuildPath(iconSource, "loading icon"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
if (sha256(sourceIcon) !== sha256(builtIcon)) {
  fail("built loading icon must be byte-identical to loading.iconPath");
}

for (const artifact of [
  "milos-app-essentials.css",
  "milos-app-essentials-theme.css",
  "milos-app-essentials.js",
  "bootstrap.js",
  "verify.mjs",
  "essentials-manifest.schema.json",
]) {
  await access(path.join(distRoot, "vendor", "milosapps-essentials", "v1", artifact));
}

if (/style=["'][^"']*--milos-essential-/i.test(html)) {
  fail("inline essentials theme tokens are forbidden");
}

if (
  !/\bdata-milos-privacy-info(?:=|\s|>)/i.test(html) ||
  !html.includes("https://dev.milos-apps.de/datenschutz")
) {
  fail("built no-cookies app must retain permanent DEV privacy information");
}

process.stdout.write(`built essentials verification: PASS (${hrefs.join(", ")})\n`);
