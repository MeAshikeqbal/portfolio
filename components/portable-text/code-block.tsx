"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Button } from "@/components/ui/button"

/** Highlighted code block with a copy button. (Phase 5 moves highlighting to the server.) */
export function CodeBlock({
  code, // Changed from children to a specific 'code' prop
  language = "plaintext", // Default to plaintext if not specified
  filename,
}: {
  code: string // Explicitly a string
  language?: string
  filename?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy code:", err)
    }
  }

  return (
    <div className="group relative my-6">
      {filename && (
        <div className="rounded-t-lg border border-b-0 bg-surface-2 px-4 py-2 font-mono text-xs text-muted-foreground">
          {filename}
        </div>
      )}
      <div className="relative">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            borderRadius: filename ? "0 0 0.5rem 0.5rem" : "0.5rem",
            fontSize: "0.875rem", // 14px
            padding: "1rem",
            lineHeight: "1.6", // Adjusted for better readability
            fontFamily: "var(--font-mono)",
          }}
          showLineNumbers={true}
          wrapLongLines={true} // Kept as true, can be set to false for horizontal scrolling
          PreTag="div"
        >
          {code ? code.trim() : ""}
        </SyntaxHighlighter>

        <Button
          onClick={handleCopy}
          size="icon" // Changed for consistency if using Lucide icons
          variant="ghost"
          className="absolute top-3 right-3 h-8 w-8 border bg-surface/90 p-1.5 text-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface focus-visible:opacity-100"
          title="Copy code"
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
