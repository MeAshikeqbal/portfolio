import { absoluteUrl, siteConfig } from "@/lib/site"

/**
 * schema.org JSON-LD builders. Entities reference each other by `@id` so search engines can
 * connect the person, the website and their posts/projects.
 */
type Thing = Record<string, unknown>

const PERSON_ID = absoluteUrl("/#person")
const WEBSITE_ID = absoluteUrl("/#website")

export function personSchema(): Thing {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: siteConfig.name,
    url: siteConfig.url,
    image: absoluteUrl("/me-2026.jpg"),
    jobTitle: siteConfig.role,
    description: siteConfig.tagline,
    sameAs: siteConfig.socialLinks.map((link) => link.href),
  }
}

export function websiteSchema(): Thing {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: siteConfig.url,
    name: siteConfig.name,
    description: siteConfig.description,
    inLanguage: "en",
    author: { "@id": PERSON_ID },
    publisher: { "@id": PERSON_ID },
  }
}

export function breadcrumbSchema(items: { name: string; path: string }[]): Thing {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function blogPostingSchema(post: {
  slug: string
  title: string
  description?: string | null
  publishedAt?: string | null
  updatedAt?: string | null
  authorName?: string | null
  tags?: string[]
  wordCount?: number
  /** Absolute URL of the cover image, if any. */
  image?: string
}): Thing {
  const url = absoluteUrl(`/post/${post.slug}`)
  return {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: url,
    url,
    headline: post.title,
    description: post.description ?? undefined,
    image: post.image,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt ?? post.publishedAt ?? undefined,
    author:
      post.authorName && post.authorName !== siteConfig.name
        ? { "@type": "Person", name: post.authorName }
        : { "@id": PERSON_ID },
    publisher: { "@id": PERSON_ID },
    isPartOf: { "@id": WEBSITE_ID },
    keywords: post.tags?.length ? post.tags.join(", ") : undefined,
    wordCount: post.wordCount,
    inLanguage: "en",
  }
}

export function projectSchema(project: {
  slug: string
  title: string
  description?: string | null
  repo?: string | null
  url?: string | null
  language?: string | null
  license?: string | null
  /** Absolute URL of the cover image, if any. */
  image?: string
}): Thing {
  const pageUrl = absoluteUrl(`/projects/${project.slug}`)
  return {
    "@type": "SoftwareSourceCode",
    "@id": `${pageUrl}#project`,
    name: project.title,
    description: project.description ?? undefined,
    url: pageUrl,
    image: project.image,
    codeRepository: project.repo ?? undefined,
    programmingLanguage: project.language ?? undefined,
    license: project.license && project.license !== "Not specified" ? project.license : undefined,
    sameAs: project.url || undefined,
    author: { "@id": PERSON_ID },
  }
}

/** Wraps entities in a single JSON-LD document. */
export function jsonLdGraph(...things: Thing[]): Thing {
  return { "@context": "https://schema.org", "@graph": things }
}

/** Serialises JSON-LD for a <script> tag; escapes `<` so content can't close the tag. */
export function serializeJsonLd(data: Thing): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
