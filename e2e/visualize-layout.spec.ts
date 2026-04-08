import { expect, test } from "@playwright/test";
import { bootstrapAppState } from "./helpers/bootstrap";
import { mockGraphNodeApi } from "./helpers/mockGraphNodeApi";

test("keeps a fixed desktop visualize workspace on narrow viewports", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await bootstrapAppState(page);
  await mockGraphNodeApi(page);

  await page.goto("/#/visualize");

  await expect(page).toHaveURL(/\/app\/#\/visualize$/);
  await expect(page.getByTestId("visualize-root")).toBeVisible();

  const rootBox = await page.getByTestId("visualize-root").boundingBox();
  const workspaceBox = await page
    .getByTestId("visualize-workspace")
    .boundingBox();

  expect(rootBox).not.toBeNull();
  expect(workspaceBox).not.toBeNull();
  expect(rootBox!.width).toBeGreaterThanOrEqual(1280);
  expect(workspaceBox!.width).toBeGreaterThanOrEqual(1024);

  await page.getByTestId("visualize-mode-3d").click();
  await expect(page.getByTestId("visualize-3d-canvas")).toBeVisible();
});
