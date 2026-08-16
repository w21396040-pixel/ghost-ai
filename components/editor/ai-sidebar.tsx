"use client"

import { Bot, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function AiSidebar({ isOpen, onClose, className }: AiSidebarProps) {
  return (
    <div
      data-open={isOpen}
      inert={!isOpen}
      className={cn(
        "absolute top-3 right-3 bottom-3 z-40 flex w-72 translate-x-[calc(100%+0.75rem)] flex-col gap-4 rounded-2xl border border-border bg-popover/95 p-4 shadow-lg backdrop-blur-sm transition-transform duration-200 ease-in-out data-[open=true]:translate-x-0",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-sm font-medium text-foreground">
            AI Copilot
          </h2>
          <p className="text-xs text-muted-foreground">Placeholder panel</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close AI Copilot"
        >
          <X />
        </Button>
      </div>

      <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-ai/10 text-accent-ai-text">
          <Bot className="size-4" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            Chat surface pending.
          </p>
          <p className="text-xs text-muted-foreground">
            The toggle is wired. Messaging and generation are intentionally
            out of scope here.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Future hooks
        </span>
        <p className="text-xs text-muted-foreground">
          Prompt composer, run status, and architecture guidance will attach
          to this panel.
        </p>
      </div>
    </div>
  )
}
