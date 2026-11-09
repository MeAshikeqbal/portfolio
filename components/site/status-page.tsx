import type { ReactNode } from "react"
import { GridBackdrop } from "@/components/dashboard/layout"
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/panel"
import { StatusDot } from "@/components/dashboard/status-dot"
import type { Status } from "@/lib/status"

interface StatusPageProps {
  code: number
  status: Status
  title: string
  description: string
  /** Optional reference shown under the message, e.g. an error digest. */
  reference?: string
  actions: ReactNode
}

/** Full-page "incident" panel used by the 404 and error pages. */
export function StatusPage({
  code,
  status,
  title,
  description,
  reference,
  actions,
}: StatusPageProps) {
  return (
    <main className="relative grid min-h-[70vh] place-items-center overflow-hidden px-4 py-20">
      <GridBackdrop />
      <Panel className="relative w-full max-w-lg">
        <PanelHeader
          title={
            <>
              <StatusDot status={status} /> incident
            </>
          }
          meta={<span>http {code}</span>}
        />
        <PanelBody className="space-y-4 p-6">
          <p className="font-mono text-6xl font-semibold tracking-tight tabular">{code}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
          {reference && <p className="label-caps">ref · {reference}</p>}
          <div className="flex flex-wrap gap-3 pt-2">{actions}</div>
        </PanelBody>
      </Panel>
    </main>
  )
}
