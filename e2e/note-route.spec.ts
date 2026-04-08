import { expect, test } from "@playwright/test";
import { bootstrapAppState } from "./helpers/bootstrap";
import { mockGraphNodeApi } from "./helpers/mockGraphNodeApi";

test("opens the note editor from the home create card", async ({ page }) => {
  await bootstrapAppState(page);
  await mockGraphNodeApi(page);

  await page.goto("/#/note");

  await expect(page).toHaveURL(/\/app\/#\/note$/);
  await expect(page.getByTestId("note-editor")).toBeVisible();
});
