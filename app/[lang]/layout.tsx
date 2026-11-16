import type { Metadata, Viewport } from "next"
import { notFound } from "next/navigation"
import { lang } from "next/root-params"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { getTranslations } from "next-intl/server"
import "../globals.css"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Providers } from "@/components/providers"
import { localeInfo, locales } from "@/i18n/locales"
import { routing } from "@/i18n/routing"
import { fontVariables } from "@/lib/fonts"
import { siteConfig } from "@/lib/site"

/** Matches --background in app/globals.css (browser UI tint on mobile). */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0c" },
  ],
}

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }))
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await lang()
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations("site")
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: t("defaultTitle", { name: siteConfig.name }),
      template: `%s | ${siteConfig.name}`,
    },
    description: t("description", { name: siteConfig.name }),
    keywords: ["Ashik Eqbal", "Software Engineer", "Web Development", "Portfolio", "Blog"],
    authors: [{ name: siteConfig.name, url: siteConfig.url }],
    creator: siteConfig.name,
    openGraph: {
      type: "website",
      locale: localeInfo[locale].ogLocale,
      url: siteConfig.url,
      siteName: t("siteName", { name: siteConfig.name }),
      title: t("title", { name: siteConfig.name }),
      description: t("description", { name: siteConfig.name }),
      // Images come from the generated app/**/opengraph-image.tsx routes.
    },
    twitter: {
      card: "summary_large_image",
      title: t("title", { name: siteConfig.name }),
      description: t("description", { name: siteConfig.name }),
      creator: siteConfig.twitterHandle,
    },
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png" }],
    },
  }
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await lang()
  if (!hasLocale(routing.locales, locale)) notFound()
  const t = await getTranslations("site")

  return (
    <html lang={locale} suppressHydrationWarning className={fontVariables}>
      <head>
        {/* In <head> rather than metadata.alternates, which child pages' canonicals would override. */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title={t("rssTitle", { name: siteConfig.name })}
          href="/rss.xml"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider>
          <Providers>
            <div className="grow">{children}</div>
          </Providers>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
