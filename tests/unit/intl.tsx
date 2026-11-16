import { createTranslator, NextIntlClientProvider, type Messages } from "next-intl"
import type { ReactNode } from "react"
import messages from "@/messages/en.json"

/** The app's English messages around a tree, as the [lang] layout provides them. */
export function IntlWrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  )
}

/** An English translator for one namespace, for testing lib functions that build text. */
export function englishT<Namespace extends keyof Messages>(namespace: Namespace) {
  return createTranslator({ locale: "en", messages, namespace, timeZone: "UTC" })
}
