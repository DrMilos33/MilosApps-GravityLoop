import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const distRoot = path.join(root, "dist");

function fail(message) {
  throw new Error(`production artifact verification failed: ${message}`);
}

const appManifest = JSON.parse(await readFile(path.join(root, "milos-app.json"), "utf8"));
const essentialsManifest = JSON.parse(
  await readFile(path.join(root, "milos-essentials.json"), "utf8"),
);
const health = JSON.parse(await readFile(path.join(distRoot, "health.json"), "utf8"));
const metadata = JSON.parse(
  await readFile(path.join(distRoot, "production-artifact.json"), "utf8"),
);
const html = await readFile(path.join(distRoot, "index.html"), "utf8");
const headers = await readFile(path.join(distRoot, "_headers"), "utf8");
const robots = await readFile(path.join(distRoot, "robots.txt"), "utf8");
const sitemap = await readFile(path.join(distRoot, "sitemap.xml"), "utf8");

const productionCanonical = "https://milos-apps.de/gravity-loop";
const productionBasePath = "/gravity-loop/";

const expectedSource = (
  process.env.GRAVITY_LOOP_SOURCE_SHA ??
  process.env.CF_PAGES_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" })
).trim().toLowerCase();
if (!/^[0-9a-f]{40}$/.test(expectedSource)) fail("source commit is not a full SHA-1");

for (const [label, manifest] of [
  ["shell manifest", appManifest],
  ["essentials manifest", essentialsManifest],
]) {
  if (manifest.environment !== "production" || manifest.productionApproved !== true) {
    fail(`${label} must declare the approved production environment`);
  }
}
if (
  appManifest.shellContract?.version !== "2.0.3" ||
  appManifest.shellContract?.sharedCommit !== "ed898412306e22c6ae1b10ee8953df29f8acd627"
) {
  fail("public app shell pin changed unexpectedly");
}
if (
  essentialsManifest.essentialsContract?.version !== "1.1.5" ||
  essentialsManifest.essentialsContract?.sharedCommit !==
    "2942132ad3bf6cf39edc9f52ed918de6a230be23"
) {
  fail("public app essentials pin changed unexpectedly");
}
if (
  appManifest.dev?.url !== "https://drmilos33.github.io/MilosApps-GravityLoop/" ||
  appManifest.dev?.healthUrl !==
    "https://drmilos33.github.io/MilosApps-GravityLoop/health.json"
) {
  fail("the independent DEV contract must remain unchanged");
}
if (appManifest.integration?.portalRoute !== "/gravity-loop") {
  fail("shell integration must use the same-host production route");
}
if (
  essentialsManifest.essentialsContract?.runtimeBasePath !==
    "/gravity-loop/vendor/milosapps-essentials/v1" ||
  essentialsManifest.loading?.iconRuntimePath !==
    "/gravity-loop/gravity-loop-mark.svg" ||
  essentialsManifest.consumerEntryModule?.runtimePath !==
    "/src/main.ts"
) {
  fail("essentials public URLs and source entry must match the production contract");
}

const expectedHealth = {
  status: "ok",
  app: "gravity-loop",
  environment: "production",
  productionApproved: true,
  adsEnabled: false,
  canonicalUrl: productionCanonical,
  publicBasePath: productionBasePath,
  sourceCommit: expectedSource,
};
if (JSON.stringify(health) !== JSON.stringify(expectedHealth)) {
  fail(`health identity mismatch: ${JSON.stringify(health)}`);
}
if (
  metadata.appKey !== "gravity-loop" ||
  metadata.environment !== "production" ||
  metadata.productionApproved !== true ||
  metadata.adsEnabled !== false ||
  metadata.clientTracking !== false ||
  metadata.serviceWorker !== false ||
  metadata.canonicalUrl !== productionCanonical ||
  metadata.publicBasePath !== productionBasePath ||
  metadata.originBasePath !== "/" ||
  metadata.portalProxyPrefix !== "/gravity-loop" ||
  metadata.sourceCommit !== expectedSource ||
  metadata.provider !== "cloudflare-pages" ||
  metadata.projectName !== "milosapps-gravity-loop-production" ||
  metadata.outputDirectory !== "dist" ||
  metadata.functions !== false
) {
  fail(`production metadata mismatch: ${JSON.stringify(metadata)}`);
}

