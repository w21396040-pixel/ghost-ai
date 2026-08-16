"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react"

import { EDGE_COLOR, type CanvasEdge } from "@/types/canvas"

const EDGE_LABEL_PLACEHOLDER = "Add label"

// Lets CanvasEdgeRenderer read/drive hover, edit, and label-commit state
// that's actually owned by canvas.tsx's CanvasInner — same reasoning as
// CanvasNodeActionsContext in canvas-node.tsx: hover/edit are cross-edge
// (only one edge is ever hovered/edited at a time) and label writes have to
// go through the same Liveblocks-backed onEdgesChange path as everything
// else, not a local/uncontrolled update that the next storage sync would
// silently overwrite.
interface CanvasEdgeActions {
  hoveredEdgeId: string | null
  editingEdgeId: string | null
  onEdgeHover: (id: string | null) => void
  startEditing: (id: string) => void
  onLabelChange: (id: string, label: string) => void
}

const CanvasEdgeActionsContext = createContext<CanvasEdgeActions>({
  hoveredEdgeId: null,
  editingEdgeId: null,
  onEdgeHover: () => {},
  startEditing: () => {},
  onLabelChange: () => {},
})

export function CanvasEdgeActionsProvider({
  value,
  children,
}: {
  value: CanvasEdgeActions
  children: ReactNode
}) {
  return <CanvasEdgeActionsContext.Provider value={value}>{children}</CanvasEdgeActionsContext.Provider>
}

// `field-sizing: content` lets the browser grow the input with its own
// text natively — no scrollWidth/mirror-span measurement, and no
// setState-driven resize effect needed.
const growingInputStyle = { fieldSizing: "content", minWidth: "1.5rem" } as CSSProperties

// A separate component so it mounts fresh every time an edit session
// starts (CanvasEdgeRenderer only renders this while isEditing is true) —
// its own `draft` state then seeds correctly from `initialLabel` on mount,
// with no effect needed to re-sync it when editing (re)starts.
function EdgeLabelInput({
  initialLabel,
  onCommit,
}: {
  initialLabel: string
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState(initialLabel)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  return (
    <input
      ref={inputRef}
      value={draft}
      placeholder={EDGE_LABEL_PLACEHOLDER}
      onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter" || event.key === "Escape") {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
      style={growingInputStyle}
      className="rounded-full border border-border bg-popover px-2.5 py-0.5 text-center text-xs text-foreground shadow-lg outline-none placeholder:text-muted-foreground/50"
    />
  )
}

export function CanvasEdgeRenderer({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data,
}: EdgeProps<CanvasEdge>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const { hoveredEdgeId, editingEdgeId, onEdgeHover, startEditing, onLabelChange } =
    useContext(CanvasEdgeActionsContext)

  const label = data?.label ?? ""
  const isEditing = editingEdgeId === id
  const isBright = !!selected || hoveredEdgeId === id || isEditing

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={24}
        style={{
          stroke: EDGE_COLOR,
          strokeWidth: 1.5,
          strokeLinecap: "round",
          strokeOpacity: isBright ? 1 : 0.55,
          transition: "stroke-opacity 150ms ease",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan nowheel absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: isEditing || label ? "all" : "none",
          }}
          onMouseEnter={() => onEdgeHover(id)}
          onMouseLeave={() => onEdgeHover(null)}
          onDoubleClick={(event) => {
            event.stopPropagation()
            startEditing(id)
          }}
        >
          {isEditing ? (
            <EdgeLabelInput initialLabel={label} onCommit={(value) => onLabelChange(id, value.trim())} />
          ) : label ? (
            <span className="cursor-text rounded-full border border-border bg-popover/90 px-2.5 py-0.5 text-xs text-foreground shadow-sm backdrop-blur-sm">
              {label}
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
