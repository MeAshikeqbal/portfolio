import { describe, expect, it } from "vitest"
import { rankRelated } from "@/lib/related"

const categories = [
  { _id: "homelab", posts: 2 },
  { _id: "tech", posts: 10 },
]

const post = (id: string, categoryIds: string[], publishedAt: string) => ({
  _id: id,
  categoryIds,
  publishedAt,
})

describe("rankRelated", () => {
  it("puts a rare shared topic ahead of newer posts that only share a common one", () => {
    const ranked = rankRelated(
      [
        post("new-generic", ["tech"], "2026-01-01"),
        post("old-homelab", ["homelab"], "2023-01-01"),
        post("newer-generic", ["tech"], "2026-02-01"),
      ],
      categories,
    )
    expect(ranked.map((p) => p._id)).toEqual(["old-homelab", "newer-generic", "new-generic"])
  })

  it("scores posts sharing more topics higher, and drops ones sharing none", () => {
    const ranked = rankRelated(
      [
        post("both", ["homelab", "tech"], "2020-01-01"),
        post("homelab", ["homelab"], "2025-01-01"),
        post("unrelated", ["other"], "2026-01-01"),
      ],
      categories,
    )
    expect(ranked.map((p) => p._id)).toEqual(["both", "homelab"])
  })

  it("respects the limit", () => {
    const many = Array.from({ length: 6 }, (_, i) => post(`p${i}`, ["tech"], `2026-0${i + 1}-01`))
    expect(rankRelated(many, categories, 3)).toHaveLength(3)
  })
})
