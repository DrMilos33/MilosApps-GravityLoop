import { expect, test, type Browser } from "@playwright/test";

test.skip(
  ({ browserName }) => browserName !== "chromium",
  "The complete device/DPR matrix is the Chromium mobile reference.",
);

interface ViewportCase {
  name: string;
  width: number;
  height: number;
  dpr: number;
  touch: boolean;
}

const viewports: ViewportCase[] = [
  { name: "phone portrait", width: 360, height: 800, dpr: 3, touch: true },
  { name: "phone landscape", width: 844, height: 390, dpr: 2, touch: true },
  { name: "tablet portrait", width: 800, height: 1180, dpr: 2, touch: true },
  { name: "desktop", width: 1440, height: 900, dpr: 1, touch: false },
  { name: "dense desktop pixels", width: 1280, height: 800, dpr: 2.5, touch: false },
];

async function inspectViewport(browser: Browser, viewport: ViewportCase) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.dpr,
    hasTouch: viewport.touch,
    isMobile: viewport.touch,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./?test=1");
  const layout = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const canvasRect = canvas?.getBoundingClientRect();
    const controls = [...document.querySelectorAll<HTMLButtonElement>(".control-button")];
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      canvasCssWidth: canvasRect?.width ?? 0,
      canvasCssHeight: canvasRect?.height ?? 0,
      canvasPixelWidth: canvas?.width ?? 0,
      canvasPixelHeight: canvas?.height ?? 0,
      controlHeights: controls.map((control) => control.getBoundingClientRect().height),
      overlayVisible: Boolean(
        document.querySelector<HTMLElement>("#overlay-action")?.offsetParent,
      ),
    };
  });
  await page.getByRole("button", { name: "Einstellungen" }).click();
  const dialogLayout = await page.evaluate(() => {
    const dialog = document.getElementById("settings-dialog");
    const rect = dialog?.getBoundingClientRect();
    return {
      left: rect?.left ?? -1,
      right: rect?.right ?? Number.POSITIVE_INFINITY,
      top: rect?.top ?? -1,
      bottom: rect?.bottom ?? Number.POSITIVE_INFINITY,
      clientWidth: dialog?.clientWidth ?? 0,
      scrollWidth: dialog?.scrollWidth ?? Number.POSITIVE_INFINITY,
      clientHeight: dialog?.clientHeight ?? 0,
      scrollHeight: dialog?.scrollHeight ?? 0,
    };
  });
  await context.close();
  return { errors, layout, dialogLayout };
}

for (const viewport of viewports) {
  test(`fits ${viewport.name} at DPR ${viewport.dpr}`, async ({ browser }) => {
    const { errors, layout, dialogLayout } = await inspectViewport(browser, viewport);
    expect(errors).toEqual([]);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
    expect(layout.canvasCssWidth).toBeGreaterThan(280);
    expect(layout.canvasCssHeight).toBeGreaterThan(250);
    const expectedCanvasDpr = Math.min(2.5, viewport.dpr);
    expect(layout.canvasPixelWidth / layout.canvasCssWidth).toBeCloseTo(expectedCanvasDpr, 1);
    expect(layout.canvasPixelHeight / layout.canvasCssHeight).toBeCloseTo(expectedCanvasDpr, 1);
    expect(layout.controlHeights.every((height) => height >= 44)).toBe(true);
    expect(layout.overlayVisible).toBe(true);
    expect(dialogLayout.left).toBeGreaterThanOrEqual(0);
    expect(dialogLayout.right).toBeLessThanOrEqual(viewport.width);
    expect(dialogLayout.top).toBeGreaterThanOrEqual(0);
    expect(dialogLayout.bottom).toBeLessThanOrEqual(viewport.height);
    expect(dialogLayout.scrollWidth).toBeLessThanOrEqual(dialogLayout.clientWidth);
    expect(dialogLayout.scrollHeight).toBeGreaterThanOrEqual(dialogLayout.clientHeight);
  });
}

test("pauses an active flight on orientation change and preserves progress", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("./?test=1");
  await page.getByRole("button", { name: "Losfliegen" }).click();
  const before = await page.evaluate(() => window.__gravityLoopTestApi!.getDebugState().state);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByRole("button", { name: "Weiterfliegen" })).toBeVisible();
  const after = await page.evaluate(() => window.__gravityLoopTestApi!.getDebugState().state);
  expect(after.mode).toBe("paused");
  expect(after.pauseReason).toBe("rotation");
  expect(after.score).toBeGreaterThanOrEqual(before.score);
  await context.close();
});
