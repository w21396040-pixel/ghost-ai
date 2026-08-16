"use client"

import { Download } from "lucide-react"

import { ShapeGeometry } from "@/components/editor/canvas-shape"
import { CANVAS_TEMPLATES, type CanvasTemplate } from "@/components/editor/starter-templates"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DEFAULT_NODE_COLOR, EDGE_COLOR, NODE_COLORS, NODE_SHAPE_SIZES } from "@/types/canvas"

const PREVIEW_PADDING = 16

function textColorFor(fill: string) {
  return NODE_COLORS.find((color) => color.fill === fill)?.text ?? DEFAULT_NODE_COLOR.text
}

// A lightweight, static diagram preview — plain SVG only, no React Flow
// instance — fit to a fixed viewport by computing bounds directly from the
// template's own node positions/sizes rather than measuring anything.
function TemplatePreview({ template }: { template: CanvasTemplate }) {
  const { nodes, edges } = template

  const bounds = nodes.reduce(
    (acc, node) => {
      const size = NODE_SHAPE_SIZES[node.data.shape]
      const width = node.width ?? size.width
      const height = node.height ?? size.height
      return {
        minX: Math.min(acc.minX, node.position.x),
        minY: Math.min(acc.minY, node.position.y),
        maxX: Math.max(acc.maxX, node.position.x + width),
        maxY: Math.max(acc.maxY, node.position.y + height),
      }
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  )

  const viewBox = `${bounds.minX - PREVIEW_PADDING} ${bounds.minY - PREVIEW_PADDING} ${
    bounds.maxX - bounds.minX + PREVIEW_PADDING * 2
  } ${bounds.maxY - bounds.minY + PREVIEW_PADDING * 2}`

  const nodesById = new Map(nodes.map((node) => [node.id, node]))

  function centerOf(nodeId: string) {
    const node = nodesById.get(nodeId)
    if (!node) return null
    const size = NODE_SHAPE_SIZES[node.data.shape]
    const width = node.width ?? size.width
    const height = node.height ?? size.height
    return { x: node.position.x + width / 2, y: node.position.y + height / 2 }
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {edges.map((edge) => {
        const from = centerOf(edge.source)
        const to = centerOf(edge.target)
        if (!from || !to) return null
        return (
          <line
            key={edge.id}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={EDGE_COLOR}
            strokeWidth={1.5}
            strokeOpacity={0.5}
          />
        )
      })}
      {nodes.map((node) => {
        const size = NODE_SHAPE_SIZES[node.data.shape]
        const width = node.width ?? size.width
        const height = node.height ?? size.height
        return (
          <ShapeGeometry
            key={node.id}
            shape={node.data.shape}
            x={node.position.x}
            y={node.position.y}
            width={width}
            height={height}
            fill={node.data.color}
            stroke={textColorFor(node.data.color)}
            strokeWidth={1.5}
          />
        )
      })}
    </svg>
  )
}

interface StarterTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (template: CanvasTemplate) => void
}

export function StarterTemplatesModal({ isOpen, onClose, onImport }: StarterTemplatesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-5 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Template</DialogTitle>
          <DialogDescription>
            Choose a starter template to pre-populate your canvas. Any existing nodes will be
            replaced — use{" "}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
              ⌘Z
            </kbd>{" "}
            to undo.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="grid grid-cols-1 gap-4 pr-3 sm:grid-cols-3">
            {CANVAS_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="flex flex-col gap-4 rounded-2xl border border-border p-4"
              >
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
                  <TemplatePreview template={template} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">{template.name}</span>
                  <span className="text-xs text-muted-foreground">{template.description}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-auto"
                  onClick={() => {
                    onImport(template)
                    onClose()
                  }}
                >
                  <Download />
                  Import
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
