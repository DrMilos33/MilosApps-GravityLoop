import { expect, test, type Browser, type Route } from "@playwright/test";
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

test("keeps the app-owned shell icon bounded through component upgrade", async ({ page }) => {
  test.slow();
  const scenarios = [
    { label: "390x844", viewport: { width: 390, height: 844 }, rootFontSize: "100%" },
    { label: "360x800 at 200%", viewport: { width: 360, height: 800 }, rootFontSize: "200%" },
    { label: "landscape at 200%", viewport: { width: 844, height: 390 }, rootFontSize: "200%" },
  ];

  for (const scenario of scenarios) {
    await page.setViewportSize(scenario.viewport);

    let releaseShellModule = () => {};
    let releaseComponentCss = () => {};
    let signalComponentCssRequest = () => {};
    const shellModuleGate = new Promise<void>((resolve) => {
      releaseShellModule = resolve;
    });
    const componentCssGate = new Promise<void>((resolve) => {
      releaseComponentCss = resolve;
    });
    const componentCssRequested = new Promise<void>((resolve) => {
      signalComponentCssRequest = resolve;
    });
    const shellModuleRoute = async (route: Route) => {
      await shellModuleGate;
      await route.continue();
    };
    const componentCssRoute = async (route: Route) => {
      signalComponentCssRequest();
      await componentCssGate;
      await route.continue();
    };

    await page.route("**/vendor/milosapps-shell/v2/milos-app-shell.js", shellModuleRoute);
    await page.route("**/vendor/milosapps-shell/v2/milos-app-shell.css", componentCssRoute);

    const navigation = page.goto(`./?test=1&shell-icon-transition=${scenario.label}`, {
      waitUntil: "commit",
    });

    try {
      await navigation;
      const icon = page.locator('milos-app-shell > svg[slot="app-icon"]');
      await expect(icon).toHaveCount(1);
      await page.evaluate((fontSize) => {
        document.documentElement.style.fontSize = fontSize;
      }, scenario.rootFontSize);
      await expect
        .poll(() =>
          page.evaluate(() =>
            Boolean(
              document.querySelector<HTMLLinkElement>(
                'link[data-milos-app-essentials][rel="stylesheet"]',
              )?.sheet,
            ),
          ),
        )
        .toBe(true);

      const measureIcon = () =>
        icon.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            visibility: getComputedStyle(element).visibility,
            widthAttribute: element.getAttribute("width"),
            heightAttribute: element.getAttribute("height"),
          };
        });
      const expectBounded = (
        state: "before upgrade" | "component CSS delayed" | "component CSS loaded",
        metrics: Awaited<ReturnType<typeof measureIcon>>,
        visibility: "hidden" | "visible",
      ) => {
        const phase = `${scenario.label}, ${state}`;
        expect.soft(metrics.width, `${phase}: width`).toBeLessThanOrEqual(38.01);
        expect.soft(metrics.height, `${phase}: height`).toBeLessThanOrEqual(38.01);
        expect.soft(metrics.visibility, `${phase}: visibility`).toBe(visibility);
        expect.soft(metrics.widthAttribute, `${phase}: width attribute`).toBe("38");
        expect.soft(metrics.heightAttribute, `${phase}: height attribute`).toBe("38");
      };

      expect(await page.evaluate(() => Boolean(customElements.get("milos-app-shell")))).toBe(false);
      expectBounded("before upgrade", await measureIcon(), "hidden");

      releaseShellModule();
      await expect
        .poll(() => page.evaluate(() => Boolean(customElements.get("milos-app-shell"))))
        .toBe(true);
      await expect
        .poll(() =>
          page.locator("milos-app-shell").evaluate((element) => Boolean(element.shadowRoot)),
        )
        .toBe(true);
      await componentCssRequested;

      expect(
        await page.locator("milos-app-shell").evaluate((element) => {
          const link = element.shadowRoot?.querySelector<HTMLLinkElement>(
            'link[rel="stylesheet"][href*="milos-app-shell.css"]',
          );
          return Boolean(link?.sheet);
        }),
      ).toBe(false);
      expectBounded("component CSS delayed", await measureIcon(), "visible");

      releaseComponentCss();
      await expect
        .poll(() =>
          page.locator("milos-app-shell").evaluate((element) => {
            const link = element.shadowRoot?.querySelector<HTMLLinkElement>(
              'link[rel="stylesheet"][href*="milos-app-shell.css"]',
            );
            return Boolean(link?.sheet);
          }),
        )
        .toBe(true);
      await page.waitForLoadState("load");

      const finalMetrics = await measureIcon();
      expectBounded("component CSS loaded", finalMetrics, "visible");
      expect.soft(finalMetrics.width, `${scenario.label}: final width`).toBeCloseTo(38, 1);
      expect.soft(finalMetrics.height, `${scenario.label}: final height`).toBeCloseTo(38, 1);

      const loaderIcon = page.locator("[data-milos-loading-icon]");
      await expect.soft(loaderIcon).toHaveCSS("width", "32px");
      await expect.soft(loaderIcon).toHaveCSS("height", "32px");

      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect.soft(layout.scrollWidth, `${scenario.label}: horizontal overflow`).toBeLessThanOrEqual(
        layout.clientWidth,
      );
    } finally {
      releaseShellModule();
      releaseComponentCss();
      await navigation.catch(() => undefined);
      await page.unroute("**/vendor/milosapps-shell/v2/milos-app-shell.js", shellModuleRoute);
      await page.unroute("**/vendor/milosapps-shell/v2/milos-app-shell.css", componentCssRoute);
    }
  }
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
  await expect(page.getByRole("radio", { name: /Easy/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Moon/ })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Comet skin" })).toBeVisible();
  await page.getByRole("button", { name: "Discard" }).click();

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
  rootFontSize?: string,
) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto("./?test=1");
  if (rootFontSize) {
    await page.evaluate((fontSize) => {
      document.documentElement.style.fontSize = fontSize;
    }, rootFontSize);
  }
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

