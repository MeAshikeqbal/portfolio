import type { PortableTextComponents } from "@portabletext/react"
import Image from "next/image"
import { urlFor } from "@/sanity/lib/image"
import { CodeBlock } from "./code-block"

interface ImageBlock {
  asset?: { _ref?: string }
  alt?: string
}

/**
 * Renderers for the `blockContent` schema (sanity/schemaTypes/blockContentType.ts), shared by
 * blog posts and project case studies. Typography comes from `prose`; these only cover
 * structure the defaults can't: code-block annotations, inline images and safe links.
 */
export const portableTextComponents: PortableTextComponents = {
  block: {
    // A code-block annotation renders a <div>, which can't live inside a <p>
    // (invalid HTML → hydration error), so those paragraphs render as <div>.
    normal: ({ value, children }) =>
      value.markDefs?.some((def) => def._type === "code" && typeof def.code === "string") ? (
        <div className="my-5">{children}</div>
      ) : (
        <p>{children}</p>
      ),
  },
  types: {
    image: ({ value }: { value: ImageBlock }) => {
      if (!value?.asset?._ref) return null
      return (
        <figure>
          <Image
            src={urlFor(value).width(1600).fit("max").auto("format").url()}
            alt={value.alt ?? ""}
            width={1600}
            height={900}
            sizes="(min-width: 896px) 896px, 100vw"
            className="h-auto w-full rounded-lg border"
          />
          {value.alt && <figcaption>{value.alt}</figcaption>}
        </figure>
      )
    },
  },
  marks: {
    code: ({ value, children }) => {
      // The `code` annotation carries the snippet itself; the selected text is just its anchor.
      if (value && typeof value.code === "string") {
        return (
          <CodeBlock
            code={value.code}
            language={(value.language as string) || "plaintext"}
            filename={value.filename as string | undefined}
          />
        )
      }
      return <code>{children}</code>
    },
    link: ({ value, children }) => {
      const href = typeof value?.href === "string" ? value.href : null
      if (!href) return <span>{children}</span>
      const external = /^https?:\/\//.test(href)
      return (
        <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {children}
        </a>
      )
    },
  },
}
