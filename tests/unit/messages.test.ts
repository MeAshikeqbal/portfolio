import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { parse } from "@formatjs/icu-messageformat-parser"
import { describe, expect, it } from "vitest"
import { locales } from "@/i18n/locales"
import { signature } from "@/lib/translate/icu"
import { flatten, hashMessage } from "@/lib/translate/messages"

const DIR = join(__dirname, "../../messages")
const read = (file: string) => JSON.parse(readFileSync(join(DIR, file), "utf8"))
const english = flatten(read("en.json"))

describe("English messages", () => {
  it.each([...english])("%s parses as ICU", (_, message) => {
    expect(() => parse(message, { ignoreTag: false })).not.toThrow()
  })
})

// Every served locale must have a complete, valid file that's up to date with English:
// `npm run i18n:translate` after any change to messages/en.json.
describe.each(locales.filter((l) => l !== "en"))("messages/%s.json", (locale) => {
  const translated = flatten(read(`${locale}.json`))

  it("has exactly the English keys", () => {
    expect([...translated.keys()].sort()).toEqual([...english.keys()].sort())
  })

  it("uses the same arguments and tags as English in every message", () => {
    const broken = [...english].filter(([key, message]) => {
      try {
        return signature(message).join("|") !== signature(translated.get(key) ?? "").join("|")
      } catch {
        return true
      }
    })
    expect(broken.map(([key]) => key)).toEqual([])
  })

  it("was translated from the current English", () => {
    const lock: Record<string, string> = existsSync(join(DIR, ".lock.json"))
      ? read(".lock.json")
      : {}
    const stale = [...english].filter(([key, message]) => lock[key] !== hashMessage(message))
    expect(stale.map(([key]) => key)).toEqual([])
  })
})
