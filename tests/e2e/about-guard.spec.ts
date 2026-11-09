import { expect, test } from "@playwright/test"
import { ABOUT_PAGES } from "./about-state"

test("ABOUT_PAGES says whether /uses and /now are published", () => {
  expect(
    ["published", "unpublished"],
    "Run `export $(node scripts/about-state.mjs)` before building and testing.",
  ).toContain(ABOUT_PAGES)
})
