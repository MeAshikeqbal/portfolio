import { revalidatePath } from "next/cache"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const scheduled: (() => Promise<void>)[] = []
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => Promise<void>) => scheduled.push(task),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/sanity/lib/write-client", () => ({ writeClient: { fake: true } }))
vi.mock("@/i18n/locales", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/i18n/locales")>()),
  locales: ["en", "de", "ja"],
}))
const translateDocument = vi.fn(async () => ({ status: "done" }))
const deleteTranslations = vi.fn(async () => {})
vi.mock("@/lib/translate/document", () => ({
  translateDocument: (...args: unknown[]) => translateDocument(...(args as [])),
  deleteTranslations: (...args: unknown[]) => deleteTranslations(...(args as [])),
}))

const { POST } = await import("@/app/api/sanity-webhook/route")

const call = (body: unknown, secret = "s") =>
  POST(
    new NextRequest("http://localhost/api/sanity-webhook", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  )

describe("sanity webhook", () => {
  beforeEach(() => {
    vi.stubEnv("SANITY_WEBHOOK_SECRET", "s")
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "k")
    scheduled.length = 0
    vi.mocked(revalidatePath).mockClear()
    translateDocument.mockClear()
    deleteTranslations.mockClear()
  })

  it("rejects a wrong secret", async () => {
    expect((await call({ _type: "post" }, "nope")).status).toBe(401)
  })

  it("revalidates a post's pages in every language, then translates it", async () => {
    await call({ _id: "post-1", _type: "post", operation: "update" })
    expect(revalidatePath).toHaveBeenCalledWith("/[lang]/post/[slug]", "page")
    expect(scheduled).toHaveLength(1)
    await scheduled[0]()
    expect(translateDocument).toHaveBeenCalledWith(
      "post-1",
      expect.objectContaining({ apiKey: "k", locales: ["de", "ja"] }),
    )
  })

  it("removes the translations of a deleted document", async () => {
    await call({ _id: "post-1", _type: "post", operation: "delete" })
    await scheduled[0]()
    expect(deleteTranslations).toHaveBeenCalledWith("post-1", { fake: true })
    expect(translateDocument).not.toHaveBeenCalled()
  })

  it("ignores its own translation writes", async () => {
    await call({ _id: "translation-de-post-1", _type: "translation" })
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(scheduled).toHaveLength(0)
  })

  it("doesn't translate types it doesn't know", async () => {
    await call({ _id: "cv", _type: "cv" })
    expect(revalidatePath).toHaveBeenCalledWith("/resume.pdf")
    expect(scheduled).toHaveLength(0)
  })
})
