import { defineConfig, devices } from "@playwright/test";

process.env.GRAVITY_LOOP_EXPECTED_ENVIRONMENT = "production";

const configuredProductionUrl = process.env.GRAVITY_LOOP_PRODUCTION_URL?.trim();

if (!configuredProductionUrl) {
  throw new Error(
    "GRAVITY_LOOP_PRODUCTION_URL must point to the public Gravity Loop production URL.",
  );
}

const parsedProductionUrl = new URL(configuredProductionUrl);
if (parsedProductionUrl.protocol !== "https:") {
  throw new Error("External Gravity Loop production tests require an HTTPS URL.");
}

const baseURL = parsedProductionUrl.toString().endsWith("/")
  ? parsedProductionUrl.toString()
  : `${parsedProductionUrl.toString()}/`;

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
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
