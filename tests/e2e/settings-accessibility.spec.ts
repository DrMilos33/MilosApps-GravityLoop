import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./?test=1");
});

test("keeps settings pending until explicit apply and announces a round reset", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Einstellungen" }).click();
  await page.getByRole("radio", { name: /Leicht/ }).check();
  await page.getByRole("radio", { name: /Mond/ }).check();
  await expect(
    page.getByRole("button", { name: "Übernehmen & neu starten" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Verwerfen" }).click();
  expect(
    await page.evaluate(() => window.__gravityLoopTestApi!.getDebugState().state.options),
  ).toEqual({ difficulty: "normal", celestialMode: "sun" });

  await page.getByRole("button", { name: "Einstellungen" }).click();
  await page.getByRole("radio", { name: /Leicht/ }).check();
  await page.getByRole("radio", { name: /Mond/ }).check();
  await page
    .getByRole("button", { name: "Übernehmen & neu starten" })
    .click();

  const applied = await page.evaluate(
    () => window.__gravityLoopTestApi!.getDebugState().state,
  );
  expect(applied.mode).toBe("ready");
  expect(applied.stepCount).toBe(0);
  expect(applied.options).toEqual({ difficulty: "easy", celestialMode: "moon" });
});

test("persists gameplay, appearance and comfort settings locally without cookies", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Einstellungen" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await page.getByRole("radio", { name: /Schwer/ }).check();
  await page.getByRole("radio", { name: /Mond/ }).check();
  await page.getByRole("combobox", { name: "Sonne und Mond" }).selectOption("natural");
  await page.getByRole("combobox", { name: "Kometen-Skin" }).selectOption("hat");
  await page.getByRole("switch", { name: "Klänge" }).check();
  await page.getByRole("combobox", { name: "Bewegung" }).selectOption("reduce");
  await page.getByRole("switch", { name: "Hoher Kontrast" }).check();
  await page
    .getByRole("button", { name: "Übernehmen & neu starten" })
    .click();

  await expect(dialog).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("milosapps.gravity-loop.progress")))
    .not.toBeNull();
  await expect(page.locator("html")).toHaveClass(/high-contrast/);
  const stored = await page.evaluate(() => ({
    progress: JSON.parse(localStorage.getItem("milosapps.gravity-loop.progress") ?? "{}"),
    cookies: document.cookie,
  }));
  expect(stored.progress).toEqual(
    expect.objectContaining({
      version: 3,
      settings: {
        sound: true,
        motion: "reduce",
        highContrast: true,
        difficulty: "hard",
        celestialMode: "moon",
        celestialStyle: "natural",
        cometSkin: "hat",
      },
    }),
  );
  expect(stored.cookies).toBe("");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.startsWith("milosapps.gravity-loop")),
    ),
  ).toEqual(["milosapps.gravity-loop.progress"]);

  await page.reload();
  await page.getByRole("button", { name: "Einstellungen" }).click();
  await expect(page.getByRole("radio", { name: /Schwer/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Mond/ })).toBeChecked();
  await expect(page.getByRole("combobox", { name: "Sonne und Mond" })).toHaveValue("natural");
  await expect(page.getByRole("combobox", { name: "Kometen-Skin" })).toHaveValue("hat");
  await expect(page.getByRole("switch", { name: "Klänge" })).toBeChecked();
  await expect(page.getByRole("combobox", { name: "Bewegung" })).toHaveValue("reduce");
  await expect(page.getByRole("switch", { name: "Hoher Kontrast" })).toBeChecked();
});

test("moves existing progress to the declared v1.1 storage namespace", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem("milosapps.gravity-loop.progress");
    localStorage.setItem(
      "gravity-loop:progress",
      JSON.stringify({
        version: 3,
        bestScore: 7_500,
        bestSeries: 14,
        settings: {
          sound: false,
          motion: "system",
          highContrast: false,
          difficulty: "normal",
          celestialMode: "sun",
          celestialStyle: "graphic",
          cometSkin: "mint",
        },
      }),
    );
  });
  await page.reload();
  await page.evaluate(() => {
    localStorage.setItem("milosapps.gravity-loop.privacyNotice.v1", "legacy");
    localStorage.setItem("milosapps.gravity-loop.essentialCookieInfo.v1", "legacy");
  });

  await expect(page.getByTestId("best")).toHaveText("7.500");
  expect(await page.evaluate(() => localStorage.getItem("gravity-loop:progress"))).toBeNull();
  expect(
    JSON.parse(
      (await page.evaluate(() =>
        localStorage.getItem("milosapps.gravity-loop.progress"),
      )) ?? "{}",
    ),
  ).toEqual(expect.objectContaining({ bestScore: 7_500, bestSeries: 14 }));
});