if (!html.includes("https://milos-apps.de/datenschutz")) {
  fail("built app is missing the production privacy URL");
}
const canonicalMatches = [
  ...html.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi),
];
if (
  canonicalMatches.length !== 1 ||
  canonicalMatches[0]?.[1] !== productionCanonical
) {
  fail("built app must declare exactly one production canonical URL");
}
const openGraphUrls = [
  ...html.matchAll(/<meta\b[^>]*\bproperty=["']og:url["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/gi),
].map((match) => match[1]);
if (openGraphUrls.length !== 1 || openGraphUrls[0] !== productionCanonical) {
  fail("built app must declare exactly one production Open Graph URL");
}
const manifest = JSON.parse(await readFile(path.join(distRoot, "manifest.webmanifest"), "utf8"));
if (
  manifest.id !== "/gravity-loop" ||
  manifest.start_url !== productionBasePath ||
  manifest.scope !== productionBasePath ||
  !manifest.icons?.every(({ src }) => typeof src === "string" && src.startsWith("./"))
) {
  fail("web manifest must be scoped to the production prefix");
}
const localResourceUrls = [
  ...html.matchAll(/\b(?:src|href)=["'](\/[^"']+)["']/gi),
].map((match) => match[1]);
if (
  localResourceUrls.length === 0 ||
  localResourceUrls.some((url) => !url.startsWith(productionBasePath))
) {
  fail(`all root-relative browser resources must stay under ${productionBasePath}`);
}
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (match) => match[1],
);
if (
  !sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>') ||
  !sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"') ||
  sitemapLocations.length !== 1 ||
  sitemapLocations[0] !== productionCanonical
) {
  fail("sitemap must contain exactly the production canonical URL");
}
const robotsSitemaps = [...robots.matchAll(/^Sitemap:\s*(\S+)\s*$/gim)].map(
  (match) => match[1],
);
if (
  !/^User-agent:\s*\*\s*$/im.test(robots) ||
  !/^Allow:\s*\/\s*$/im.test(robots) ||
  robotsSitemaps.length !== 1 ||
  robotsSitemaps[0] !== `${productionCanonical}/sitemap.xml`
) {
  fail("robots.txt must allow crawling and reference exactly the production sitemap");
}
if (html.includes("https://dev.milos-apps.de/datenschutz")) {
  fail("built app contains the DEV privacy URL");
}
if (!html.includes('data-testid="game-guide"') || !html.includes("So funktioniert Gravity Loop")) {
  fail("built app is missing the crawlable game guide");
}
if (/pagead2\.googlesyndication|adsbygoogle|data-ad-client|data-ad-slot/i.test(html)) {
  fail("advertising must remain disabled until a separate approval");
}
if (/<(?:script|style)\b[^>]*\b(?:src|href)=["']data:/i.test(html)) {
  fail("built app must not inline executable or stylesheet data URLs");
}
if (/<style\b/i.test(html) || /\sstyle=["']/i.test(html)) {
  fail("built app contains inline styles incompatible with the production CSP");
}

const requiredHeaders = [
  "Content-Security-Policy:",
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "Cross-Origin-Opener-Policy: same-origin",
  "Cross-Origin-Resource-Policy: same-origin",
  "Referrer-Policy: no-referrer",
  "X-Content-Type-Options: nosniff",
  "X-Frame-Options: DENY",
  "/health.json",
  "Cache-Control: no-store",
];
for (const required of requiredHeaders) {
  if (!headers.includes(required)) fail(`_headers is missing ${required}`);
}
if (/unsafe-inline|unsafe-eval|(?:^|[; ])data:/i.test(headers)) {
  fail("production CSP weakens the self-only execution/style contract");
}

async function collectFiles(directory, relative = "") {
  const results = [];
  for (const name of (await readdir(directory)).sort()) {
    const fullPath = path.join(directory, name);
    const relativePath = relative ? `${relative}/${name}` : name;
    const stats = await lstat(fullPath);
    if (stats.isSymbolicLink()) fail(`symbolic link forbidden in artifact: ${relativePath}`);
    if (stats.isDirectory()) results.push(...(await collectFiles(fullPath, relativePath)));
    else results.push({ fullPath, relativePath });
  }
  return results;
}

const files = await collectFiles(distRoot);
for (const forbidden of ["_worker.js", "_routes.json"] ) {
  if (files.some(({ relativePath }) => relativePath === forbidden)) {
    fail(`Cloudflare Functions artifact is forbidden: ${forbidden}`);
  }
}
if (files.some(({ relativePath }) => relativePath.endsWith(".map"))) {
  fail("source maps are forbidden in the production artifact");
}
if (!files.some(({ relativePath }) => relativePath === "404.html")) {
  fail("fail-closed 404.html is missing");
}
if (files.some(({ relativePath }) => /(?:^|\/)(?:sw|service-worker)\.js$/i.test(relativePath))) {
  fail("this static app must not ship an unscoped service worker");
}
const runtimeText = [
  html,
  ...(await Promise.all(
    files
      .filter(({ relativePath }) => relativePath.endsWith(".js"))
      .map(({ fullPath }) => readFile(fullPath, "utf8")),
  )),
].join("\n");
if (/serviceWorker\s*\.\s*register|navigator\s*\.\s*sendBeacon|cloudflareinsights|googletagmanager|\bgtag\s*\(|posthog|plausible\.io/i.test(runtimeText)) {
  fail("client-side service-worker or tracking runtime is forbidden");
}

const digest = createHash("sha256");
for (const { fullPath, relativePath } of files) {
  digest.update(relativePath.replaceAll("\\", "/"), "utf8");
  digest.update("\0");
  digest.update(await readFile(fullPath));
  digest.update("\0");
}
process.stdout.write(
  `production artifact verification: PASS source:${expectedSource} sha256:${digest.digest("hex")} files:${files.length}\n`,
);
