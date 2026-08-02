import { expect, test } from "@playwright/test";
import { suppressPrivacyNotice } from "./support/privacy";

test.skip(
  ({ browserName }) => browserName !== "chromium",
  "The low-level touch stream uses Chromium CDP.",
);

test("handles real touch start, long hold, cancel and rapid alternation", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await suppressPrivacyNotice(page);
  await page.goto("./?test=1");
  const client = await context.newCDPSession(page);
  const canvas = page.getByTestId("game-canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    await context.close();
    return;
  }

  const touchPoint = {
    x: Math.round(box.x + box.width * 0.22),
    y: Math.round(box.y + box.height * 0.22),
    radiusX: 7,
    radiusY: 7,
    force: 0.6,
    id: 1,
  };

  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touchPoint],
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__gravityLoopTestApi!.getDebugState().state.held),
    )
    .toBe(true);
  await page.waitForTimeout(520);
  expect(
    await page.evaluate(() => window.__gravityLoopTestApi!.getDebugState().state.mode),
  ).toBe("playing");

  await client.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__gravityLoopTestApi!.getDebugState().state.held),
    )
    .toBe(false);

  for (let index = 0; index < 10; index += 1) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...touchPoint, id: index + 2 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  }
  expect(
    await page.evaluate(() => window.__gravityLoopTestApi!.getDebugState().state.held),
  ).toBe(false);
  await context.close();
});

test("uses the phone game area outside the canvas as a gravity hold zone", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await suppressPrivacyNotice(page);
  await page.goto("./?test=1");
  const client = await context.newCDPSession(page);
  const score = await page.locator(".score-strip").boundingBox();
  const canvas = await page.getByTestId("game-canvas").boundingBox();
  expect(score).not.toBeNull();
  expect(canvas).not.toBeNull();
  if (!score || !canvas) {
    await context.close();
    return;
  }

  const touchPoint = {
    x: Math.round(score.x + score.width * 0.5),
    y: Math.round(score.y + score.height * 0.5),
    radiusX: 7,
    radiusY: 7,
    force: 0.6,
    id: 41,
  };
  expect(touchPoint.y).toBeLessThan(canvas.y);

  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touchPoint],
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__gravityLoopTestApi!.getDebugState().state.held),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() => window.__gravityLoopTestApi!.getDebugState().state.mode),
    )
    .toBe("playing");

  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__gravityLoopTestApi!.getDebugState().state.held),
    )
    .toBe(false);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await context.close();
});
