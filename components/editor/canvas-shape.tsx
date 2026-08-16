"use client"

import type { NodeShape } from "@/types/canvas"

export interface ShapeGeometryProps {
  shape: NodeShape
  x: number
  y: number
  width: number
  height: number
  fill?: string
  stroke?: string
  strokeWidth?: number
}

// Draws the actual outline for a shape at an arbitrary origin, in SVG user
// units. Used both by the canvas node renderer (origin 0,0, local viewBox)
// and the minimap's custom node renderer (absolute flow-space origin,
// shared viewBox), so shapes look the same everywhere they appear.
export function ShapeGeometry({
  shape,
  x,
  y,
  width,
  height,
  fill,
  stroke,
  strokeWidth = 1.5,
}: ShapeGeometryProps) {
  const inset = strokeWidth / 2
  const common = { fill, stroke, strokeWidth }

  switch (shape) {
    case "circle": {
      const rx = width / 2 - inset
      const ry = height / 2 - inset
      return <ellipse cx={x + width / 2} cy={y + height / 2} rx={rx} ry={ry} {...common} />
    }
    case "diamond": {
      const points = [
        [x + width / 2, y + inset],
        [x + width - inset, y + height / 2],
        [x + width / 2, y + height - inset],
        [x + inset, y + height / 2],
      ]
        .map(([px, py]) => `${px},${py}`)
        .join(" ")
      return <polygon points={points} strokeLinejoin="round" {...common} />
    }
    case "pill": {
      const radius = height / 2 - inset
      return (
        <rect
          x={x + inset}
          y={y + inset}
          width={width - strokeWidth}
          height={height - strokeWidth}
          rx={radius}
          ry={radius}
          {...common}
        />
      )
    }
    case "hexagon": {
      const notch = Math.min(width / 4, height / 2)
      const points = [
        [x + notch, y + inset],
        [x + width - notch, y + inset],
        [x + width - inset, y + height / 2],
        [x + width - notch, y + height - inset],
        [x + notch, y + height - inset],
        [x + inset, y + height / 2],
      ]
        .map(([px, py]) => `${px},${py}`)
        .join(" ")
      return <polygon points={points} strokeLinejoin="round" {...common} />
    }
    case "cylinder": {
      const capRy = Math.min(height / 5, height / 2 - inset)
      const top = y + inset + capRy
      const bottom = y + height - inset - capRy
      const rx = width / 2 - inset
      const left = x + inset
      const right = x + width - inset
      const d = [
        `M ${left} ${top}`,
        `A ${rx} ${capRy} 0 0 1 ${right} ${top}`,
        `L ${right} ${bottom}`,
        `A ${rx} ${capRy} 0 0 1 ${left} ${bottom}`,
        `Z`,
      ].join(" ")
      const capD = `M ${left} ${top} A ${rx} ${capRy} 0 0 0 ${right} ${top}`
      return (
        <>
          <path d={d} strokeLinejoin="round" {...common} />
          <path d={capD} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        </>
      )
    }
    case "rectangle":
    default: {
      const radius = 8
      return (
        <rect
          x={x + inset}
          y={y + inset}
          width={width - strokeWidth}
          height={height - strokeWidth}
          rx={radius}
          ry={radius}
          {...common}
        />
      )
    }
  }
}
