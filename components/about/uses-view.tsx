import { ArrowUpRight } from "lucide-react"
import { Container, Section } from "@/components/dashboard/layout"
import { Panel, PanelHeader } from "@/components/dashboard/panel"
import { SectionHeader } from "@/components/dashboard/section-header"
import { SkillIcon } from "@/components/skill-icon"
import type { USES_QUERY_RESULT } from "@/sanity.types"
import { formatDate } from "@/lib/format"
import { isMonochromeIcon } from "@/lib/icons"
import { cn } from "@/lib/utils"

type Uses = NonNullable<USES_QUERY_RESULT>

/** The /uses page body: one panel per section, one row per item. */
export function UsesView({ uses }: { uses: Uses }) {
  const sections = (uses.sections ?? []).filter((section) => (section.items?.length ?? 0) > 0)

  return (
    <main>
      <Section className="pt-12 sm:pt-16">
        <Container className="max-w-4xl">
          <SectionHeader
            as="h1"
            title="Uses"
            description={uses.intro ?? "The hardware, software and services I rely on."}
          />
          <p className="-mt-2 mb-8 label-caps">last updated · {formatDate(uses._updatedAt)}</p>
          <div className="space-y-6">
            {sections.map((section) => (
              <Panel key={section._key}>
                <PanelHeader
                  title={section.title}
                  meta={<span>{section.items!.length} items</span>}
                />
                <ul className="divide-y">
                  {section.items!.map((item) => (
                    <li key={item._key} className="flex items-start gap-3 px-4 py-3">
                      {item.icon && (
                        <span
                          className={cn(
                            "mt-0.5 grid size-7 shrink-0 place-items-center rounded",
                            isMonochromeIcon(item.icon) ? "bg-surface-2" : "bg-icon-plate",
                          )}
                        >
                          <SkillIcon
                            name={item.icon}
                            label=""
                            className="size-4.5 text-foreground"
                          />
                        </span>
                      )}
                      <div className="min-w-0">
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium hover:underline"
                          >
                            {item.name}
                            <ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden />
                          </a>
                        ) : (
                          <p className="font-medium">{item.name}</p>
                        )}
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            ))}
          </div>
        </Container>
      </Section>
    </main>
  )
}
