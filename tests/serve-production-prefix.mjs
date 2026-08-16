import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const distRoot = path.join(root, "dist");
const prefix = "/gravity-loop";
const port = Number.parseInt(process.env.PORT ?? "4317", 10);

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

function failResponse(response, status, message) {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  response.end(message);
}

async function globalHeaders() {
  const source = await readFile(path.join(distRoot, "_headers"), "utf8");
  const block = source.match(/^\/\*\s*\r?\n((?:[ \t]+[^\r\n]+\r?\n)+)/m)?.[1];
  if (!block) throw new Error("Production _headers has no global rule.");
  return Object.fromEntries(
    block
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .map((line) => {
        const separator = line.indexOf(":");
        if (separator < 1) throw new Error(`Invalid global header: ${line}`);
        return [line.slice(0, separator).toLowerCase(), line.slice(separator + 1).trim()];
      }),
  );
}

const securityHeaders = await globalHeaders();

const server = createServer(async (request, response) => {
  try {
    const method = request.method ?? "GET";
    if (method !== "GET" && method !== "HEAD") {
      failResponse(response, 405, "Method not allowed");
      return;
    }

    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    if (requestUrl.pathname !== prefix && !requestUrl.pathname.startsWith(`${prefix}/`)) {
      failResponse(response, 404, "Outside the production proxy prefix");
      return;
    }

    const stripped = requestUrl.pathname.slice(prefix.length);
    const publicPath = stripped === "" || stripped === "/" ? "/index.html" : stripped;
    const segments = decodeURIComponent(publicPath)
      .split("/")
      .filter(Boolean);
    if (segments.some((segment) => segment === "." || segment === ".." || segment.includes("\\"))) {
      failResponse(response, 400, "Invalid path");
      return;
    }
    const filePath = path.join(distRoot, ...segments);
    const relative = path.relative(distRoot, filePath);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      failResponse(response, 400, "Invalid path");
      return;
    }

    const fileStats = await stat(filePath).catch(() => null);
    if (!fileStats?.isFile()) {
      const notFound = await readFile(path.join(distRoot, "404.html"));
      response.writeHead(404, {
        ...securityHeaders,
        "content-type": "text/html; charset=utf-8",
      });
      response.end(method === "HEAD" ? undefined : notFound);
      return;
    }

    const content = await readFile(filePath);
    response.writeHead(200, {
      ...securityHeaders,
      "content-type": mimeTypes.get(path.extname(filePath)) ?? "application/octet-stream",
      "content-length": String(content.byteLength),
      ...(segments.join("/") === "health.json" ? { "cache-control": "no-store" } : {}),
    });
    response.end(method === "HEAD" ? undefined : content);
  } catch (error) {
    failResponse(response, 500, error instanceof Error ? error.message : "Internal error");
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Gravity Loop production-prefix fixture: http://127.0.0.1:${port}${prefix}/\n`);
});
