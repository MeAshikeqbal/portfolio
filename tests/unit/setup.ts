import "@testing-library/jest-dom/vitest"
import type { RenderOptions } from "@testing-library/react"
import { afterEach, vi } from "vitest"
import { IntlWrapper } from "./intl"

// Components read their text from next-intl, so every render gets the English messages, as
// the [lang] layout provides them. A test can still pass its own `wrapper`.
vi.mock("@testing-library/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@testing-library/react")>()
  const render = (ui: Parameters<typeof actual.render>[0], options?: RenderOptions) =>
    actual.render(ui, { wrapper: IntlWrapper, ...options })
  return { ...actual, render: render as typeof actual.render }
})

afterEach(async () => {
  const { cleanup } = await import("@testing-library/react")
  cleanup()
})
