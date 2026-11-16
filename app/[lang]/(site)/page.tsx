import type { Metadata } from "next"
import { ContactSection } from "@/components/home/contact-section"
import { Hero } from "@/components/home/hero"
import { InventorySection } from "@/components/home/inventory-section"
import { ServicesSection } from "@/components/home/services-section"
import { UptimeSection } from "@/components/home/uptime-section"
import { WritingSection } from "@/components/home/writing-section"
import { JsonLd } from "@/components/seo/json-ld"
import { currentLocale } from "@/i18n/metadata"
import { localizedPath } from "@/i18n/locales"
import { languageAlternates } from "@/lib/metadata"
import { jsonLdGraph, personSchema, websiteSchema } from "@/lib/structured-data"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale()
  return {
    alternates: { canonical: localizedPath("/", locale), languages: languageAlternates("/") },
  }
}

export default async function Home() {
  const locale = await currentLocale()
  return (
    <main>
      <JsonLd data={jsonLdGraph(personSchema(), websiteSchema(locale))} />
      <Hero />
      <WritingSection />
      <ServicesSection />
      <UptimeSection />
      <InventorySection />
      <ContactSection />
    </main>
  )
}
