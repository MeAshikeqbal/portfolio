import { describe, expect, it, vi } from "vitest"
import { batches, translateHtml } from "@/lib/translate/google"
import { prepare, rebuild, verify } from "@/lib/translate/icu"
import { flatten, unflatten } from "@/lib/translate/messages"

/** A stand-in for Google: upper-cases text, leaves translate="no" spans as they are. */
function shout(html: string): string {
  let keep = 0
  return html
    .split(/(<[^>]+>)/)
    .map((part) => {
      if (part.startsWith("<")) {
        if (/translate="no"/.test(part)) keep++
        else if (part === "</span>" && keep > 0) keep--
        return part
      }
      return keep > 0 ? part : part.toUpperCase()
    })
    .join("")
}

const translate = (message: string, locale: string, fn: (html: string) => string = shout) => {
  const prepared = prepare(message)
  return rebuild(prepared, new Map(prepared.segments.map((s) => [s, fn(s)])), locale)
}

describe("ICU translation", () => {
  it("keeps arguments out of the translator's hands", () => {
    expect(translate("Show all {count}", "de")).toBe("SHOW ALL {count}")
  })

  it("rebuilds plurals in the target language's categories", () => {
    const message = "{count, plural, one {# post} other {# posts}}"
    expect(translate(message, "ja")).toBe("{count, plural, other {# POSTS}}")
    expect(translate(message, "es")).toBe(
      "{count, plural, one {# POST} many {# POSTS} other {# POSTS}}",
    )
    expect(translate(message, "hi")).toBe("{count, plural, one {# POST} other {# POSTS}}")
  })

  it("translates every select branch and keeps the keys", () => {
    expect(translate("{kind, select, listening {listening} other {watching}}", "de")).toBe(
      "{kind, select, listening {LISTENING} other {WATCHING}}",
    )
  })

  it("translates rich-text tags' content in place", () => {
    expect(translate("A <link>now page</link>, an idea.", "de")).toBe(
      "A <link>NOW PAGE</link>, AN IDEA.",
    )
    expect(translate("updated <time></time>", "de")).toBe("UPDATED <time></time>")
  })

  it("never translates protected names", () => {
    expect(translate("Nothing playing on my Jellyfin", "de")).toBe("NOTHING PLAYING ON MY Jellyfin")
  })

  it("escapes what ICU treats as syntax", () => {
    const out = translate("{name}'s lab", "de", (html) => html.replace("lab", "{lab} #1"))
    expect(out).toBe("{name}''s '{'lab'}' #1")
    expect(verify("{name}'s lab", out)).toBe(true)
  })

  it("decodes entities Google returns", () => {
    expect(
      translate("Couldn't copy", "de", () => "Konnte nicht &quot;kopieren&quot; &amp; so"),
    ).toBe('Konnte nicht "kopieren" & so')
  })

  it("rejects a translation that lost or invented an argument", () => {
    expect(verify("Hi {name}", "Hallo")).toBe(false)
    expect(verify("Hi {name}", "Hallo {nom}")).toBe(false)
    expect(verify("Hi {name}", "Hallo {name}")).toBe(true)
    expect(verify("Hi {name}", "Hallo {name")).toBe(false)
  })

  it("sends nothing for a message that is only placeholders", () => {
    expect(prepare("{count}").segments).toEqual([])
  })
})

describe("Google client", () => {
  it("splits work into requests Google accepts", () => {
    const many = Array.from({ length: 250 }, (_, i) => `s${i}`)
    expect(batches(many).map((b) => b.length)).toEqual([100, 100, 50])
    const long = ["x".repeat(20_000), "y".repeat(20_000)]
    expect(batches(long)).toHaveLength(2)
  })

  it("sends each distinct segment once and keeps the caller's order", async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const { q, target, format } = JSON.parse(init!.body as string)
      expect([target, format]).toEqual(["de", "html"])
      return Response.json({
        data: { translations: q.map((s: string) => ({ translatedText: `${s}!` })) },
      })
    })
    const out = await translateHtml(["a", "b", "a"], {
      apiKey: "k",
      target: "de",
      fetch: fetch as unknown as typeof globalThis.fetch,
    })
    expect(out).toEqual(["a!", "b!", "a!"])
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string).q).toEqual(["a", "b"])
  })

  it("retries rate limits, then gives up on errors that won't change", async () => {
    let calls = 0
    const fetch = vi.fn(async () => {
      calls++
      return calls === 1
        ? new Response("slow down", { status: 429 })
        : Response.json({ data: { translations: [{ translatedText: "ok" }] } })
    })
    const sleep = vi.fn(async () => {})
    const opts = { apiKey: "k", target: "de", sleep }
    expect(
      await translateHtml(["x"], { ...opts, fetch: fetch as unknown as typeof globalThis.fetch }),
    ).toEqual(["ok"])
    expect(sleep).toHaveBeenCalledOnce()

    const denied = vi.fn(async () => new Response("bad key", { status: 403 }))
    await expect(
      translateHtml(["x"], { ...opts, fetch: denied as unknown as typeof globalThis.fetch }),
    ).rejects.toThrow("403")
  })
})

describe("message files", () => {
  it("flatten and unflatten round-trip in the English key order", () => {
    const tree = { b: { y: "2", x: "1" }, a: "0" }
    const flat = flatten(tree)
    expect([...flat.keys()]).toEqual(["b.y", "b.x", "a"])
    expect(unflatten(flat, ["a", "b.x", "b.y"])).toEqual({ a: "0", b: { x: "1", y: "2" } })
  })
})
