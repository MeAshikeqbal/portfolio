import { useTranslations } from "next-intl"
import type { Element } from "hast"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { ChevronDown } from "lucide-react"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"
import { FaGithub } from "react-icons/fa6"
import { Panel } from "@/components/dashboard/panel"
import { CodeBlock } from "@/components/portable-text/code-block"
import { isBoilerplateReadme, readmeTree, type ReadmeSource } from "@/lib/readme"
import { cn } from "@/lib/utils"

interface ProjectReadmeProps {
  markdown: string
  source: ReadmeSource
  /** Open by default (when the project has no case study of its own). */
  open?: boolean
  className?: string
}

function codeOf(node: Element): { code: string; language: string | null } {
  const code = node.children.find((c): c is Element => c.type === "element" && c.tagName === "code")
  const className = code?.properties.className
  const language =
    Array.isArray(className) &&
    className
      .map(String)
      .find((c) => c.startsWith("language-"))
      ?.slice("language-".length)
  const text = (n: Element): string =>
    n.children
      .map((c) => (c.type === "text" ? c.value : c.type === "element" ? text(c) : ""))
      .join("")
  return { code: code ? text(code) : text(node), language: language || null }
}

/**
 * The repository README, synced from GitHub with the project's stats, in a collapsible panel
 * below the case study. Framework starter READMEs render nothing.
 */
export function ProjectReadme({ markdown, source, open = false, className }: ProjectReadmeProps) {
  const t = useTranslations("projects")
  if (!markdown.trim() || isBoilerplateReadme(markdown)) return null
  const tree = readmeTree(markdown, source)
  const fileUrl = `https://github.com/${source.owner}/${source.repo}/blob/${source.ref}/${source.path}`

  const content = toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    passNode: true,
    components: {
      pre: ({ node }) => {
        if (!node) return null
        const { code, language } = codeOf(node)
        return <CodeBlock code={code} language={language} />
      },
    },
  })

  return (
    <section aria-labelledby="readme" className={cn("scroll-mt-24", className)}>
      <Panel>
        <details open={open} className="group">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 select-none hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
            <h2
              id="readme"
              className="flex min-w-0 items-center gap-2 truncate label-caps text-foreground"
            >
              <ChevronDown
                className="size-3.5 shrink-0 -rotate-90 transition-transform group-open:rotate-0"
                aria-hidden
              />
              {source.path.split("/").pop()}
            </h2>
            <span className="label-caps">
              {source.owner}/{source.repo} · {source.ref}
            </span>
          </summary>
          <div className="border-t px-4 py-6 sm:px-6">
            <article className="readme prose max-w-none">{content}</article>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-1.5 label-caps transition-colors hover:text-foreground"
            >
              <FaGithub className="size-3.5" aria-hidden /> {t("viewOnGithub")}
            </a>
          </div>
        </details>
      </Panel>
    </section>
  )
}
