"use client"

import type { NodeProps } from "@xyflow/react"

import { ShapeGeometry } from "@/components/editor/canvas-shape"
import { DEFAULT_NODE_COLOR, NODE_COLORS, NODE_SHAPE_SIZES, type CanvasNode } from "@/types/canvas"

function textColorFor(fill: string) {
  return NODE_COLORS.find((color) => color.fill === fill)?.text ?? DEFAULT_NODE_COLOR.text
}

export function CanvasNodeRenderer({ data, selected, width, height }: NodeProps<CanvasNode>) {
  const size = NODE_SHAPE_SIZES[data.shape]
  const w = width ?? size.width
  const h = height ?? size.height
  const fill = data.color
  const stroke = selected ? textColorFor(fill) : "var(--border)"

  return (
    <div className="relative flex size-full items-center justify-center text-center text-sm">
      <svg
        className="absolute inset-0 size-full overflow-visible"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <ShapeGeometry shape={data.shape} x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} />
      </svg>
      <span className="relative px-3" style={{ color: textColorFor(fill) }}>
        {data.label}
      </span>
    </div>
  )
}
