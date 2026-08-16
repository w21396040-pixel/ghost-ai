"use client"

import { useRef } from "react"
import type { DragEvent } from "react"
import type { LucideIcon } from "lucide-react"
import { Circle, Cylinder, Diamond, Hexagon, Pill, RectangleHorizontal } from "lucide-react"
import { Panel } from "@xyflow/react"

import { ShapeGeometry } from "@/components/editor/canvas-shape"
import {
  DEFAULT_NODE_COLOR,
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

export function ShapePanel() {
  // Native HTML5 drag images: the browser renders whatever DOM element we
  // hand it as a cursor-following ghost for the duration of the drag, and
  // tears it down itself on drop/cancel — no manual position tracking or
  // teardown needed. Each shape gets one pre-rendered, off-screen preview
  // element (real size/geometry, same as what a drop will create) that
  // `setDragImage` points at.
  const previewRefs = useRef<Partial<Record<NodeShape, SVGSVGElement | null>>>({})

  function handleDragStart(event: DragEvent<HTMLButtonElement>, shape: NodeShape) {
    const { width, height } = NODE_SHAPE_SIZES[shape]
    const payload: ShapeDragPayload = { shape, width, height }
    event.dataTransfer.setData(SHAPE_DRAG_MIME_TYPE, JSON.stringify(payload))
    event.dataTransfer.effectAllowed = "move"

    const preview = previewRefs.current[shape]
    if (preview) {
      event.dataTransfer.setDragImage(preview, width / 2, height / 2)
    }
  }

  return (
    <>
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
      <div aria-hidden className="pointer-events-none" style={{ position: "fixed", top: -9999, left: -9999 }}>
        {NODE_SHAPES.map((shape) => {
          const { width, height } = NODE_SHAPE_SIZES[shape]
          return (
            <svg
              key={shape}
              ref={(el) => {
                previewRefs.current[shape] = el
              }}
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
            >
              <ShapeGeometry
                shape={shape}
                x={0}
                y={0}
                width={width}
                height={height}
                fill={DEFAULT_NODE_COLOR.fill}
                stroke={DEFAULT_NODE_COLOR.text}
              />
            </svg>
          )
        })}
      </div>
    </>
  )
}
