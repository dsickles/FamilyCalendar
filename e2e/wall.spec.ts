import { expect, test } from "@playwright/test";
import { VIEWPORTS } from "./gate-env";

// Prototype wall at /wall: every tab fills each gated viewport without
// document scroll, and its own controls are at least 44×44. The Calendar
// tab reuses the calendar views, which layout.spec.ts already covers.

const TABS = ["Today", "Calendar", "Meals", "Shopping", "To-dos", "Photos"] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`wall ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    for (const tab of TABS) {
      test(`${tab} tab`, async ({ page }) => {
        await page.goto("/wall");
        const rail = page.getByRole("navigation", { name: "Sections" });
        await rail.getByRole("button", { name: tab, exact: true }).click();
        await expect(page.getByRole("region", { name: tab })).toBeVisible();

        const doc = await page.evaluate(() => {
          window.scrollTo(0, 10_000);
          const root = document.scrollingElement ?? document.documentElement;
          return {
            scrollY: window.scrollY,
            overflowY: root.scrollHeight - root.clientHeight,
            overflowX: root.scrollWidth - root.clientWidth,
          };
        });
        expect(doc, "document must not scroll").toEqual({
          scrollY: 0,
          overflowY: 0,
          overflowX: 0,
        });

        const smallTargets = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>(".w-stage button")]
            .filter((el) => el.checkVisibility() && !el.closest(".w-calendar"))
            .map((el) => {
              const box = el.getBoundingClientRect();
              return {
                name: el.getAttribute("aria-label") || el.textContent?.trim() || el.tagName,
                width: Math.round(box.width),
                height: Math.round(box.height),
              };
            })
            .filter((target) => target.width < 44 || target.height < 44),
        );
        expect(smallTargets, "tap targets must be at least 44×44").toEqual([]);
      });
    }
  });
}
