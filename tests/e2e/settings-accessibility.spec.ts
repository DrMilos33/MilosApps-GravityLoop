import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./?test=1");
});

test("persists sound, motion and contrast locally without cookies", async ({ page }) => {
  await page.getByRole("button", { name: "Einstellungen" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await page.getByRole("switch", { name: "Klänge" }).check();
  await page.getByRole("combobox", { name: "Bewegung" }).selectOption("reduce");
  await page.getByRole("switch", { name: "Hoher Kontrast" }).check();
  await page.getByRole("button", { name: "Fertig" }).click();

  await expect(dialog).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("gravity-loop:progress")))
    .not.toBeNull();
  await expect(page.locator("html")).toHaveClass(/high-contrast/);
  const stored = await page.evaluate(() => ({
    progress: JSON.parse(localStorage.getItem("gravity-loop:progress") ?? "{}"),
    cookies: document.cookie,
  }));
  expect(stored.progress).toEqual(
    expect.objectContaining({
      version: 2,
      settings: {
        sound: true,
        motion: "reduce",
        highContrast: true,
      },
    }),
  );
  expect(stored.cookies).toBe("");

  await page.reload();
  await page.getByRole("button", { name: "Einstellungen" }).click();
  await expect(page.getByRole("switch", { name: "Klänge" })).toBeChecked();
  await expect(page.getByRole("combobox", { name: "Bewegung" })).toHaveValue("reduce");
  await expect(page.getByRole("switch", { name: "Hoher Kontrast" })).toBeChecked();
});

test("has no automated WCAG A/AA violations in game and settings states", async ({ page }) => {
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

test("keeps all controls keyboard reachable with visible focus", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "Headless WebKit follows the host macOS Full Keyboard Access tab policy.",
  );
  const focusedNames: string[] = [];
  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return {
        name: active?.getAttribute("aria-label") ?? active?.textContent?.trim() ?? "",
        focusVisible: active?.matches(":focus-visible") ?? false,
      };
    });
    focusedNames.push(focused.name);
    expect(focused.focusVisible).toBe(true);
  }

  expect(focusedNames.join(" ")).toContain("Zum Spiel springen");
  expect(focusedNames.join(" ")).toContain("Losfliegen");
  expect(focusedNames.join(" ")).toContain("Neustart");
  expect(focusedNames.join(" ")).toContain("Einstellungen");
});

test("reflows at 200 percent text zoom without horizontal page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(page.getByRole("button", { name: "Losfliegen" })).toBeVisible();
  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    canvasHeight: document.querySelector("canvas")?.getBoundingClientRect().height ?? 0,
    restartHeight: document
      .getElementById("restart-button")
      ?.getBoundingClientRect().height,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.canvasHeight).toBeGreaterThan(250);
  expect(layout.restartHeight).toBeGreaterThanOrEqual(44);

  await page.getByRole("button", { name: "Einstellungen" }).click();
  await page.getByRole("button", { name: "Zurücksetzen" }).click();
  await expect(page.getByRole("group", { name: "Lokale Daten zurücksetzen" })).toBeVisible();
  const dialogLayout = await page.evaluate(() => {
    const dialog = document.getElementById("settings-dialog");
    const rect = dialog?.getBoundingClientRect();
    return {
      viewportWidth: document.documentElement.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
      dialogLeft: rect?.left ?? -1,
      dialogRight: rect?.right ?? Number.POSITIVE_INFINITY,
      dialogClientWidth: dialog?.clientWidth ?? 0,
      dialogScrollWidth: dialog?.scrollWidth ?? Number.POSITIVE_INFINITY,
    };
  });
  expect(dialogLayout.pageScrollWidth).toBeLessThanOrEqual(dialogLayout.viewportWidth);
  expect(dialogLayout.dialogLeft).toBeGreaterThanOrEqual(0);
  expect(dialogLayout.dialogRight).toBeLessThanOrEqual(dialogLayout.viewportWidth);
  expect(dialogLayout.dialogScrollWidth).toBeLessThanOrEqual(dialogLayout.dialogClientWidth);
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
    localStorage.setItem(
      "gravity-loop:progress",
      JSON.stringify({
        version: 2,
        bestScore: 4_200,
        bestSeries: 12,
        settings: { sound: true, motion: "reduce", highContrast: true },
      }),
    );
  });
  await page.reload();
  await expect(page.getByTestId("best")).toHaveText("4.200");
  await page.getByRole("button", { name: "Einstellungen" }).click();
  await page.getByRole("button", { name: "Zurücksetzen" }).click();
  await expect(page.getByRole("group", { name: "Lokale Daten zurücksetzen" })).toBeVisible();

  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(page.getByRole("group", { name: "Lokale Daten zurücksetzen" })).toBeHidden();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("gravity-loop:progress") ?? "{}").bestScore,
    ),
  ).toBe(4_200);

  await page.getByRole("button", { name: "Zurücksetzen" }).click();
  await page.getByRole("button", { name: "Jetzt zurücksetzen" }).click();
  await expect(page.getByRole("button", { name: "Zurückgesetzt" })).toBeDisabled();
  await expect(page.getByTestId("best")).toHaveText("0");
  const record = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("gravity-loop:progress") ?? "{}"),
  );
  expect(record).toEqual({
    version: 2,
    bestScore: 0,
    bestSeries: 0,
    settings: { sound: false, motion: "system", highContrast: false },
  });
  await expect(page.locator("html")).not.toHaveClass(/high-contrast/);
});
