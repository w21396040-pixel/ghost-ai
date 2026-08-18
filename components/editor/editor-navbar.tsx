"use client"

import { useEffect, useRef, useState } from "react"
import { UserButton } from "@clerk/nextjs"
import {
  AlertCircle,
  Check,
  Layers,
  LayoutTemplate,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

import { useRoomChrome } from "@/components/editor/room-chrome-provider"
import { Button } from "@/components/ui/button"
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave"
import { cn } from "@/lib/utils"

// How long the button lingers on "Saved"/"Error" before reverting to "Save".
const SAVE_LABEL_RESET_MS = 2000

function SaveButton({
  status,
  onSave,
  errorDetail,
}: {
  status: CanvasSaveStatus
  onSave: () => void
  errorDetail: string | null
}) {
  const [label, setLabel] = useState("Save")
  // Tracks the status this render's `label` was computed for, so a status
  // change can be caught — and label updated — synchronously during render
  // instead of a render later via useEffect. useEffect callbacks fire after
  // the browser has already painted the current (stale) label, which is
  // what let "Saving..." visibly linger a full frame past the point
  // SaveStatusIndicator (computed inline, no lag) had already moved on to
  // "Save failed" for the same saveStatus value.
  const [renderedStatus, setRenderedStatus] = useState(status)
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (status !== renderedStatus) {
    setRenderedStatus(status)
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = null
    }
    if (status === "saving") setLabel("Saving...")
    else if (status === "saved") setLabel("Saved")
    else if (status === "error") setLabel("Error")
  }

  // The delayed revert-to-"Save" genuinely needs a timer, so it stays in an
  // effect — only the immediate label above was moved out of one.
  useEffect(() => {
    if (status !== "saved" && status !== "error") return

    const timeoutId = setTimeout(() => setLabel("Save"), SAVE_LABEL_RESET_MS)
    resetTimeoutRef.current = timeoutId
    return () => clearTimeout(timeoutId)
  }, [status])

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onSave}
      disabled={status === "saving"}
      // TEMPORARY diagnostic: hover the failed save button to see the real
      // HTTP status/body behind it — see errorDetail in use-canvas-autosave.ts.
      title={status === "error" && errorDetail ? errorDetail : undefined}
    >
      {label}
    </Button>
  )
}

const SAVE_STATUS_CONTENT: Record<
  CanvasSaveStatus,
  { label: string; icon: LucideIcon } | null
> = {
  idle: null,
  saving: { label: "Saving…", icon: Loader2 },
  saved: { label: "Saved", icon: Check },
  error: { label: "Save failed", icon: AlertCircle },
}

function SaveStatusIndicator({
  status,
  errorDetail,
}: {
  status: CanvasSaveStatus
  errorDetail: string | null
}) {
  const content = SAVE_STATUS_CONTENT[status]
  if (!content) return null

  const { label, icon: Icon } = content
  return (
    // TEMPORARY diagnostic: the title lives on this wrapping span, not the
    // Button — the Button is `disabled`, and Tailwind's `disabled:pointer-events-none`
    // blocks hover (and therefore the native title tooltip) entirely on a
    // disabled element. See errorDetail in use-canvas-autosave.ts.
    <span title={status === "error" && errorDetail ? errorDetail : undefined}>
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={cn(
          "gap-1.5 text-muted-foreground disabled:opacity-100",
          status === "error" && "text-destructive"
        )}
        aria-live="polite"
      >
        <Icon className={cn("size-3.5", status === "saving" && "animate-spin")} />
        {label}
      </Button>
    </span>
  )
}

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
  const {
    room,
    isAiSidebarOpen,
    toggleAiSidebar,
    openShareDialog,
    openStarterTemplates,
    saveStatus,
    triggerSave,
    saveErrorDetail,
  } = useRoomChrome()

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
            <SaveButton status={saveStatus} onSave={triggerSave} errorDetail={saveErrorDetail} />
            <SaveStatusIndicator status={saveStatus} errorDetail={saveErrorDetail} />
            <Button variant="ghost" size="sm" onClick={openStarterTemplates}>
              <LayoutTemplate />
              Templates
            </Button>
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
        {/* Workspace context (a room is open) shows its own UserButton via
            PresenceAvatars on the canvas — this shared navbar only shows one
            on the editor home, where nothing else renders it. */}
        {!room && <UserButton />}
      </div>
    </header>
  )
}
