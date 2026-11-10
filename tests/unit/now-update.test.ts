import { describe, expect, it } from "vitest"
import {
  buildNewUpdateDraft,
  newUpdateBlocker,
  type PublishedNow,
} from "@/sanity/actions/now-update"
import { todayIso } from "@/sanity/schemaTypes/nowType"

const block = (text: string) => ({
  _type: "block",
  _key: text,
  children: [{ _type: "span", text }],
})

const published: PublishedNow = {
  _id: "now",
  _type: "now",
  _rev: "rev1",
  _createdAt: "2026-11-01T00:00:00Z",
  _updatedAt: "2026-11-09T18:00:22Z",
  updatedOn: "2026-11-09",
  location: "Kolkata, India",
  body: [block("Old update.")],
  archive: [{ _key: "older", date: "2026-06-01" }],
}

describe("Start a new update", () => {
  it("moves the published update to the top of the archive and dates the draft today", () => {
    const draft = buildNewUpdateDraft(published, "2026-11-11", () => "k1")
    expect(draft).toEqual({
      _id: "drafts.now",
      _type: "now",
      updatedOn: "2026-11-11",
      location: "Kolkata, India",
      // The text carries over: the new update starts from the old one.
      body: [block("Old update.")],
      archive: [
        {
          _key: "k1",
          _type: "nowEntry",
          date: "2026-11-09",
          location: "Kolkata, India",
          body: [block("Old update.")],
        },
        { _key: "older", date: "2026-06-01" },
      ],
    })
    // Sanity's own fields never ride along.
    expect(draft).not.toHaveProperty("_rev")
    expect(draft).not.toHaveProperty("_createdAt")
    expect(draft).not.toHaveProperty("_updatedAt")
  })

  it("dates an older document by its last edit, and leaves out a missing location", () => {
    const legacy: PublishedNow = { ...published, updatedOn: undefined, location: null }
    delete legacy.archive
    const draft = buildNewUpdateDraft(legacy, "2026-11-11", () => "k1")
    expect(draft.archive).toEqual([
      { _key: "k1", _type: "nowEntry", date: "2026-11-09", body: [block("Old update.")] },
    ])
  })

  it("explains why it can't run", () => {
    expect(newUpdateBlocker(null, false, "2026-11-11")).toMatch(/Publish the first update/)
    expect(newUpdateBlocker({ ...published, body: [] }, false, "2026-11-11")).toMatch(/first/)
    expect(newUpdateBlocker(published, true, "2026-11-11")).toMatch(/draft/)
    expect(newUpdateBlocker(published, false, "2026-11-09")).toMatch(/already dated today/)
    expect(newUpdateBlocker(published, false, "2026-11-11")).toBeNull()
  })

  it("writes today as a local calendar date", () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05")
  })
})
