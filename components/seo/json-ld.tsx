import { serializeJsonLd } from "@/lib/structured-data"

/** Renders schema.org structured data. Content is escaped by `serializeJsonLd`. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
