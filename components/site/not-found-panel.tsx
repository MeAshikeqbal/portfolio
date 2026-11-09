import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StatusPage } from "./status-page"

export function NotFoundPanel() {
  return (
    <StatusPage
      code={404}
      status="warn"
      title="Nothing is running here"
      description="The page you're looking for doesn't exist or has moved."
      actions={
        <>
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/post">Browse writing</Link>
          </Button>
        </>
      }
    />
  )
}
