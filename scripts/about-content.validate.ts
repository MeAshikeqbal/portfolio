/**
 * Checks for the /uses and /now seed content (scripts/about-content.data.ts), shared by the
 * publish script and its unit test. Returns human-readable problems; empty means publishable.
 */
import { renderIconSvg } from "../lib/icons"
import type { AboutBlock, AboutSection } from "./about-content.data"

/** The hero reads the first section titled "Homelab…" and shows up to five of its items. */
export const HOMELAB_ITEMS = 5
/** The hero truncates descriptions on one line; past this they get cut on a phone. */
export const HOMELAB_DESCRIPTION_MAX = 45
/** Sections that describe the homelab: no links, and the strictest wording rules. */
const INFRA_SECTIONS = new Set(["homelab", "self-hosted", "network"])

/** Domains that may appear in public copy. */
const ALLOWED_DOMAINS = new Set(["itsashik.dev"])

/**
 * Wording that would map out the private network or name things the owner keeps private.
 * Each pattern is tested against every public string.
 */
export const FORBIDDEN_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "IPv4 address", pattern: /\b\d{1,3}(?:\.\d{1,3}){3}\b/ },
  // ":8006", "host:8006" or "Dashboard :8006", but not a time like "10:30" or "Note: 12".
  { label: "port number", pattern: /(?<![\d:]):\d{2,5}\b/ },
  { label: "node hostname", pattern: /\bpve(?:-\d+)?\b/i },
  { label: "private DNS suffix", pattern: /\.(?:lan|local|internal|home\.arpa)\b/i },
  { label: "lab domain or org name", pattern: /homecave|exsbe/i },
  // "v3.7" or "9.2.21"; a bare "V3" in a product name is fine.
  { label: "version number", pattern: /\bv\d+\.\d+|\b\d+\.\d+\.\d+\b/i },
  { label: "security control", pattern: /crowdsec|fail2ban|wazuh/i },
  { label: "private project", pattern: /producr|\bplane\b/i },
  { label: "camera detail", pattern: /\bcamera|\bcam\d|\brtsp\b|\bonvif\b/i },
  { label: "subnet detail", pattern: /\bsubnet\b/i },
]

/** The full Iconify name ("set:icon"), the same rule as lib/icons.ts. */
const ICON_NAME = /^[a-z0-9-]+:[a-z0-9-]+$/

const DOMAIN =
  /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|site|dev|tech|xyz|app|me|cloud)\b/gi

export interface AboutContent {
  uses: { intro: string; sections: AboutSection[] }
  now: { location: string; body: AboutBlock[] }
}

/** Every public string, labelled with where it lives. */
function publicStrings({ uses, now }: AboutContent): { where: string; text: string }[] {
  const out = [{ where: "uses.intro", text: uses.intro }]
  for (const section of uses.sections) {
    out.push({ where: `uses.${section._key}.title`, text: section.title })
    for (const item of section.items) {
      const where = `uses.${section._key}.${item._key}`
      out.push({ where: `${where}.name`, text: item.name })
      if (item.description) out.push({ where: `${where}.description`, text: item.description })
      if (item.url) out.push({ where: `${where}.url`, text: item.url })
    }
  }
  out.push({ where: "now.location", text: now.location })
  for (const block of now.body) {
    for (const child of block.children) out.push({ where: `now.${block._key}`, text: child.text })
    for (const mark of block.markDefs ?? []) {
      out.push({ where: `now.${block._key}.link`, text: mark.href })
    }
  }
  return out
}

function duplicateKeys(keys: string[]): string[] {
  return keys.filter((key, i) => keys.indexOf(key) !== i)
}

export async function validateAboutContent(content: AboutContent): Promise<string[]> {
  const problems: string[] = []
  const { uses, now } = content

  for (const { where, text } of publicStrings(content)) {
    if (/\bTODO\b/.test(text)) problems.push(`${where}: still has a TODO`)
    for (const { label, pattern } of FORBIDDEN_PATTERNS) {
      if (pattern.test(text)) problems.push(`${where}: looks like a ${label} ("${text}")`)
    }
    for (const domain of text.match(DOMAIN) ?? []) {
      if (!ALLOWED_DOMAINS.has(domain.toLowerCase())) {
        problems.push(`${where}: names a domain (${domain})`)
      }
    }
  }

  const homelab = uses.sections[0]
  if (!homelab || !/^homelab/i.test(homelab.title)) {
    problems.push(`the first section must be titled "Homelab" (the hero reads it)`)
  } else {
    if (homelab.items.length !== HOMELAB_ITEMS) {
      problems.push(`Homelab has ${homelab.items.length} items; the hero shows ${HOMELAB_ITEMS}`)
    }
    for (const item of homelab.items) {
      if ((item.description?.length ?? 0) > HOMELAB_DESCRIPTION_MAX) {
        problems.push(
          `Homelab "${item.name}": description is ${item.description!.length} characters (max ${HOMELAB_DESCRIPTION_MAX})`,
        )
      }
    }
  }

  const iconChecks: { item: string; icon: string }[] = []
  for (const key of duplicateKeys(uses.sections.map((s) => s._key))) {
    problems.push(`duplicate section _key "${key}"`)
  }
  uses.sections.forEach((section, index) => {
    // The first section feeds the hero, whatever its key: treat it as homelab too.
    const infra = index === 0 || INFRA_SECTIONS.has(section._key)
    if (section.items.length === 0) problems.push(`section "${section.title}" has no items`)
    for (const key of duplicateKeys(section.items.map((i) => i._key))) {
      problems.push(`duplicate item _key "${key}" in "${section.title}"`)
    }
    for (const item of section.items) {
      if (!item.name.trim()) problems.push(`an item in "${section.title}" has no name`)
      if (infra && item.url) {
        problems.push(`"${item.name}" links out; homelab items must not carry URLs`)
      }
      if (item.icon) iconChecks.push({ item: item.name, icon: item.icon })
    }
  })
  for (const { item, icon } of iconChecks) {
    const [prefix, name] = icon.split(":")
    if (!ICON_NAME.test(icon) || !(await renderIconSvg(prefix, name))) {
      problems.push(`"${item}": icon ${icon} isn't in a bundled set`)
    }
  }

  if (now.body.length === 0) problems.push("now.body is empty")
  for (const key of duplicateKeys(now.body.map((b) => b._key))) {
    problems.push(`duplicate now block _key "${key}"`)
  }

  return problems
}
