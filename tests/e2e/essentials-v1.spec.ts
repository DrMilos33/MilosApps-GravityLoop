import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expectedPrivacyUrl } from "./environment";

const LEGACY_PRIVACY_STORAGE_KEY = "milosapps.gravity-loop.privacyNotice.v1";

test("keeps a small loader visible until the game is operable", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(
    /\/(?:src\/main\.ts|assets\/index-[^/?]+\.js)(?:\?.*)?$/,
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    },
  );

  await page.goto("./?test=1", { waitUntil: "commit" });
  const loader = page.locator("[data-milos-app-loading]");
  await expect(loader).toBeVisible();
  await expect(loader.locator("[data-milos-loading-title]")).toHaveJSProperty(
    "tagName",
    "P",
  );
  await expect(loader.locator("[data-milos-loading-icon]")).toHaveCSS(
    "width",
    "32px",
  );
  await expect(loader.locator("[data-milos-loading-icon]")).toHaveCSS(
    "height",
    "32px",
  );
  await expect(loader.locator("[data-milos-loading-icon]")).toHaveCSS(
    "max-width",
    "32px",
  );
  await expect(loader.locator("[data-milos-loading-icon]")).toHaveCSS(
    "max-height",
    "32px",
  );

  await expect(loader).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Losfliegen" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await loader.evaluate((element) => {
    (element as HTMLElement).hidden = false;
  });
  await expect(loader.locator("[data-milos-loading-icon]")).toHaveCSS(
    "width",
    "32px",
  );
  await expect(loader.locator("[data-milos-loading-icon]")).toHaveCSS(
    "height",
    "32px",
  );
  await page.setViewportSize({ width: 360, height: 800 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(loader.locator("[data-milos-loading-icon]")).toHaveCSS(
    "width",
    "32px",
  );
  await expect(loader.locator("[data-milos-loading-icon]")).toHaveCSS(
    "height",
    "32px",
  );
  await expect(loader.locator("[data-milos-loading-icon]")).toHaveCSS(
    "max-width",
    "32px",
  );
  await expect(loader.locator("[data-milos-loading-icon]")).toHaveCSS(
    "max-height",
    "32px",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await loader.locator("[data-milos-loading-progress]").evaluate((progress) =>
      getComputedStyle(progress, "::after").animationName,
    ),
  ).toBe("none");

  const iconResponse = await request.get(
    new URL("./gravity-loop-mark.svg", page.url()).toString(),
  );
  expect(iconResponse.ok()).toBe(true);
  expect(iconResponse.headers()["content-type"]).toMatch(/^image\/svg\+xml(?:;|$)/i);
  const sourceIcon = await readFile("public/gravity-loop-mark.svg");
  const sha256 = (value: Buffer) => createHash("sha256").update(value).digest("hex");
  expect(sha256(await iconResponse.body())).toBe(sha256(sourceIcon));
});

test("uses truthful permanent privacy information without a fake consent banner", async ({
  page,
}) => {
  await page.addInitScript((legacyKey) => {
    localStorage.setItem(legacyKey, "dismissed");
  }, LEGACY_PRIVACY_STORAGE_KEY);
  await page.goto("./?test=1");

  await expect(page.locator("[data-milos-privacy-notice]")).toHaveCount(0);
  await expect(page.locator("[data-milos-privacy-info]")).toHaveAttribute(
    "href",
    expectedPrivacyUrl,
  );
  await expect(page.locator("[data-milos-privacy-info]")).toContainText(
    "Datenschutz & lokale Speicherung",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), LEGACY_PRIVACY_STORAGE_KEY),
  ).toBeNull();

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("[data-milos-privacy-info]")).toContainText(
    "Privacy & local storage",
  );
  await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("shares only an intentional app link through native, abort and clipboard paths", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (payload: unknown) => {
        (globalThis as typeof globalThis & { __sharedPayload?: unknown }).__sharedPayload =
          payload;
      },
    });
  });
  await page.goto("./?test=1&private-score=987654#local-run");

  const shareButton = page.getByRole("button", { name: "Teilen" });
  await expect(shareButton).toBeVisible();
  const shareTarget = await shareButton.evaluate((button) => ({
    width: button.getBoundingClientRect().width,
    height: button.getBoundingClientRect().height,
  }));
  expect(shareTarget.width).toBeGreaterThanOrEqual(44);
  expect(shareTarget.height).toBeGreaterThanOrEqual(44);
  await page.getByRole("button", { name: "Einstellungen" }).focus();
  await page.keyboard.press("Tab");
  await expect(shareButton).toBeFocused();
  expect(
    await shareButton.evaluate((button) => button.matches(":focus-visible")),
  ).toBe(true);

  const stableGeometry = await shareButton.evaluate((button) => {
    const rect = button.parentElement?.getBoundingClientRect();
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  });
  await shareButton.click();
  await expect(page.locator("[data-milos-share-status]")).toHaveText("");
  const payload = await page.evaluate(
    () => (globalThis as typeof globalThis & { __sharedPayload?: unknown }).__sharedPayload,
  );
  expect(JSON.stringify(payload)).not.toContain("987654");
  expect(payload).toEqual(
    expect.objectContaining({
      title: "Gravity Loop · MilosApps",
      text: expect.stringContaining("Gravity Loop"),
      url: expect.not.stringContaining("?"),
    }),
  );
  expect((payload as { url: string }).url).not.toContain("#");

  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new DOMException("cancelled", "AbortError");
      },
    });
  });
  await shareButton.click();
  await expect(page.locator("[data-milos-share-status]")).toHaveText("");

  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (globalThis as typeof globalThis & { __copiedText?: string }).__copiedText =
            value;
        },
      },
    });
  });
  await shareButton.click();
  await expect(page.locator("[data-milos-share-status]")).toHaveText("Link kopiert");
  expect(
    await shareButton.evaluate((button) => {
      const rect = button.parentElement?.getBoundingClientRect();
      return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
    }),
  ).toEqual(stableGeometry);
  const copied = await page.evaluate(
    () => (globalThis as typeof globalThis & { __copiedText?: string }).__copiedText,
  );
  expect(copied).toContain("Gravity Loop");
  expect(copied).not.toContain("987654");
  expect(copied).not.toContain("?");
  expect(copied).not.toContain("#");

  await expect(page.locator("milos-date-picker, milos-place-search")).toHaveCount(0);
});