test("switches world and difficulty only through a clean round reset", async ({ page }) => {
  await page.getByRole("button", { name: "Losfliegen" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__gravityLoopTestApi!.getDebugState().state.stepCount))
    .toBeGreaterThan(0);

  await page.getByRole("button", { name: "Einstellungen" }).click();
  await page.getByRole("radio", { name: /Leicht/ }).check();
  await page.getByRole("radio", { name: /Mond/ }).check();
  await page
    .getByRole("button", { name: "Übernehmen & neu starten" })
    .click();

  await expect
    .poll(() => page.evaluate(() => window.__gravityLoopTestApi!.getDebugState().state.mode))
    .toBe("ready");
  const state = await page.evaluate(() => window.__gravityLoopTestApi!.getDebugState().state);
  expect(state.mode).toBe("ready");
  expect(state.stepCount).toBe(0);
  expect(state.score).toBe(0);
  expect(state.options).toEqual({ difficulty: "easy", celestialMode: "moon" });
  await expect(page.getByRole("heading", { name: "Halten lenkt dich zum Mond." })).toBeVisible();
  await expect(page.getByText("Mondorbit · Leicht", { exact: false })).toBeVisible();
});

test("renders procedural moon and hat skin as real canvas changes", async ({
  page,
}, testInfo) => {
  const sampleCanvas = () =>
    page.evaluate(() => {
      const debug = window.__gravityLoopTestApi!.getDebugState();
      const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
      const context = canvas.getContext("2d")!;
      const centerX = debug.layout.centerX * debug.layout.dpr;
      const centerY = debug.layout.centerY * debug.layout.dpr;
      const playerX =
        (debug.layout.centerX + debug.state.player.position.x * debug.layout.scale) *
        debug.layout.dpr;
      const playerY =
        (debug.layout.centerY + debug.state.player.position.y * debug.layout.scale) *
        debug.layout.dpr;
      return {
        core: [...context.getImageData(Math.round(centerX), Math.round(centerY), 1, 1).data],
        player: [
          ...context.getImageData(Math.round(playerX), Math.round(playerY), 1, 1).data,
        ],
      };
    });

  await page.waitForTimeout(100);
  const before = await sampleCanvas();
  await page.getByRole("button", { name: "Einstellungen" }).click();
  await page.getByRole("radio", { name: /Mond/ }).check();
  await page.getByRole("combobox", { name: "Sonne und Mond" }).selectOption("natural");
  await page.getByRole("combobox", { name: "Kometen-Skin" }).selectOption("hat");
  await page
    .getByRole("button", { name: "Übernehmen & neu starten" })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__gravityLoopTestApi!.getDebugState().state.options.celestialMode,
      ),
    )
    .toBe("moon");
  await expect.poll(async () => (await sampleCanvas()).core).not.toEqual(before.core);
  await expect.poll(async () => (await sampleCanvas()).player).not.toEqual(before.player);
  const after = await sampleCanvas();

  expect(after.core).not.toEqual(before.core);
  expect(after.player).not.toEqual(before.player);
  await page.getByRole("button", { name: "Losfliegen" }).click();
  await expect(page.getByTestId("game-overlay")).toBeHidden();
  await page.waitForTimeout(120);
  await testInfo.attach("moon-natural-hat.png", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});

test("has no automated WCAG A/AA violations in game and settings states", async ({ page }) => {
  await expect
    .poll(() =>
      page.locator("milos-app-shell").evaluate((host) => {
        const stylesheet = host.shadowRoot?.querySelector<HTMLLinkElement>(
          'link[rel="stylesheet"]',
        );
        return Boolean(stylesheet?.sheet);
      }),
    )
    .toBe(true);
  const baselineResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(baselineResults.violations).toEqual([]);

  await page.getByRole("button", { name: "Einstellungen" }).click();
  const dialogResults = await new AxeBuilder({ page })
    .include("#settings-dialog")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(dialogResults.violations).toEqual([]);
});

