"use client"

import { Download, FileText, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

export function SpecsPanel() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Button
        type="button"
        className="w-full bg-accent-ai text-white hover:bg-accent-ai/90"
      >
        <Sparkles />
        Generate Spec
      </Button>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
        <div className="flex items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-ai/10 text-accent-ai-text">
            <FileText className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">
              System Architecture Spec
            </span>
            <span className="text-xs text-muted-foreground">Generated from canvas</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Defines the core services, data flow, and API contracts described by the nodes and
          edges currently on your canvas.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="w-full"
        >
          <Download />
          Download
        </Button>
      </div>
    </div>
  )
}
