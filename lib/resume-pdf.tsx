import "server-only"
import { join } from "node:path"
import {
  Document,
  Font,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer"
import type { ReactNode } from "react"
import { bareUrl, type ResumeData, type ResumeEntry } from "@/lib/resume"
import { siteConfig } from "@/lib/site"

/**
 * /resume.pdf, drawn from the same data as /resume.md (lib/resume.ts): A4, the site's
 * monochrome look in Geist (vendored in assets/fonts, as for the share images), real
 * selectable text and working links.
 */

const fonts = join(process.cwd(), "assets/fonts")
Font.register({
  family: "Geist",
  fonts: [
    { src: join(fonts, "Geist-Regular.ttf"), fontWeight: 400 },
    { src: join(fonts, "Geist-SemiBold.ttf"), fontWeight: 600 },
  ],
})
Font.register({ family: "GeistMono", src: join(fonts, "GeistMono-Regular.ttf") })
// Whole words only: hyphenated names and URLs read badly.
Font.registerHyphenationCallback((word) => [word])

const INK = "#111111"
const MUTED = "#5f5f5f"
const RULE = "#d9d9d9"

const s = StyleSheet.create({
  page: {
    fontFamily: "Geist",
    fontSize: 9.5,
    lineHeight: 1.45,
    color: INK,
    paddingTop: 44,
    paddingBottom: 52,
    paddingHorizontal: 48,
  },
  name: { fontSize: 22, fontWeight: 600, letterSpacing: -0.4, lineHeight: 1.1 },
  role: { marginTop: 4, fontSize: 11, color: MUTED },
  links: { marginTop: 8, flexDirection: "row", flexWrap: "wrap" },
  link: {
    fontFamily: "GeistMono",
    fontSize: 8,
    color: INK,
    textDecoration: "none",
    marginRight: 14,
  },
  tagline: { marginTop: 10, fontSize: 10.5 },
  section: { marginTop: 18 },
  label: {
    fontFamily: "GeistMono",
    fontSize: 7.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: MUTED,
    paddingBottom: 4,
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
  },
  entry: { marginBottom: 9 },
  entryHead: { flexDirection: "row", justifyContent: "space-between" },
  entryTitle: { fontWeight: 600, fontSize: 10.5, flexShrink: 1, paddingRight: 12 },
  period: { fontFamily: "GeistMono", fontSize: 8, color: MUTED, paddingTop: 2 },
  org: { color: MUTED },
  description: { marginTop: 2 },
  meta: { fontFamily: "GeistMono", fontSize: 7.5, color: MUTED, marginTop: 1 },
  skillRow: { flexDirection: "row", marginBottom: 4 },
  skillLabel: { width: 128, fontWeight: 600, paddingRight: 8 },
  skillNames: { flex: 1 },
  footer: {
    position: "absolute",
    bottom: 26,
    fontFamily: "GeistMono",
    fontSize: 7,
    color: MUTED,
  },
})

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      {/* A heading never sits alone at the foot of a page. */}
      <Text style={s.label} minPresenceAhead={40}>
        {title}
      </Text>
      {children}
    </View>
  )
}

function Entry({ entry }: { entry: ResumeEntry }) {
  return (
    <View style={s.entry} wrap={false}>
      <View style={s.entryHead}>
        <Text style={s.entryTitle}>{entry.title || entry.org}</Text>
        {entry.period ? <Text style={s.period}>{entry.period}</Text> : null}
      </View>
      {entry.title && entry.org ? <Text style={s.org}>{entry.org}</Text> : null}
      {entry.description ? <Text style={s.description}>{entry.description}</Text> : null}
    </View>
  )
}

export function ResumeDocument({ data }: { data: ResumeData }) {
  return (
    <Document
      title={`${data.name}, résumé`}
      author={data.name}
      subject={`${data.name}: ${data.role}`}
      creator={bareUrl(siteConfig.url)}
      producer={bareUrl(siteConfig.url)}
      language="en"
    >
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{data.name}</Text>
        <Text style={s.role}>{data.role}</Text>
        <View style={s.links}>
          {data.links.map((link) => (
            <Link key={link.url} src={link.url} style={s.link}>
              {bareUrl(link.url)}
            </Link>
          ))}
        </View>
        <Text style={s.tagline}>{data.tagline}</Text>

        {data.experience.length > 0 && (
          <Section title="Experience">
            {data.experience.map((entry, i) => (
              <Entry key={i} entry={entry} />
            ))}
          </Section>
        )}

        {data.projects.length > 0 && (
          <Section title="Projects">
            {data.projects.map((project) => (
              <View key={project.title} style={s.entry} wrap={false}>
                <View style={s.entryHead}>
                  {project.url ? (
                    <Link
                      src={project.url}
                      style={[s.entryTitle, { color: INK, textDecoration: "none" }]}
                    >
                      {project.title}
                    </Link>
                  ) : (
                    <Text style={s.entryTitle}>{project.title}</Text>
                  )}
                  {project.status ? <Text style={s.period}>{project.status}</Text> : null}
                </View>
                {project.description ? (
                  <Text style={s.description}>{project.description}</Text>
                ) : null}
                {project.tech.length > 0 && <Text style={s.meta}>{project.tech.join(" · ")}</Text>}
              </View>
            ))}
          </Section>
        )}

        {data.skills.length > 0 && (
          <Section title="Skills">
            {data.skills.map((group) => (
              <View key={group.label} style={s.skillRow} wrap={false}>
                <Text style={s.skillLabel}>{group.label}</Text>
                <Text style={s.skillNames}>{group.names.join(", ")}</Text>
              </View>
            ))}
          </Section>
        )}

        {data.education.length > 0 && (
          <Section title="Education">
            {data.education.map((entry, i) => (
              <Entry key={i} entry={entry} />
            ))}
          </Section>
        )}

        {data.writing.length > 0 && (
          <Section title="Writing">
            {data.writing.map((post) => (
              <View key={post.url} style={s.entryHead} wrap={false}>
                <Link src={post.url} style={{ color: INK, textDecoration: "none", flexShrink: 1 }}>
                  {post.title}
                </Link>
                {post.date ? <Text style={s.period}>{post.date}</Text> : null}
              </View>
            ))}
          </Section>
        )}

        <Text style={[s.footer, { left: 48 }]} fixed>
          {`Generated from ${bareUrl(siteConfig.url)} on ${data.generatedOn} · text: ${bareUrl(siteConfig.url)}/resume.md`}
        </Text>
      </Page>
    </Document>
  )
}

export function renderResumePdf(data: ResumeData): Promise<Buffer> {
  return renderToBuffer(<ResumeDocument data={data} />)
}
