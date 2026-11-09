import { describe, expect, it } from "vitest"
import base from "@/lighthouserc.json"
import published from "@/lighthouserc.published.json"

describe("Lighthouse configs", () => {
  it("differ only by the /uses and /now URLs", () => {
    const { url: baseUrls, ...baseCollect } = base.ci.collect
    const { url: publishedUrls, ...publishedCollect } = published.ci.collect
    expect(publishedCollect).toEqual(baseCollect)
    expect({ ...published.ci, collect: null }).toEqual({ ...base.ci, collect: null })
    expect(publishedUrls).toEqual([
      ...baseUrls,
      "http://localhost:3200/uses",
      "http://localhost:3200/now",
    ])
  })
})