test("reflows at 200 percent text zoom without horizontal page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(page.getByRole("button", { name: "Losfliegen" })).toBeVisible();
  const layout = await page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const overflowing: Array<Record<string, string | number>> = [];
    const inspect = (root: Document | ShadowRoot, scope: string) => {
      for (const node of root.querySelectorAll<HTMLElement>("*")) {
        const rect = node.getBoundingClientRect();
        if (rect.right > clientWidth + 0.5 || rect.width > clientWidth + 0.5) {
          overflowing.push({
            scope,
            tag: node.tagName.toLowerCase(),
            id: node.id,
            className:
              typeof node.className === "string" ? node.className : "",
            width: Math.round(rect.width * 10) / 10,
            right: Math.round(rect.right * 10) / 10,
          });
        }
        if (node.shadowRoot) inspect(node.shadowRoot, node.tagName.toLowerCase());
      }
    };
    inspect(document, "document");
    return {
      clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      canvasHeight: document.querySelector("canvas")?.getBoundingClientRect().height ?? 0,
      restartHeight: document
        .getElementById("restart-button")
        ?.getBoundingClientRect().height,
      overflowing: overflowing.slice(0, 25),
    };
  });
  expect(
    layout.scrollWidth,
    JSON.stringify(layout.overflowing, null, 2),
  ).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.canvasHeight).toBeGreaterThan(250);
  expect(layout.restartHeight).toBeGreaterThanOrEqual(44);

  await page.getByRole("button", { name: "Einstellungen" }).click();
  await page.getByRole("button", { name: "Zurücksetzen" }).click();
  await expect(page.getByRole("group", { name: "Lokale Daten zurücksetzen" })).toBeVisible();
  const dialogLayout = await page.evaluate(() => {
    const dialog = document.getElementById("settings-dialog");
    const rect = dialog?.getBoundingClientRect();
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const selectGeometry = [...(dialog?.querySelectorAll<HTMLSelectElement>("select") ?? [])].map(
      (select) => {
        const style = getComputedStyle(select);
        const context = document.createElement("canvas").getContext("2d")!;
        context.font = style.font;
        const longestOption = [...select.options].reduce(
          (longest, option) =>
            context.measureText(option.textContent ?? "").width > longest.width
              ? { label: option.textContent ?? "", width: context.measureText(option.textContent ?? "").width }
              : longest,
          { label: "", width: 0 },
        );
        const bounds = select.getBoundingClientRect();
        const paddingStart = Number.parseFloat(style.paddingInlineStart);
        const paddingEnd = Number.parseFloat(style.paddingInlineEnd);
        return {
          id: select.id,
          left: bounds.left,
          right: bounds.right,
          paddingEnd,
          safeArea: rootFontSize * 2.25,
          availableTextWidth: select.clientWidth - paddingStart - paddingEnd,
          longestOption,
        };
      },
    );
    const overflowing = [...(dialog?.querySelectorAll<HTMLElement>("*") ?? [])]
      .map((node) => ({
        tag: node.tagName.toLowerCase(),
        id: node.id,
        className: node.className,
        left: Math.round(node.getBoundingClientRect().left),
        right: Math.round(node.getBoundingClientRect().right),
        width: Math.round(node.getBoundingClientRect().width),
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
      }))
      .filter(
        (node) =>
          node.left < (rect?.left ?? 0) ||
          node.right > (rect?.right ?? 0) ||
          node.scrollWidth > node.clientWidth,
      );
    return {
      viewportWidth: document.documentElement.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
      dialogLeft: rect?.left ?? -1,
      dialogRight: rect?.right ?? Number.POSITIVE_INFINITY,
      dialogClientWidth: dialog?.clientWidth ?? 0,
      dialogScrollWidth: dialog?.scrollWidth ?? Number.POSITIVE_INFINITY,
      overflowing,
      selectGeometry,
    };
  });
  expect(dialogLayout.pageScrollWidth).toBeLessThanOrEqual(dialogLayout.viewportWidth);
  expect(dialogLayout.dialogLeft).toBeGreaterThanOrEqual(0);
  expect(dialogLayout.dialogRight).toBeLessThanOrEqual(dialogLayout.viewportWidth);
  expect(
    dialogLayout.dialogScrollWidth,
    JSON.stringify(dialogLayout.overflowing, null, 2),
  ).toBeLessThanOrEqual(dialogLayout.dialogClientWidth);
  expect(dialogLayout.selectGeometry).not.toHaveLength(0);
  for (const select of dialogLayout.selectGeometry) {
    expect(select.left, select.id).toBeGreaterThanOrEqual(dialogLayout.dialogLeft);
    expect(select.right, select.id).toBeLessThanOrEqual(dialogLayout.dialogRight);
    expect(select.paddingEnd, select.id).toBeGreaterThanOrEqual(select.safeArea);
    expect(select.availableTextWidth, `${select.id}: ${select.longestOption.label}`).toBeGreaterThanOrEqual(
      select.longestOption.width,
    );
  }

  await page.getByRole("button", { name: "Einstellungen schließen" }).click();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const englishSelectGeometry = await page.evaluate(() => {
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    return [...document.querySelectorAll<HTMLSelectElement>("#settings-dialog select")].map(
      (select) => {
        const style = getComputedStyle(select);
        const context = document.createElement("canvas").getContext("2d")!;
        context.font = style.font;
        const longestOptionWidth = Math.max(
          ...[...select.options].map((option) =>
            context.measureText(option.textContent ?? "").width,
          ),
        );
        return {
          id: select.id,
          paddingEnd: Number.parseFloat(style.paddingInlineEnd),
          safeArea: rootFontSize * 2.25,
          availableTextWidth:
            select.clientWidth -
            Number.parseFloat(style.paddingInlineStart) -
            Number.parseFloat(style.paddingInlineEnd),
          longestOptionWidth,
        };
      },
    );
  });
  for (const select of englishSelectGeometry) {
    expect(select.paddingEnd, select.id).toBeGreaterThanOrEqual(select.safeArea);
    expect(select.availableTextWidth, select.id).toBeGreaterThanOrEqual(
      select.longestOptionWidth,
    );
  }
});

