import type { PortableTextBlock, PortableTextComponents } from "@portabletext/react"
import Image from "next/image"
import type { ReactNode } from "react"
import { blockText, slugify } from "@/lib/portable-text"
import { urlFor } from "@/sanity/lib/image"
import { cn } from "@/lib/utils"
import { StatusDot } from "@/components/dashboard/status-dot"
import type { Status } from "@/lib/status"
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

// A tinted panel with a hairline and a status dot + label, not a coloured side stripe: the
// label carries the tone, and the system's panels are 1px all round.
const CALLOUT_STYLES = {
  note: { label: "Note", status: "info", className: "bg-status-info-soft" },
  warning: { label: "Warning", status: "warn", className: "bg-status-warn-soft" },
} as const satisfies Record<string, { label: string; status: Status; className: string }>

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
            className={cn("not-prose my-6 rounded-lg border px-4 py-3 text-sm", tone.className)}
          >
            <p className="mb-1 flex items-center gap-2 label-caps text-foreground">
              {/* With a custom title, the dot still tells screen readers the tone. */}
              <StatusDot
                status={tone.status}
                label={value.title ? tone.label : undefined}
                className="size-1.5"
              />
              {value.title || tone.label}
            </p>
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
              className="h-auto w-full rounded-lg border bg-surface-2"
            />
            {value.caption && <figcaption>{value.caption}</figcaption>}
          </figure>
        )
      },
    },
    marks: {
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
