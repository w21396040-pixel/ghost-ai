"use client"

import type { DragEvent } from "react"
import type { LucideIcon } from "lucide-react"
import { Circle, Cylinder, Diamond, Hexagon, Pill, RectangleHorizontal } from "lucide-react"
import { Panel } from "@xyflow/react"

import {
  NODE_SHAPES,
  NODE_SHAPE_SIZES,
  SHAPE_DRAG_MIME_TYPE,
  type NodeShape,
  type ShapeDragPayload,
} from "@/types/canvas"

const SHAPE_ICONS: Record<NodeShape, LucideIcon> = {
  rectangle: RectangleHorizontal,
  diamond: Diamond,
  circle: Circle,
  pill: Pill,
  cylinder: Cylinder,
  hexagon: Hexagon,
}

const SHAPE_LABELS: Record<NodeShape, string> = {
  rectangle: "Rectangle",
  diamond: "Diamond",
  circle: "Circle",
  pill: "Pill",
  cylinder: "Cylinder",
  hexagon: "Hexagon",
}

function handleDragStart(event: DragEvent<HTMLButtonElement>, shape: NodeShape) {
  const { width, height } = NODE_SHAPE_SIZES[shape]
  const payload: ShapeDragPayload = { shape, width, height }
  event.dataTransfer.setData(SHAPE_DRAG_MIME_TYPE, JSON.stringify(payload))
  event.dataTransfer.effectAllowed = "move"
}

export function ShapePanel() {
  return (
    <Panel position="bottom-center">
      <div className="flex items-center gap-1 rounded-full border border-border bg-popover/95 p-1.5 shadow-lg backdrop-blur-sm">
        {NODE_SHAPES.map((shape) => {
          const Icon = SHAPE_ICONS[shape]
          return (
            <button
              key={shape}
              type="button"
              draggable
              onDragStart={(event) => handleDragStart(event, shape)}
              title={SHAPE_LABELS[shape]}
              aria-label={`Drag to add a ${SHAPE_LABELS[shape].toLowerCase()} node`}
              className="flex size-9 cursor-grab items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing"
            >
              <Icon className="size-4" />
            </button>
          )
        })}
      </div>
    </Panel>
  )
}
