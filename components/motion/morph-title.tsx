import { ViewTransition, type ReactElement } from "react"

/**
 * Marks a post or project title as the same object on every page that shows it, so a
 * navigation between a list and the detail page morphs the title into place (and back).
 * `default="none"` keeps it still during unrelated transitions; `share` must stay with it,
 * or the pair silently stops morphing. Styling: `.morph` in app/globals.css.
 *
 * Use at most once per id on a page: a duplicated name cancels the whole transition.
 */
export function MorphTitle({
  kind,
  id,
  children,
}: {
  kind: "post" | "project"
  id: string | null | undefined
  children: ReactElement
}) {
  if (!id) return children
  return (
    <ViewTransition name={`${kind}-title-${id}`} share="morph" default="none">
      {children}
    </ViewTransition>
  )
}
