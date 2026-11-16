"use client"

import { usePathname } from "@/i18n/navigation"
import { TranslationNotice } from "./translation-notice"

/** The footer's "machine-translated" line, for whichever page it sits under. */
export function FooterTranslationNotice({ className }: { className?: string }) {
  return <TranslationNotice path={usePathname()} className={className} />
}
