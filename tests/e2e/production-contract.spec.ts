import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  expectedEnvironment,
  expectedPortalOrigin,
  expectedPrivacyUrl,
  expectedProductionBasePath,
  expectedProductionCanonical,
} from "./environment";

const headersFile = await readFile("public/_headers", "utf8");
const csp = headersFile.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1]?.trim();

test("enforces the production identity and exact self-only CSP without runtime violations", async ({
  page,
  request,
}) => {
  test.skip(expectedEnvironment !== "production", "Production-only release gate.");
  expect(csp).toBeTruthy();

  const violations: string[] = [];
  const runtimeErrors: string[] = [];
  await page.addInitScript(() => {
    window.addEventListener("securitypolicyviolation", (event) => {
      const values = ((window as typeof window & { __productionCspViolations?: string[] })
        .__productionCspViolations ??= []);
      values.push(`${event.effectiveDirective}:${event.blockedURI}`);
    });
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("production-csp") !== "1") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        "content-security-policy": csp ?? "default-src 'none'",
        "x-content-type-options": "nosniff",
      },
    });
  });

  await page.goto("../gravity-loop?test=1&production-csp=1");
  expect(new URL(page.url()).pathname).toBe("/gravity-loop");
  await expect(page.getByRole("button", { name: "Losfliegen" })).toBeVisible();
  await expect(page.getByText("DEV", { exact: true })).toBeHidden();
  await expect(page.locator("[data-milos-privacy-info]")).toHaveAttribute(
    "href",
    expectedPrivacyUrl,
  );
  await expect(page.getByTestId("game-guide")).toContainText(
    "So funktioniert Gravity Loop",
  );
  const entry = await request.get("../gravity-loop");
  const entryHtml = await entry.text();
  expect(entryHtml).toContain('data-testid="game-guide"');
  expect(entryHtml).toContain("Lichtsterne und Schild");
  expect(entryHtml).toContain(
    `<link rel="canonical" href="${expectedProductionCanonical}" />`,
  );
  expect(entryHtml).toContain(
    `<meta property="og:url" content="${expectedProductionCanonical}" />`,
  );
  expect(entryHtml).not.toMatch(
    /pagead2\.googlesyndication|adsbygoogle|data-ad-client|data-ad-slot/i,
  );
  const sitemap = await request.get("./sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(sitemap.headers()["content-type"]).toMatch(/^(?:application|text)\/xml\b/);
  const sitemapXml = await sitemap.text();
  expect(sitemapXml.match(/<loc>[^<]+<\/loc>/g)).toEqual([
    `<loc>${expectedProductionCanonical}</loc>`,
  ]);
  const robots = await request.get("./robots.txt");
  expect(robots.ok()).toBe(true);
  expect(robots.headers()["content-type"]).toContain("text/plain");
  expect(
    (await robots.text())
      .split(/\r?\n/)
      .filter((line) => /^Sitemap:/i.test(line)),
  ).toEqual([
    `Sitemap: ${expectedProductionCanonical}/sitemap.xml`,
  ]);
  const resourcePaths = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLLinkElement | HTMLScriptElement | HTMLImageElement>(
        'link[rel="stylesheet"], link[rel="icon"], link[rel="manifest"], script[src], img[src]',
      ),
    ].map((element) => {
      const value =
        element instanceof HTMLLinkElement ? element.href : element.src;
      return new URL(value).pathname;
    }),
  );
  expect(resourcePaths.length).toBeGreaterThan(4);
  expect(resourcePaths.every((pathname) => pathname.startsWith(expectedProductionBasePath))).toBe(
    true,
  );
  expect(
    await page.locator("milos-app-shell").evaluate((host) => {
      const root = host.shadowRoot;
      if (!root) throw new Error("Shell shadow root is unavailable.");
      return [...root.querySelectorAll<HTMLAnchorElement>("a")].map((link) => link.href);
    }),
  ).toEqual(expect.arrayContaining([`${expectedPortalOrigin}/apps`]));
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __productionCspViolations?: string[] })
            .__productionCspViolations ?? [],
      ),
    )
    .toEqual([]);
  expect(runtimeErrors).toEqual([]);

  const health = await request.get("./health.json");
  expect(health.ok()).toBe(true);
  await expect(health.json()).resolves.toMatchObject({
    status: "ok",
    app: "gravity-loop",
    environment: "production",
    productionApproved: true,
    adsEnabled: false,
    canonicalUrl: expectedProductionCanonical,
    publicBasePath: expectedProductionBasePath,
  });
  expect(await page.evaluate(() => navigator.serviceWorker?.getRegistrations().then((items) => items.length) ?? 0)).toBe(0);
  expect(
    await page.evaluate(() => window.__gravityLoopTestApi?.getShellEnvironment()),
  ).toBe("production");
});