test("loads the vendored essentials under a strict self-only CSP with correct MIME", async ({
  page,
  request,
}) => {
  const cspErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /content security policy|style-src|script-src/i.test(message.text())
    ) {
      cspErrors.push(message.text());
    }
  });

  await page.route("**/essentials-csp-fixture.html", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      headers: {
        "Content-Security-Policy": [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self'",
          "img-src 'self'",
          "connect-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
        ].join("; "),
      },
      body: `<!doctype html>
        <html lang="de">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link data-milos-app-essentials rel="stylesheet" href="./vendor/milosapps-essentials/v1/milos-app-essentials.css">
            <link data-milos-app-essentials-theme rel="stylesheet" href="./vendor/milosapps-essentials/v1/milos-app-essentials-theme.css">
          </head>
          <body data-milos-essentials-loading>
            <section data-milos-app-loading role="status" aria-live="polite">
              <div data-milos-loading-card>
                <img data-milos-loading-icon src="./gravity-loop-mark.svg" width="32" height="32" alt="">
                <span data-milos-loading-brand>MilosApps</span>
                <p data-milos-loading-title>Gravity Loop</p>
                <p data-milos-loading-message>Gravity Loop wird geöffnet …</p>
                <span data-milos-loading-progress aria-hidden="true"></span>
              </div>
            </section>
            <milos-share-button></milos-share-button>
            <script type="module" src="./vendor/milosapps-essentials/v1/bootstrap.js"></script>
          </body>
        </html>`,
    });
  });

  await page.goto("./essentials-csp-fixture.html");
  await expect(page.locator("[data-milos-app-loading]")).toBeVisible();
  await expect(page.locator("[data-milos-loading-icon]")).toHaveCSS("width", "32px");
  await expect(page.locator("[data-milos-loading-icon]")).toHaveCSS("height", "32px");
  await expect(page.getByRole("button", { name: "Teilen" })).toHaveCSS(
    "min-height",
    "44px",
  );
  const links = await page.locator("link[data-milos-app-essentials]").evaluateAll(
    (elements) =>
      elements.map((element) => (element as HTMLLinkElement).href),
  );
  const themeLink = await page
    .locator("link[data-milos-app-essentials-theme]")
    .getAttribute("href");
  expect(links).toHaveLength(1);
  expect(themeLink).toBeTruthy();
  const resourceUrls = [links[0], new URL(themeLink!, page.url()).toString()];
  expect(
    resourceUrls.every((url) => new URL(url).origin === new URL(page.url()).origin),
  ).toBe(true);
  for (const resourceUrl of resourceUrls) {
    const response = await request.get(resourceUrl, {
      headers: { Accept: "text/css" },
    });
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toMatch(/^text\/css(?:;|$)/i);
  }

  await page.evaluate(() => {
    (
      globalThis as typeof globalThis & {
        milosAppEssentials?: { ready(): void };
      }
    ).milosAppEssentials?.ready();
  });
  await expect(page.locator("[data-milos-privacy-notice]")).toHaveCount(0);
  await page.waitForTimeout(100);
  expect(cspErrors).toEqual([]);
});
