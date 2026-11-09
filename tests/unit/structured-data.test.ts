import { describe, expect, it } from "vitest"
import {
  blogPostingSchema,
  breadcrumbSchema,
  jsonLdGraph,
  personSchema,
  serializeJsonLd,
} from "@/lib/structured-data"

describe("structured data", () => {
  it("escapes '<' so a title can't break out of the script tag", () => {
    const json = serializeJsonLd(
      jsonLdGraph(blogPostingSchema({ slug: "x", title: "</script><script>alert(1)</script>" })),
    )
    expect(json).not.toContain("</script>")
    expect(JSON.parse(json)["@graph"][0].headline).toBe("</script><script>alert(1)</script>")
  })

  it("links the person to every social profile", () => {
    expect(personSchema().sameAs).toEqual(
      expect.arrayContaining([expect.stringContaining("github.com")]),
    )
  })

  it("numbers breadcrumbs from 1 with absolute URLs", () => {
    expect(breadcrumbSchema([{ name: "Writing", path: "/post" }])).toEqual({
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Writing",
          item: "https://www.itsashik.dev/post",
        },
      ],
    })
  })

  it("credits guest authors by name and the site owner by reference", () => {
    expect(
      blogPostingSchema({ slug: "a", title: "A", authorName: "Fardeen Ansari" }).author,
    ).toEqual({
      "@type": "Person",
      name: "Fardeen Ansari",
    })
    expect(blogPostingSchema({ slug: "a", title: "A", authorName: "Ashik Eqbal" }).author).toEqual({
      "@id": "https://www.itsashik.dev/#person",
    })
  })
})
