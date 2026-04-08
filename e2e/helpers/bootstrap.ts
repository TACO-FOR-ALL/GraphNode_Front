import type { Page } from "@playwright/test";

export async function bootstrapAppState(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "onboarding-storage",
      JSON.stringify({
        state: {
          hasCompletedOnboarding: true,
          selectedUserType: null,
          selectedInterests: [],
          selectedTone: null,
        },
        version: 0,
      }),
    );
    localStorage.setItem(
      "changelog-storage",
      JSON.stringify({
        state: {
          lastSeenVersion: "1.0.0",
        },
        version: 0,
      }),
    );
    localStorage.setItem(
      "firstrun-storage",
      JSON.stringify({
        state: {
          isFirstRun: false,
          languageSynced: true,
        },
        version: 0,
      }),
    );
  });
}
