import { describe, expect, it } from "vitest";
import { redirectLegacyRequest } from "../../infra/legacy-redirect/worker";

const legacy = "https://gravity-loop.milos-apps.de";

describe("legacy production redirect", () => {
  it.each([
    ["GET", "/", "https://milos-apps.de/gravity-loop"],
    [
      "HEAD",
      "/?source=legacy&source=bookmark",
      "https://milos-apps.de/gravity-loop?source=legacy&source=bookmark",
    ],
    [
      "GET",
      "/health.json?probe=1",
      "https://milos-apps.de/gravity-loop/health.json?probe=1",
    ],
    [
      "HEAD",
      "/assets/icon%20one.svg?theme=dark%2Flight",
      "https://milos-apps.de/gravity-loop/assets/icon%20one.svg?theme=dark%2Flight",
    ],
  ])("redirects %s %s with path and query preserved", (method, path, expected) => {
    const response = redirectLegacyRequest(new Request(`${legacy}${path}`, { method }));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(expected);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
  });

  it("fails closed outside the legacy hostname", () => {
    const response = redirectLegacyRequest(
      new Request("https://milos-apps.de/gravity-loop"),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not broaden the static legacy surface to write methods", () => {
    const response = redirectLegacyRequest(
      new Request(`${legacy}/score`, { method: "POST" }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
    expect(response.headers.get("location")).toBeNull();
  });
});
