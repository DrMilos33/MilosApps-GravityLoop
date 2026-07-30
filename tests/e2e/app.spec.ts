import { expect, test, type Page } from "@playwright/test";

interface DebugState {
  state: {
    mode: "ready" | "playing" | "paused" | "gameover";
    pauseReason: string | null;
    held: boolean;
    score: number;
    stepCount: number;
    player: {
      position: { x: number; y: number };
    };
  };
  metrics: {
    inputSamples: number;
    p95InputMs: number;
  };
  layout: {
    width: number;
    height: number;
    dpr: number;
  };
}

async function debugState(page: Page): Promise<DebugState> {
  return page.evaluate(() => {
    const api = window.__gravityLoopTestApi;
    if (!api) {
      throw new Error("Test API is not available.");
    }
    return api.getDebugState();
  });
}

async function launch(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Losfliegen" }).click();
  await expect(page.getByTestId("game-overlay")).toBeHidden();
}

test.describe("core browser flow", () => {
  const runtimeErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    runtimeErrors.length = 0;
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        runtimeErrors.push(message.text());
      }
    });
    await page.goto("./?test=1");
  });

  test.afterEach(() => {
    expect(runtimeErrors).toEqual([]);
  });

  test("starts without login, network dependencies or console errors", async ({ page, request }) => {
    await expect(page).toHaveTitle("Gravity Loop · MilosApps");
    await expect(page.getByTestId("game-canvas")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pause" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Losfliegen" })).toBeVisible();
    await expect(page.locator("#daily-seed")).toContainText("Sonnenorbit");

    const health = await request.get("./health.json");
    expect(health.ok()).toBe(true);
    await expect(health.json()).resolves.toEqual({
      status: "ok",
      app: "gravity-loop",
      environment: "dev",
    });

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      cookies: document.cookie,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
    expect(overflow.cookies).toBe("");
  });

  test("handles mouse hold, release and keyboard control with bounded input latency", async ({
    page,
    browserName,
  }) => {
    await launch(page);
    const canvas = page.getByTestId("game-canvas");
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) {
      return;
    }

    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.55);
    await page.mouse.down();
    await expect.poll(async () => (await debugState(page)).state.held).toBe(true);
    await page.waitForTimeout(160);
    await page.mouse.up();
    await expect.poll(async () => (await debugState(page)).state.held).toBe(false);

    await canvas.focus();
    await page.keyboard.down("Space");
    await expect.poll(async () => (await debugState(page)).state.held).toBe(true);
    await page.waitForTimeout(110);
    await page.keyboard.up("Space");
    await expect.poll(async () => (await debugState(page)).state.held).toBe(false);

    const debug = await debugState(page);
    expect(["playing", "gameover"]).toContain(debug.state.mode);
    expect(debug.metrics.inputSamples).toBeGreaterThanOrEqual(3);
    const headlessLatencyLimit = browserName === "chromium" ? 45 : 180;
    expect(debug.metrics.p95InputMs).toBeLessThan(headlessLatencyLimit);
  });

  test("releases multi-pointer input deterministically on cancel and lost capture", async ({
    page,
  }) => {
    await launch(page);
    const canvas = page.getByTestId("game-canvas");

    await canvas.dispatchEvent("pointerdown", {
      pointerId: 41,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
    });
    await canvas.dispatchEvent("pointerdown", {
      pointerId: 42,
      pointerType: "touch",
      isPrimary: false,
      button: 0,
    });
    await expect.poll(async () => (await debugState(page)).state.held).toBe(true);

    await canvas.dispatchEvent("pointercancel", {
      pointerId: 41,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
    });
    expect((await debugState(page)).state.held).toBe(true);

    await canvas.dispatchEvent("lostpointercapture", {
      pointerId: 42,
      pointerType: "touch",
      isPrimary: false,
      button: 0,
    });
    await expect.poll(async () => (await debugState(page)).state.held).toBe(false);

    for (let pointerId = 50; pointerId < 62; pointerId += 1) {
      await canvas.dispatchEvent("pointerdown", {
        pointerId,
        pointerType: "touch",
        isPrimary: true,
        button: 0,
      });
      await canvas.dispatchEvent("pointercancel", {
        pointerId,
        pointerType: "touch",
        isPrimary: true,
        button: 0,
      });
    }
    expect((await debugState(page)).state.held).toBe(false);
  });

  test("pauses safely for tab hiding, resumes explicitly and restarts idempotently", async ({
    page,
  }) => {
    await launch(page);
    const beforePause = await debugState(page);

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.getByRole("button", { name: "Weiterfliegen" })).toBeVisible();
    const paused = await debugState(page);
    expect(paused.state.mode).toBe("paused");
    expect(paused.state.pauseReason).toBe("hidden");
    expect(paused.state.held).toBe(false);

    await page.waitForTimeout(250);
    const stillPaused = await debugState(page);
    expect(stillPaused.state.player.position).toEqual(paused.state.player.position);
    expect(stillPaused.state.stepCount).toBe(paused.state.stepCount);

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect((await debugState(page)).state.mode).toBe("paused");
    await page.getByRole("button", { name: "Weiterfliegen" }).click();
    await expect.poll(async () => (await debugState(page)).state.mode).toBe("playing");

    await page.getByRole("button", { name: "Neustart" }).click();
    await page.getByRole("button", { name: "Neustart" }).click();
    await page.getByRole("button", { name: "Neustart" }).click();
    const restarted = await debugState(page);
    expect(restarted.state.mode).toBe("ready");
    expect(restarted.state.score).toBe(0);
    expect(restarted.state.stepCount).toBe(0);
    expect(beforePause.state.stepCount).toBeGreaterThan(0);
  });

  test("supports P and R without stealing native dialog keyboard input", async ({ page }) => {
    const canvas = page.getByTestId("game-canvas");
    await launch(page);
    await canvas.focus();
    await page.keyboard.press("p");
    await expect.poll(async () => (await debugState(page)).state.mode).toBe("paused");
    await page.keyboard.press("p");
    await expect.poll(async () => (await debugState(page)).state.mode).toBe("playing");
    await page.keyboard.press("r");
    await expect.poll(async () => (await debugState(page)).state.mode).toBe("ready");

    await page.getByRole("button", { name: "Einstellungen" }).click();
    await page.getByRole("combobox", { name: "Bewegung" }).focus();
    await page.keyboard.press("r");
    expect((await debugState(page)).state.mode).toBe("ready");
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("pauses on window focus loss and never leaves gravity stuck", async ({ page }) => {
    await launch(page);
    const canvas = page.getByTestId("game-canvas");
    await canvas.dispatchEvent("pointerdown", {
      pointerId: 71,
      pointerType: "pen",
      isPrimary: true,
      button: 0,
    });
    await expect.poll(async () => (await debugState(page)).state.held).toBe(true);

    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    const paused = await debugState(page);
    expect(paused.state.mode).toBe("paused");
    expect(paused.state.pauseReason).toBe("focus");
    expect(paused.state.held).toBe(false);
    await expect(page.getByRole("button", { name: "Weiterfliegen" })).toBeVisible();
  });

  test("survives offline play after load and resumes explicitly from page cache", async ({
    page,
    context,
  }) => {
    await launch(page);
    const beforeOffline = await debugState(page);
    await context.setOffline(true);
    await expect
      .poll(async () => (await debugState(page)).state.stepCount)
      .toBeGreaterThan(beforeOffline.state.stepCount);

    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });
    const afterResume = await debugState(page);
    expect(afterResume.state.mode).toBe("paused");
    expect(afterResume.state.pauseReason).toBe("hidden");
    await context.setOffline(false);
    await page.getByRole("button", { name: "Weiterfliegen" }).click();
    await expect.poll(async () => (await debugState(page)).state.mode).toBe("playing");
  });
});
