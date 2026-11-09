"use client"

import { ErrorPanel } from "@/components/site/error-panel"

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorPanel {...props} />
}
