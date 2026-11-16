import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { StatusPage } from "./status-page"

export function NotFoundPanel() {
  const t = useTranslations("status")
  return (
    <StatusPage
      code={404}
      status="warn"
      title={t("notFoundTitle")}
      description={t("notFoundDescription")}
      actions={
        <>
          <Button asChild>
            <Link href="/">{t("goHome")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/post">{t("browseWriting")}</Link>
          </Button>
        </>
      }
    />
  )
}
