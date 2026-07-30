import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/?test=1");
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

test("keeps all controls keyboard reachable with visible focus", async ({ page }) => {
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
