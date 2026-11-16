import { Mail, Rss } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { FaGithub } from "react-icons/fa6"
import { Panel } from "@/components/dashboard/panel"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/lib/site"
import { Link } from "@/i18n/navigation"

/**
 * End-of-post sign-off: who wrote it, and the ways to keep reading (RSS first: following the
 * writing is the site's main goal), get in touch, or see the code.
 */
export function AuthorCard({ name }: { name?: string | null }) {
  const t = useTranslations("posts")
  const site = useTranslations("site")
  return (
    <Panel>
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <Image
          src="/me-2026.jpg"
          alt=""
          width={64}
          height={64}
          className="size-14 shrink-0 rounded-full object-cover ring-1 ring-border sm:size-16"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t("writtenBy", { name: name ?? siteConfig.name })}</p>
          <p className="mt-1 max-w-prose text-pretty text-muted-foreground">
            {t("authorBlurb", { tagline: site("tagline") })}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href="/rss.xml">
                <Rss /> {t("followRss")}
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/#contact">
                <Mail /> {t("getInTouch")}
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
              <a href={siteConfig.socials.github} target="_blank" rel="noopener noreferrer">
                <FaGithub /> GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  )
}
