import "../globals.css"
import { fontVariables } from "@/lib/fonts"

/** The Studio's own root layout: no site chrome, analytics or locale routing. */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body>{children}</body>
    </html>
  )
}
