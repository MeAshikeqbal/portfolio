"use client"

import { MotionConfig } from "motion/react"
import { ThemeProvider } from "next-themes"
import type { ReactNode } from "react"

/** All client-side context for the app, in one place. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {/* Honour the OS "reduce motion" setting for every motion component. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  )
}
