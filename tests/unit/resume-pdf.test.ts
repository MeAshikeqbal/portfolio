// @vitest-environment node
import { describe, expect, it } from "vitest"
import { resumeData } from "@/lib/resume"
import { renderResumePdf } from "@/lib/resume-pdf"

describe("renderResumePdf", () => {
  it("draws a PDF with the site's fonts embedded", async () => {
    const data = resumeData(
      {
        experiences: [],
        education: [],
        skills: [],
        projects: [],
        posts: [],
      },
      new Date("2026-11-17T00:00:00Z"),
    )
    const pdf = await renderResumePdf(data)
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-")
    const raw = pdf.toString("latin1")
    expect(raw).toContain("Geist-Regular")
    expect(raw).toContain("GeistMono-Regular")
  })
})
