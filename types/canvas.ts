import type { Edge, Node } from "@xyflow/react"

// Matches `ui-context.md`'s Canvas > Node Shapes list.
export const NODE_SHAPES = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
] as const

export type NodeShape = (typeof NODE_SHAPES)[number]

// Matches `ui-context.md`'s Canvas > Node Color Palette table (fill + text pairs).
export const NODE_COLORS = [
  { fill: "#1F1F1F", text: "#EDEDED" },
  { fill: "#10233D", text: "#52A8FF" },
  { fill: "#2E1938", text: "#BF7AF0" },
  { fill: "#331B00", text: "#FF990A" },
  { fill: "#3C1618", text: "#FF6166" },
  { fill: "#3A1726", text: "#F75F8F" },
  { fill: "#0F2E18", text: "#62C073" },
  { fill: "#062822", text: "#0AC7B4" },
] as const

export const DEFAULT_NODE_COLOR = NODE_COLORS[0]

// Default drag-and-drop size per shape (matches the shape panel's spec:
// rectangles wider than tall, circles square, diamonds sized up so a
// centered label has room inside the diamond's inscribed area).
export const NODE_SHAPE_SIZES: Record<NodeShape, { width: number; height: number }> = {
  rectangle: { width: 160, height: 80 },
  diamond: { width: 180, height: 140 },
  circle: { width: 100, height: 100 },
  pill: { width: 160, height: 56 },
  cylinder: { width: 120, height: 120 },
  hexagon: { width: 160, height: 100 },
}

// DataTransfer MIME type used by the shape panel's drag payload.
export const SHAPE_DRAG_MIME_TYPE = "application/x-ghost-shape"

export interface ShapeDragPayload {
  shape: NodeShape
  width: number
  height: number
}

export interface CanvasNodeData extends Record<string, unknown> {
  label: string
  color: string
  shape: NodeShape
}

export type CanvasNode = Node<CanvasNodeData, "canvasNode">
export type CanvasEdge = Edge<Record<string, never>, "canvasEdge">
