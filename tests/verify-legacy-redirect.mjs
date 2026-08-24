import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactDirectory = resolve(repositoryRoot, "infra/legacy-redirect/site");
const redirectFile = resolve(artifactDirectory, "_redirects");
const expected = [
  "/ https://milos-apps.de/gravity-loop 308",
  "/* https://milos-apps.de/gravity-loop/:splat 308",
  "",
].join("\n");

const entries = await readdir(artifactDirectory, { withFileTypes: true });
const names = entries.map((entry) => entry.name).sort();

if (names.length !== 1 || names[0] !== "_redirects" || !entries[0]?.isFile()) {
  throw new Error(
    `Legacy redirect artifact must contain exactly one _redirects file; found: ${names.join(", ")}`,
  );
}

const contents = await readFile(redirectFile, "utf8");
const normalizedContents = contents.replaceAll("\r\n", "\n");
if (normalizedContents !== expected) {
  throw new Error("Legacy redirect rules differ from the reviewed 308 contract.");
}

if (normalizedContents.includes("_worker.js") || normalizedContents.includes("functions/")) {
  throw new Error("Legacy redirect artifact must not contain Pages Functions or a Worker.");
}

console.log("Legacy redirect artifact verified: exact root and path 308 rules, no Functions.");