test("describes the orbit choice in plain German and English", async ({ page }) => {
  await page.getByRole("button", { name: "Einstellungen" }).click();
  await expect(page.getByRole("group", { name: "Sonne oder Mond" })).toBeVisible();
  await expect(page.getByText("Wähle, worum du fliegst.")).toBeVisible();
  await expect(page.getByText(/Zentralkörper/)).toHaveCount(0);

  await page.getByRole("button", { name: "Einstellungen schließen" }).click();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("group", { name: "Sun or Moon" })).toBeVisible();
  await expect(page.getByText("Choose what you orbit.")).toBeVisible();
  await expect(page.getByText(/Central body/)).toHaveCount(0);
});

test("honors system reduced motion and keeps physics available", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.getByRole("button", { name: "Losfliegen" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.__gravityLoopTestApi?.getDebugState().state.stepCount ?? 0),
    )
    .toBeGreaterThan(0);
  const mode = await page.evaluate(
    () => window.__gravityLoopTestApi?.getDebugState().state.mode,
  );
  expect(mode).toBe("playing");
});

test("resets all local data only after explicit second confirmation", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("milosapps.gravity-loop.language", "en");
    localStorage.setItem(
      "milosapps.gravity-loop.progress",
      JSON.stringify({
        version: 2,
        bestScore: 4_200,
        bestSeries: 12,
        settings: { sound: true, motion: "reduce", highContrast: true },
      }),
    );
  });
  await page.reload();
  await expect(page.getByTestId("best")).toHaveText("4,200");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByRole("group", { name: "Reset local data" })).toBeVisible();

  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("group", { name: "Reset local data" })).toBeHidden();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("milosapps.gravity-loop.progress") ?? "{}").bestScore,
    ),
  ).toBe(4_200);

  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: "Reset now" }).click();
  await expect(page.getByRole("button", { name: "Zurückgesetzt" })).toBeDisabled();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByTestId("best")).toHaveText("0");
  const record = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("milosapps.gravity-loop.progress") ?? "{}"),
  );
  expect(record).toEqual({
    version: 3,
    bestScore: 0,
    bestSeries: 0,
    settings: {
      sound: false,
      motion: "system",
      highContrast: false,
      difficulty: "normal",
      celestialMode: "sun",
      celestialStyle: "graphic",
      cometSkin: "mint",
    },
  });
  expect(
    await page.evaluate(() =>
      localStorage.getItem("milosapps.gravity-loop.language"),
    ),
  ).toBeNull();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("milosapps.gravity-loop.privacyNotice.v1"),
    ),
  ).toBeNull();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("milosapps.gravity-loop.essentialCookieInfo.v1"),
    ),
  ).toBeNull();
  await expect(page.locator("html")).not.toHaveClass(/high-contrast/);
});
