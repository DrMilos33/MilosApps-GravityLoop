import { expect, test, type Page } from "@playwright/test";

test.skip(
  ({ browserName }) => browserName !== "chromium",
  "CPU throttling and the frame reference use Chromium CDP.",
);

interface Metrics {
  frameSamples: number;
  averageFrameMs: number;
  p95FrameMs: number;
  worstFrameMs: number;
  estimatedFps: number;
  inputSamples: number;
  averageInputMs: number;
  p95InputMs: number;
  worstInputMs: number;
  droppedSimulationMs: number;
}

async function exercise(page: Page, richVisuals = false): Promise<Metrics> {
  await page.goto("./?test=1");
  if (richVisuals) {
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
  }
  await page.getByRole("button", { name: "Losfliegen" }).click();
  await expect(page.getByTestId("game-overlay")).toBeHidden();
  const canvas = page.getByTestId("game-canvas");
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Canvas has no layout box.");
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(220);
  await page.mouse.up();
  await page.waitForTimeout(1_800);
  await page.mouse.down();
  await page.waitForTimeout(180);
  await page.mouse.up();
  await page.waitForTimeout(300);

  // A percentile needs more than a handful of samples. Exercise a short,
  // deterministic sequence so p95 is not merely the single worst event.
  for (let index = 0; index < 8; index += 1) {
    await page.mouse.down();
    await page.waitForTimeout(60);
    await page.mouse.up();
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(700);

  return page.evaluate(() => window.__gravityLoopTestApi!.getDebugState().metrics);
}

test("keeps frame and input latency responsive at normal CPU speed", async ({
  page,
}, testInfo) => {
  const metrics = await exercise(page);
  console.log("normal-cpu-metrics", JSON.stringify(metrics));
  await testInfo.attach("normal-cpu-metrics.json", {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });

  expect(metrics.frameSamples).toBeGreaterThan(120);
  expect(metrics.estimatedFps).toBeGreaterThan(45);
  expect(metrics.p95FrameMs).toBeLessThan(36);
  expect(metrics.inputSamples).toBeGreaterThanOrEqual(20);
  expect(metrics.p95InputMs).toBeLessThan(45);
  expect(metrics.droppedSimulationMs).toBeLessThan(250);
});

test("keeps procedural moon and hat rendering within the frame budget", async ({
  page,
}, testInfo) => {
  const metrics = await exercise(page, true);
  console.log("rich-visuals-metrics", JSON.stringify(metrics));
  await testInfo.attach("rich-visuals-metrics.json", {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });

  expect(metrics.frameSamples).toBeGreaterThan(120);
  expect(metrics.estimatedFps).toBeGreaterThan(45);
  expect(metrics.p95FrameMs).toBeLessThan(36);
  expect(metrics.inputSamples).toBeGreaterThanOrEqual(20);
  expect(metrics.p95InputMs).toBeLessThan(45);
  expect(metrics.droppedSimulationMs).toBeLessThan(250);
});

test("remains playable under four-times CPU throttling", async ({
  page,
  context,
}, testInfo) => {
  const client = await context.newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const metrics = await exercise(page);
  console.log("four-times-cpu-metrics", JSON.stringify(metrics));
  await testInfo.attach("four-times-cpu-metrics.json", {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });

  expect(metrics.frameSamples).toBeGreaterThan(90);
  expect(metrics.estimatedFps).toBeGreaterThan(30);
  expect(metrics.p95FrameMs).toBeLessThan(51);
  expect(metrics.inputSamples).toBeGreaterThanOrEqual(20);
  expect(metrics.p95InputMs).toBeLessThan(60);
  expect(metrics.droppedSimulationMs).toBeLessThan(500);
});
