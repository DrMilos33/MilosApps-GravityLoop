import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  expectedEnvironment,
  expectedPortalOrigin,
  expectedPrivacyUrl,
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

  await page.goto("./?test=1&production-csp=1");
  await expect(page.getByRole("button", { name: "Losfliegen" })).toBeVisible();
  await expect(page.getByText("DEV", { exact: true })).toBeHidden();
  await expect(page.locator("[data-milos-privacy-info]")).toHaveAttribute(
    "href",
    expectedPrivacyUrl,
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
  });
  expect(
    await page.evaluate(() => window.__gravityLoopTestApi?.getShellEnvironment()),
  ).toBe("production");
});
