import type { PortableTextBlock, PortableTextComponents } from "@portabletext/react"
import Image from "next/image"
import type { ReactNode } from "react"
import { blockText, slugify } from "@/lib/portable-text"
import { urlFor } from "@/sanity/lib/image"
import { cn } from "@/lib/utils"
import { CodeBlock } from "./code-block"

interface ImageBlock {
  asset?: { _ref?: string }
  alt?: string
  caption?: string
}

interface CodeBlockValue {
  code?: string
  language?: string
  filename?: string
  highlightedLines?: number[]
}

interface CalloutValue {
  tone?: "note" | "warning"
  title?: string
  text?: string
}

const CALLOUT_STYLES = {
  note: { label: "Note", className: "border-status-info bg-status-info-soft" },
  warning: { label: "Warning", className: "border-status-warn bg-status-warn-soft" },
}

/**
 * Renderers for the `blockContent` schema (sanity/schemaTypes/blockContentType.ts), shared by
 * blog posts and project case studies. Typography comes from `prose`; these only add structure
 * the defaults can't: anchored headings, server-highlighted code, callouts, inline images and
 * safe links.
 *
 * Pass `headingIds` (from `buildToc`) so heading ids match the table of contents exactly.
 */
export function createPortableTextComponents(
  headingIds: Map<string, string> = new Map(),
): PortableTextComponents {
  const anchored = (Tag: "h2" | "h3") =>
    function AnchoredHeading({
      value,
      children,
    }: {
      value: PortableTextBlock
      children?: ReactNode
    }) {
      const id = (value._key && headingIds.get(value._key)) || slugify(blockText(value as never))
      return (
        <Tag id={id} className="group scroll-mt-24">
          {children}
          <a
            href={`#${id}`}
            aria-label="Link to this section"
            className="ml-2 font-normal text-muted-foreground no-underline opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            #
          </a>
        </Tag>
      )
    }

  return {
    block: {
      h2: anchored("h2"),
      h3: anchored("h3"),
      // Legacy: code used to be stored as an annotation on a paragraph and rendered as a block
      // element, which can't live inside a <p> (invalid HTML → hydration error), so those
      // paragraphs render as <div>. scripts/code-annotations-to-blocks.ts converts them to code
      // blocks; this (and the annotation branch of `marks.code`) can go once it has run.
      normal: ({ value, children }) =>
        value.markDefs?.some((def) => def._type === "code" && typeof def.code === "string") ? (
          <div className="my-5">{children}</div>
        ) : (
          <p>{children}</p>
        ),
    },
    types: {
      code: ({ value }: { value: CodeBlockValue }) =>
        value?.code ? (
          <CodeBlock
            code={value.code}
            language={value.language}
            filename={value.filename}
            highlightedLines={value.highlightedLines}
          />
        ) : null,
      callout: ({ value }: { value: CalloutValue }) => {
        if (!value?.text) return null
        const tone = CALLOUT_STYLES[value.tone ?? "note"] ?? CALLOUT_STYLES.note
        return (
          <aside
            className={cn("not-prose my-6 rounded-lg border-l-2 px-4 py-3 text-sm", tone.className)}
          >
            <p className="mb-1 label-caps text-foreground">{value.title || tone.label}</p>
            <p className="leading-relaxed whitespace-pre-line text-foreground">{value.text}</p>
          </aside>
        )
      },
      image: ({ value }: { value: ImageBlock }) => {
        if (!value?.asset?._ref) return null
        return (
          <figure>
            <Image
              src={urlFor(value).width(1600).fit("max").auto("format").url()}
              alt={value.alt ?? ""}
              width={1600}
              height={900}
              sizes="(min-width: 768px) 720px, 100vw"
              className="h-auto w-full rounded-lg border"
            />
            {value.caption && <figcaption>{value.caption}</figcaption>}
          </figure>
        )
      },
    },
    marks: {
      code: ({ value, children }) => {
        // Legacy `code` annotation (see `block.normal`): it carries the snippet itself and the
        // selected text is just its anchor. Otherwise this is the inline-code decorator.
        if (value && typeof value.code === "string") {
          return (
            <CodeBlock
              code={value.code}
              language={value.language as string | undefined}
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
}

/** Default renderers (headings get ids from their text). */
export const portableTextComponents = createPortableTextComponents()