test("fits the shared shell at desktop, mobile, and 200% reflow widths", async ({
  browser,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Chromium owns the complete viewport matrix.");
  for (const scenario of [
    { viewport: { width: 1440, height: 900 } },
    { viewport: { width: 390, height: 844 } },
    { viewport: { width: 360, height: 800 }, rootFontSize: "200%" },
  ]) {
    const layout = await inspectShellLayout(
      browser,
      scenario.viewport,
      scenario.rootFontSize,
    );
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
    expect(layout.hostWidth).toBeLessThanOrEqual(layout.clientWidth);
    expect(Math.abs(layout.footerBottom - layout.documentBottom)).toBeLessThanOrEqual(1);
  }
});

test("renders the shared shell under a self-only style CSP", async ({ page }) => {
  const cspErrors: string[] = [];
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /content security policy|style-src/i.test(message.text())
    ) {
      cspErrors.push(message.text());
    }
  });

  const testsBuiltDocument =
    page.url().startsWith("https://") ||
    process.env.GRAVITY_LOOP_E2E_ARTIFACT === "built";

  if (testsBuiltDocument) {
    await page.route(
      (url) => url.searchParams.get("csp-shell-test") === "1",
      async (route) => {
        const response = await route.fetch();
        await route.fulfill({
          response,
          headers: {
            ...response.headers(),
            "Content-Security-Policy": cspHeader,
          },
        });
      },
    );
    await page.goto("./?csp-shell-test=1");
  } else {
    await page.route("**/csp-shell-fixture.html", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        headers: { "Content-Security-Policy": cspHeader },
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
  }

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
  const stylesheetUrls = await shell.evaluate((host) => {
    const componentStylesheet = host.shadowRoot?.querySelector<HTMLLinkElement>(
      'link[data-milos-app-shell-component]',
    )?.href;
    const themeStylesheet = document.querySelector<HTMLLinkElement>(
      'link[data-milos-app-shell-theme="gravity-loop"]',
    )?.href;
    return [componentStylesheet, themeStylesheet];
  });
  expect(stylesheetUrls).toHaveLength(2);
  expect(
    stylesheetUrls.every(
      (url) => url && new URL(url).origin === new URL(page.url()).origin,
    ),
  ).toBe(true);
  await page.waitForTimeout(100);
  expect(cspErrors).toEqual([]);
});
