"use client"

import type { LucideIcon } from "lucide-react"
import { Maximize2, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react"

import { cn } from "@/lib/utils"

interface ControlButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
}

function ControlButton({ icon: Icon, label, onClick, disabled }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}

interface CanvasControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function CanvasControls({
  onZoomIn,
  onZoomOut,
  onFitView,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: CanvasControlsProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-popover/95 p-1.5 shadow-lg backdrop-blur-sm">
      <ControlButton icon={ZoomOut} label="Zoom out" onClick={onZoomOut} />
      <ControlButton icon={Maximize2} label="Fit view" onClick={onFitView} />
      <ControlButton icon={ZoomIn} label="Zoom in" onClick={onZoomIn} />
      <div className="mx-0.5 h-5 w-px bg-border" />
      <ControlButton icon={Undo2} label="Undo" onClick={onUndo} disabled={!canUndo} />
      <ControlButton icon={Redo2} label="Redo" onClick={onRedo} disabled={!canRedo} />
    </div>
  )
}
