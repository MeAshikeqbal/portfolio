"use client"

import { useTranslations } from "next-intl"
import { useEffect } from "react"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { StatusPage } from "./status-page"

export function ErrorPanel({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("status")
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusPage
      code={500}
      status="down"
      title={t("errorTitle")}
      description={t("errorDescription")}
      reference={error.digest}
      actions={
        <>
          <Button onClick={reset}>{t("tryAgain")}</Button>
          <Button asChild variant="outline">
            <Link href="/">{t("goHome")}</Link>
          </Button>
        </>
      }
    />
  )
}
