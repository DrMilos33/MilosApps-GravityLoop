import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const distRoot = path.join(root, "dist");

function sourceCommit() {
  const candidates = [
    process.env.GRAVITY_LOOP_SOURCE_SHA,
    process.env.CF_PAGES_COMMIT_SHA,
    process.env.GITHUB_SHA,
  ];
  const provided = candidates.find((value) => value?.trim())?.trim().toLowerCase();
  const value =
    provided ??
    execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    })
      .trim()
      .toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(value)) {
    throw new Error(`Invalid production source commit: ${value}`);
  }
  return value;
}

const commit = sourceCommit();
const healthPath = path.join(distRoot, "health.json");
const health = JSON.parse(await readFile(healthPath, "utf8"));
const expectedHealth = {
  status: "ok",
  app: "gravity-loop",
  environment: "production",
  productionApproved: true,
};

for (const [key, expected] of Object.entries(expectedHealth)) {
  if (health[key] !== expected) {
    throw new Error(`Production health ${key} must be ${JSON.stringify(expected)}.`);
  }
}

await writeFile(
  healthPath,
  `${JSON.stringify({ ...expectedHealth, sourceCommit: commit }, null, 2)}\n`,
  "utf8",
);
await writeFile(
  path.join(distRoot, "production-artifact.json"),
  `${JSON.stringify(
    {
      appKey: "gravity-loop",
      environment: "production",
      productionApproved: true,
      sourceCommit: commit,
      provider: "cloudflare-pages",
      projectName: "milosapps-gravity-loop-production",
      functions: false,
      outputDirectory: "dist",
    },
    null,
    2,
  )}\n`,
  "utf8",
);

process.stdout.write(`production artifact stamped: ${commit}\n`);
