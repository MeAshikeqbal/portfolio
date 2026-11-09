import type { Metadata } from "next"
import { ContactSection } from "@/components/home/contact-section"
import { Hero } from "@/components/home/hero"
import { InventorySection } from "@/components/home/inventory-section"
import { ServicesSection } from "@/components/home/services-section"
import { UptimeSection } from "@/components/home/uptime-section"
import { WritingSection } from "@/components/home/writing-section"
import { JsonLd } from "@/components/seo/json-ld"
import { jsonLdGraph, personSchema, websiteSchema } from "@/lib/structured-data"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export default function Home() {
  return (
    <main>
      <JsonLd data={jsonLdGraph(personSchema(), websiteSchema())} />
      <Hero />
      <WritingSection />
      <ServicesSection />
      <UptimeSection />
      <InventorySection />
      <ContactSection />
    </main>
  )
}
