import { highlight, resolveLanguage } from "@/lib/highlight"
import { CopyButton } from "./copy-button"

interface CodeBlockProps {
  code: string
  language?: string | null
  filename?: string | null
}

/** Server-rendered, Shiki-highlighted code block with a header (filename/language) and copy button. */
export async function CodeBlock({ code, language, filename }: CodeBlockProps) {
  const source = code.replace(/\n+$/, "")
  const html = await highlight(source, language)
  const lang = resolveLanguage(language)

  return (
    <figure className="not-prose my-6 overflow-hidden rounded-lg border bg-surface-2">
      <figcaption className="flex items-center justify-between gap-3 border-b py-1 pr-1 pl-4">
        <span className="truncate label-caps">{filename || (lang === "text" ? "code" : lang)}</span>
        <CopyButton text={source} />
      </figcaption>
      <div
        className="code-block overflow-x-auto p-4 font-mono text-sm leading-relaxed"
        // Shiki output: the code is escaped; only Shiki's own markup is unescaped.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </figure>
  )
}
