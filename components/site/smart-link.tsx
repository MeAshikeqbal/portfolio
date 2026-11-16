import type { ComponentProps } from "react"
import { Link } from "@/i18n/navigation"

/** Whether an internal href points at a file (/rss.xml, /resume.pdf), which has no locale. */
export function isFileHref(href: string): boolean {
  return /\.[a-z0-9]+$/i.test(href.split(/[?#]/)[0])
}

/**
 * An internal link that stays in the reader's language: pages get the locale prefix (next-intl's
 * Link), files are plain anchors at their one URL.
 */
export function SiteLink({ href, ...props }: ComponentProps<"a"> & { href: string }) {
  if (isFileHref(href)) return <a href={href} {...props} />
  return <Link href={href} {...props} />
}
