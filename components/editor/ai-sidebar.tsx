"use client"

import { Bot, X } from "lucide-react"

import { AiArchitectPanel } from "@/components/editor/ai-architect-panel"
import { SpecsPanel } from "@/components/editor/specs-panel"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

const activeTabClasses =
  "data-active:border-transparent data-active:bg-accent-ai/15 data-active:text-accent-ai-text dark:data-active:border-transparent dark:data-active:bg-accent-ai/15 dark:data-active:text-accent-ai-text"

export function AiSidebar({ isOpen, onClose, className }: AiSidebarProps) {
  return (
    <div
      data-open={isOpen}
      aria-hidden={!isOpen}
      className={cn(
        "absolute top-3 right-3 bottom-3 z-40 flex w-96 translate-x-[calc(100%+0.75rem)] flex-col gap-3 rounded-2xl border border-border bg-popover/95 p-4 shadow-lg backdrop-blur-sm transition-transform duration-200 ease-in-out data-[open=false]:pointer-events-none data-[open=true]:translate-x-0",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-ai/10 text-accent-ai-text">
            <Bot className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="font-heading text-sm font-medium text-foreground">
              AI Workspace
            </h2>
            <p className="text-xs text-muted-foreground">Collaborate with Ghost AI</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close AI Workspace"
        >
          <X />
        </Button>
      </div>

      {/* Mounted only while open, rather than always-mounted-and-hidden — so
          every open starts from a fresh ScrollArea/Textarea/Tabs instance
          instead of one that's been sitting inert off-screen accumulating
          renders. Fixes current-issues.md's report of scroll/typing going
          dead after the panel had been open for a while, recoverable only by
          toggling it via the sparkle button. */}
      {isOpen && (
        <Tabs defaultValue="architect" className="flex min-h-0 flex-1 flex-col gap-3">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="architect" className={cn("text-muted-foreground", activeTabClasses)}>
              AI Architect
            </TabsTrigger>
            <TabsTrigger value="specs" className={cn("text-muted-foreground", activeTabClasses)}>
              Specs
            </TabsTrigger>
          </TabsList>
          <TabsContent value="architect" className="flex min-h-0 flex-1 flex-col">
            <AiArchitectPanel />
          </TabsContent>
          <TabsContent value="specs" className="flex min-h-0 flex-1 flex-col">
            <SpecsPanel />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
