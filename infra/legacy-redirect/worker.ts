const legacyHostname = "gravity-loop.milos-apps.de";
const canonicalBase = "https://milos-apps.de/gravity-loop";
const allowedMethods = new Set(["GET", "HEAD"]);

const redirectHeaders = {
  "Cache-Control": "public, max-age=300",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
} as const;

export function redirectLegacyRequest(request: Request): Response {
  const source = new URL(request.url);

  if (source.hostname !== legacyHostname) {
    return new Response(null, { status: 404 });
  }

  if (!allowedMethods.has(request.method)) {
    return new Response(null, {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }

  const suffix = source.pathname === "/" ? "" : source.pathname;
  const location = `${canonicalBase}${suffix}${source.search}`;

  return new Response(null, {
    status: 308,
    headers: {
      ...redirectHeaders,
      Location: location,
    },
  });
}

export default {
  fetch: redirectLegacyRequest,
};
