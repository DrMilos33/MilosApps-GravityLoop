import { defineConfig, devices } from "@playwright/test";

const configuredDevUrl = process.env.GRAVITY_LOOP_DEV_URL?.trim();

if (!configuredDevUrl) {
  throw new Error(
    "GRAVITY_LOOP_DEV_URL muss auf die öffentliche Gravity-Loop-DEV-URL zeigen.",
  );
}

const parsedDevUrl = new URL(configuredDevUrl);
if (parsedDevUrl.protocol !== "https:") {
  throw new Error("Externe Gravity-Loop-DEV-Tests verlangen eine HTTPS-URL.");
}

const baseURL = parsedDevUrl.toString().endsWith("/")
  ? parsedDevUrl.toString()
  : `${parsedDevUrl.toString()}/`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: true,
  retries: 2,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
