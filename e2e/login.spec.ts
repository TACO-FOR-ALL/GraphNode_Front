import { expect, test } from "@playwright/test";
import { bootstrapAppState } from "./helpers/bootstrap";
import { mockGraphNodeApi } from "./helpers/mockGraphNodeApi";

test("shows web login modal when the session is missing", async ({ page }) => {
  await bootstrapAppState(page);
  await mockGraphNodeApi(page, { authenticated: false });

  await page.goto("/");

  await expect(page.getByTestId("web-login-modal")).toBeVisible();
  await expect(page.getByTestId("login-google")).toBeVisible();
  await expect(page.getByTestId("login-apple")).toBeVisible();
});
