"use client"

import Link from "next/link"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { StatusPage } from "./status-page"

export function ErrorPanel({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusPage
      code={500}
      status="down"
      title="Something went wrong"
      description="An unexpected error stopped this page from loading. Trying again usually helps."
      reference={error.digest}
      actions={
        <>
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        </>
      }
    />
  )
}
