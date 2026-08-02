import type { Page } from "@playwright/test";

const PRIVACY_STORAGE_KEY = "milosapps.gravity-loop.privacyNotice.v1";

export async function suppressPrivacyNotice(page: Page): Promise<void> {
  await page.addInitScript((storageKey) => {
    try {
      localStorage.setItem(storageKey, "dismissed");
    } catch {
      // Tests that deliberately disable storage still exercise the app itself.
    }
  }, PRIVACY_STORAGE_KEY);
}
