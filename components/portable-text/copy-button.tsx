"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CopyButtonProps {
  text: string
  /** What gets copied, as an action ("Copy code", "Copy fingerprint"). */
  label?: string
  /** Show the label next to the icon instead of only as the accessible name. */
  showLabel?: boolean
  className?: string
}

export function CopyButton({
  text,
  label = "Copy code",
  showLabel = false,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be unavailable (permissions, insecure context); nothing useful to do.
    }
  }

  const current = copied ? "Copied" : label

  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "sm" : "icon-sm"}
      onClick={copy}
      aria-label={showLabel ? undefined : current}
      title={showLabel ? undefined : current}
      className={cn("text-muted-foreground hover:text-foreground", className)}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {showLabel && <span aria-live="polite">{current}</span>}
    </Button>
  )
}
