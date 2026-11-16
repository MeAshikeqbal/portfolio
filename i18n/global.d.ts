import type messages from "../messages/en.json"
import type { Locale } from "./locales"

// English is the source of truth: every t("key") is checked against messages/en.json.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale
    Messages: typeof messages
  }
}
