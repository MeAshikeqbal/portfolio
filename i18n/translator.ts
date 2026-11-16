import type { _Translator, Messages, NamespaceKeys, NestedKeyOf } from "next-intl"

/**
 * A translator scoped to one namespace, for plain functions that build text (lib/lab/snapshot)
 * and are called from client components (useTranslations), server components and route
 * handlers (getTranslations) alike.
 */
export type Translator<Namespace extends NamespaceKeys<Messages, NestedKeyOf<Messages>>> =
  _Translator<Messages, Namespace>

export type HomecaveT = Translator<"homecave">
