import { expect, test, type Browser } from "@playwright/test";
import {
  getMessages,
  type Language,
  type StaticTranslationKey,
} from "../../src/i18n";

async function expectCompleteAppLocale(
  page: import("@playwright/test").Page,
  language: Language,
): Promise<void> {
  const expected = getMessages(language).static;
  const rendered = await page.locator("[data-i18n]").evaluateAll((nodes) =>
    nodes.map((node) => ({
      key: (node as HTMLElement).dataset.i18n ?? "",
      text: node.textContent?.trim() ?? "",
    })),
  );

  expect(rendered.length).toBeGreaterThan(50);
  for (const item of rendered) {
    expect(item.text, `translation for ${item.key}`).toBe(
      expected[item.key as StaticTranslationKey],
    );
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto("./?test=1");
});

test("pins one local v2 shell with app-owned icon and DEV-only absolute links", async ({
  page,
  request,
}) => {
  await expect(page.locator("milos-app-shell")).toHaveCount(1);
  await expect(
    page.locator('milos-app-shell > svg[slot="app-icon"]'),
  ).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByText("DEV", { exact: true })).toBeVisible();

  const shell = await page.locator("milos-app-shell").evaluate((host) => {
    const root = host.shadowRoot;
    if (!root) throw new Error("Open shell shadow root is missing.");
    const links = [
      ...root.querySelectorAll<HTMLAnchorElement>("header a, footer a"),
    ].map(
      (link) => ({ text: link.textContent?.trim() ?? "", href: link.href }),
    );
    const controls = [
      ...root.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>(
        "a.control, button.control",
      ),
    ].map((control) => ({
      text: control.textContent?.trim() ?? "",
      width: control.getBoundingClientRect().width,
      height: control.getBoundingClientRect().height,
    }));
    const languageButtons = [...root.querySelectorAll("[data-locale]")].map(
      (button) => ({
        text: button.textContent?.trim() ?? "",
        flags: button.querySelectorAll("svg.flag").length,
      }),
    );
    return { links, controls, languageButtons };
  });

  expect(shell.links).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ href: "https://dev.milos-apps.de/" }),
      expect.objectContaining({ href: "https://dev.milos-apps.de/apps" }),
      expect.objectContaining({ href: "https://dev.milos-apps.de/impressum" }),
      expect.objectContaining({ href: "https://dev.milos-apps.de/datenschutz" }),
    ]),
  );
  expect(shell.links.every(({ href }) => href.startsWith("https://"))).toBe(
    true,
  );
  expect(
    shell.controls.every(({ width, height }) => width >= 44 && height >= 44),
  ).toBe(true);
  expect(shell.languageButtons).toEqual([
    { text: "DE", flags: 1 },
    { text: "EN", flags: 1 },
  ]);

  const manifestResponse = await request.get("./manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = (await manifestResponse.json()) as {
    start_url?: string;
    icons?: Array<{ src?: string }>;
  };
  expect(manifest.start_url).toBe("./");
  expect(manifest.icons?.every(({ src }) => src?.startsWith("./"))).toBe(true);
});

test("translates the complete app UI through the shell event and persists EN", async ({
  page,
}) => {
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expectCompleteAppLocale(page, "de");

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: /All apps/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Launch" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  await expect(page.getByTestId("game-canvas")).toHaveAttribute(
    "aria-label",
    /Sun mode.*Difficulty Normal/i,
  );
  await expectCompleteAppLocale(page, "en");

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(
    page.getByRole("combobox", { name: "Difficulty" }),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Central body" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Comet skin" })).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  expect(
    await page.evaluate(() =>
      localStorage.getItem("milosapps.gravity-loop.language"),
    ),
  ).toBe("en");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "Launch" })).toBeVisible();
  await expectCompleteAppLocale(page, "en");
});

test("keeps shell and game controls keyboard-reachable with visible focus", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "Headless WebKit follows the host Full Keyboard Access tab policy.",
  );

  const focusedNames: string[] = [];
  for (let index = 0; index < 9; index += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      let active = document.activeElement as HTMLElement | null;
      while (active?.shadowRoot?.activeElement) {
        active = active.shadowRoot.activeElement as HTMLElement;
      }
      return {
        name:
          active?.getAttribute("aria-label") ??
          active?.textContent?.trim() ??
          "",
        focusVisible: active?.matches(":focus-visible") ?? false,
      };
    });
    focusedNames.push(focused.name);
    expect(focused.focusVisible).toBe(true);
  }

  expect(focusedNames.join(" ")).toContain("Zum Inhalt");
  expect(focusedNames.join(" ")).toContain("MilosApps");
  expect(focusedNames).toContain("DE");
  expect(focusedNames).toContain("EN");
  expect(focusedNames.join(" ")).toContain("Alle Apps");
  expect(focusedNames.join(" ")).toContain("Losfliegen");
  expect(focusedNames.join(" ")).toContain("Neustart");
  expect(focusedNames.join(" ")).toContain("Einstellungen");
});

async function inspectShellLayout(
  browser: Browser,
  viewport: { width: number; height: number },
) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto("./?test=1");
  const layout = await page.locator("milos-app-shell").evaluate((host) => {
    const root = host.shadowRoot;
    if (!root) throw new Error("Open shell shadow root is missing.");
    const footer = root.querySelector("footer")?.getBoundingClientRect();
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      footerBottom: footer?.bottom ?? -1,
      documentBottom: document.documentElement.scrollHeight,
      hostWidth: host.getBoundingClientRect().width,
    };
  });
  await context.close();
  return layout;
}

test("fits the shared shell at 1440x900 and 390x844 without footer whitespace", async ({
  browser,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Chromium owns the complete viewport matrix.");
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const layout = await inspectShellLayout(browser, viewport);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
    expect(layout.hostWidth).toBeLessThanOrEqual(layout.clientWidth);
    expect(Math.abs(layout.footerBottom - layout.documentBottom)).toBeLessThanOrEqual(1);
  }
});

test("renders the shared shell under a self-only style CSP", async ({ page }) => {
  const cspErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /content security policy|style-src/i.test(message.text())
    ) {
      cspErrors.push(message.text());
    }
  });

  await page.route("**/csp-shell-fixture.html", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      headers: {
        "Content-Security-Policy": [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self'",
          "img-src 'self' data:",
          "connect-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
        ].join("; "),
      },
      body: `<!doctype html>
        <html lang="de">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script type="module" src="./vendor/milosapps-shell/v2/bootstrap.js"></script>
          </head>
          <body>
            <milos-app-shell>
              <svg slot="app-icon" aria-hidden="true" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="12"></circle>
              </svg>
              <main id="main" slot="main"><h1>Gravity Loop</h1></main>
            </milos-app-shell>
          </body>
        </html>`,
    });
  });

  await page.goto("./csp-shell-fixture.html");
  await expect(page.getByText("DEV", { exact: true })).toBeVisible();
  const shell = page.locator("milos-app-shell");
  await expect
    .poll(() => shell.evaluate((host) => getComputedStyle(host).display))
    .toBe("grid");
  await expect
    .poll(() =>
      shell.evaluate((host) => getComputedStyle(host).backgroundColor),
    )
    .toBe("rgb(7, 17, 30)");
  await expect
    .poll(() =>
      shell.evaluate((host) => {
        const root = host.shadowRoot;
        if (!root) throw new Error("Open shell shadow root is missing.");
        return (
          root.querySelector<HTMLElement>(".control")?.getBoundingClientRect()
            .height ?? 0
        );
      }),
    )
    .toBeGreaterThanOrEqual(44);
  await page.waitForTimeout(100);
  expect(cspErrors).toEqual([]);
});
