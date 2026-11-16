import "./globals.css"
import type { Metadata } from "next"
import Link from "next/link"
import { fontVariables } from "@/lib/fonts"

export const metadata: Metadata = {
  title: "404 · page not found",
}

/**
 * 404 for URLs no root layout matches: paths the locale proxy skips (anything with a dot, like
 * /foo.php). Every other unmatched URL renders app/[lang]/(site)/[...rest] with the full chrome.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={fontVariables}>
      <body className="flex min-h-screen items-center justify-center bg-background p-4 font-sans text-foreground">
        <main className="max-w-md space-y-3 text-center">
          <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">404</p>
          <h1 className="text-2xl font-semibold">Nothing is running here</h1>
          <p className="text-muted-foreground">
            Nothing lives at this address.{" "}
            <Link href="/" className="text-foreground underline underline-offset-4">
              Go home
            </Link>
          </p>
        </main>
      </body>
    </html>
  )
}
