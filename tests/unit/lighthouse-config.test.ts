import { describe, expect, it } from "vitest"
import base from "@/lighthouserc.json"
import published from "@/lighthouserc.published.json"

describe("Lighthouse configs", () => {
  it("differ only by the /now URL (Homecave is always audited)", () => {
    const { url: baseUrls, ...baseCollect } = base.ci.collect
    const { url: publishedUrls, ...publishedCollect } = published.ci.collect
    expect(publishedCollect).toEqual(baseCollect)
    expect({ ...published.ci, collect: null }).toEqual({ ...base.ci, collect: null })
    expect(baseUrls).toContain("http://localhost:3200/homecave")
    expect(publishedUrls).toEqual([...baseUrls, "http://localhost:3200/now"])
  })
})
