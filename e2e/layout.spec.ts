import { expect, test, type Page } from "@playwright/test";
import { VIEWPORTS } from "./gate-env";

// Constitution Principle I: each wall viewport fills without document
// scroll, the week time grid is the only scroller, and targets are 44×44.

type View = "month" | "week" | "day";

async function openView(page: Page, view: View) {
  await page.goto("/");
  const month = page.getByRole("region", { name: "Month" });
  await expect(month).toBeVisible();
  if (view === "month") {
    // Day cells stay disabled until the demo events load.
    await expect(month.getByRole("button", { name: /day,/ }).first()).toBeEnabled();
    return;
  }
  await month.getByRole("button", { name: /day,/ }).first().click();
  const day = page.getByRole("region", { name: "Day" });
  await expect(day).toBeVisible();
  if (view === "week") {
    await day.getByRole("button", { name: "Week", exact: true }).click();
    await expect(page.getByRole("region", { name: "Week" })).toBeVisible();
  }
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    for (const view of ["month", "week", "day"] as const) {
      test(`${view} view`, async ({ page }) => {
        await openView(page, view);

        const doc = await page.evaluate(() => {
          window.scrollTo(0, 10_000);
          const root = document.scrollingElement ?? document.documentElement;
          return {
            scrollY: window.scrollY,
            scrollX: window.scrollX,
            overflowY: root.scrollHeight - root.clientHeight,
            overflowX: root.scrollWidth - root.clientWidth,
          };
        });
        expect(doc, "document must not scroll").toEqual({
          scrollY: 0,
          scrollX: 0,
          overflowY: 0,
          overflowX: 0,
        });

        const scrollers = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>("body *")]
            .filter((el) => {
              const style = getComputedStyle(el);
              return /auto|scroll/.test(style.overflowY + style.overflowX);
            })
            .map((el) => ({
              label: el.getAttribute("aria-label"),
              overscroll: getComputedStyle(el).overscrollBehaviorY,
              scrollable: el.scrollHeight > el.clientHeight,
            })),
        );
        if (view === "week") {
          expect(scrollers).toEqual([
            { label: "Week hours", overscroll: "contain", scrollable: true },
          ]);
        } else {
          expect(scrollers).toEqual([]);
        }

        const smallTargets = await page.evaluate(() =>
          [
            ...document.querySelectorAll<HTMLElement>(
              "button, a[href], [role='button'], input, select",
            ),
          ]
            .filter((el) => el.checkVisibility())
            .map((el) => {
              const box = el.getBoundingClientRect();
              return {
                name:
                  el.getAttribute("aria-label") ||
                  el.textContent?.trim() ||
                  el.tagName,
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
