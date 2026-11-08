import { Container, Section } from "@/components/dashboard/layout"
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/panel"
import { SectionHeader } from "@/components/dashboard/section-header"
import { siteConfig } from "@/lib/site"
import { ContactForm } from "./contact-form"

export function ContactSection() {
  return (
    <Section id="contact" className="border-t">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <SectionHeader
            eyebrow="support"
            title="Open a ticket"
            description="Questions, collaboration ideas, or just saying hello. Send a message and I'll reply by email."
          />
          <p className="label-caps">other channels</p>
          <ul className="mt-3 space-y-2 text-sm">
            {siteConfig.socialLinks.map((channel) => (
              <li key={channel.href}>
                <a
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {channel.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
        <Panel>
          <PanelHeader title="new ticket" meta={<span>secure · turnstile</span>} />
          <PanelBody>
            <ContactForm />
          </PanelBody>
        </Panel>
      </Container>
    </Section>
  )
}
