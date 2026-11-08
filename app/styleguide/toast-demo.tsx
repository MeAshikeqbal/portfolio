"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast.success("Message sent", { description: "I'll reply soon." })}
      >
        Success toast
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast.error("Couldn't send", { description: "Try again in a moment." })}
      >
        Error toast
      </Button>
    </div>
  )
}
