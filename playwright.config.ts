import { defineConfig, devices } from "@playwright/test";

const usesManagedLocalServer =
  process.env.GRAVITY_LOOP_E2E_SERVER !== "external";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4317",
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
  webServer: usesManagedLocalServer
    ? {
        command:
          "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4317 --strictPort",
        url: "http://127.0.0.1:4317/health.json",
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
