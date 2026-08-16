"use client"

import { UserButton } from "@clerk/nextjs"
import { Layers, PanelLeftClose, PanelLeftOpen, Share2, Sparkles } from "lucide-react"

import { useRoomChrome } from "@/components/editor/room-chrome-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EditorNavbarProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  className?: string
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  className,
}: EditorNavbarProps) {
  const { room, isAiSidebarOpen, toggleAiSidebar, openShareDialog } = useRoomChrome()

  return (
    <header
      className={cn(
        "flex h-12 w-full shrink-0 items-center border-b border-border bg-card px-3",
        className
      )}
    >
      <div className="flex flex-1 items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isSidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
        </Button>
        {room && (
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Layers className="size-3.5 text-muted-foreground" />
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-medium text-foreground">
                {room.title}
              </span>
              <span className="truncate text-[0.7rem] text-muted-foreground">
                Workspace
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-1 items-center justify-center" />
      <div className="flex flex-1 items-center justify-end gap-1.5">
        {room && (
          <>
            <Button variant="outline" size="sm" onClick={openShareDialog}>
              <Share2 />
              Share
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleAiSidebar}
              aria-pressed={isAiSidebarOpen}
              aria-label={isAiSidebarOpen ? "Hide AI Copilot" : "Show AI Copilot"}
              className={cn(
                "rounded-full border border-accent-ai/30 bg-accent-ai/10 text-accent-ai-text hover:bg-accent-ai/20 hover:text-accent-ai-text",
                isAiSidebarOpen && "bg-accent-ai/20"
              )}
            >
              <Sparkles />
            </Button>
          </>
        )}
        <UserButton />
      </div>
    </header>
  )
}
