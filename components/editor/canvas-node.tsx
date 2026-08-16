"use client"

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from "react"
import { Handle, NodeResizer, NodeToolbar, Position, type NodeProps } from "@xyflow/react"
import { Check } from "lucide-react"

import { ShapeGeometry } from "@/components/editor/canvas-shape"
import {
  DEFAULT_NODE_COLOR,
  MIN_NODE_HEIGHT,
  MIN_NODE_WIDTH,
  NODE_COLORS,
  NODE_SHAPE_SIZES,
  type CanvasNode,
  type NodeShape,
} from "@/types/canvas"

function textColorFor(fill: string) {
  return NODE_COLORS.find((color) => color.fill === fill)?.text ?? DEFAULT_NODE_COLOR.text
}

const NODE_LABEL_PLACEHOLDER = "Label"

// A textarea's text always starts at the top of its own box — centering the
// box (via the flex/translate rules below) only centers vertically if the
// box itself is no taller than its content, so height is kept in sync with
// content here instead of stretching the textarea to fill the node.
function autoResizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = "auto"
  el.style.height = `${el.scrollHeight}px`
}

// Lets CanvasNodeRenderer push label edits through the same onNodesChange
// path canvas.tsx already uses for everything else (drop, connect, resize),
// instead of @xyflow/react's uncontrolled `updateNodeData` — this flow is
// fully controlled from Liveblocks storage, so writing through the store
// directly would be silently overwritten on the next storage sync.
interface CanvasNodeActions {
  onLabelChange: (id: string, label: string) => void
  onColorChange: (id: string, fill: string) => void
}

const CanvasNodeActionsContext = createContext<CanvasNodeActions>({
  onLabelChange: () => {},
  onColorChange: () => {},
})

export function CanvasNodeActionsProvider({
  value,
  children,
}: {
  value: CanvasNodeActions
  children: ReactNode
}) {
  return <CanvasNodeActionsContext.Provider value={value}>{children}</CanvasNodeActionsContext.Provider>
}

// One handle per side, doubling as both connection start and end point —
// `ConnectionMode.Loose` (set on <ReactFlow> in canvas.tsx) allows any
// handle to connect to any other handle regardless of declared type, so a
// single `type="source"` handle per side is enough for any-side-to-any-side
// connections, matching ui-context.md's "appear at all four sides" spec.
const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

const handleStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#fff",
  border: "1.5px solid var(--background)",
}

// Square handles (vs. the round connection handles above) so the two
// affordances stay visually distinct; same subtle white-on-dark recipe.
const resizeHandleStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 2,
  background: "#fff",
  border: "1.5px solid var(--background)",
}

const resizeLineStyle: CSSProperties = {
  borderColor: "var(--border)",
}

// One swatch per NODE_COLORS entry. The hover glow's color varies per
// swatch (tied to that pair's own text color), so it's set via a CSS custom
// property rather than a Tailwind hover: class, which can't take a dynamic
// value — kept small/tight (no spread, small blur) per spec.
function ColorSwatch({
  color,
  isActive,
  onSelect,
}: {
  color: (typeof NODE_COLORS)[number]
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Set node color to ${color.text}`}
      aria-pressed={isActive}
      title={color.text}
      className="flex size-6 shrink-0 items-center justify-center rounded-full transition-[transform,box-shadow] hover:scale-110 hover:shadow-[0_0_6px_0_var(--swatch-glow)]"
      style={
        {
          backgroundColor: color.fill,
          borderWidth: isActive ? 2 : 1.5,
          borderStyle: "solid",
          borderColor: isActive ? color.text : "var(--border)",
          "--swatch-glow": color.text,
        } as CSSProperties
      }
    >
      {isActive && <Check className="size-3" style={{ color: color.text }} />}
    </button>
  )
}

function NodeColorToolbar({ nodeId, activeColor, selected }: { nodeId: string; activeColor: string; selected: boolean }) {
  const { onColorChange } = useContext(CanvasNodeActionsContext)

  return (
    <NodeToolbar
      nodeId={nodeId}
      isVisible={selected}
      position={Position.Top}
      offset={12}
      className="nodrag nopan nowheel flex items-center gap-1 rounded-full border border-border bg-popover/95 p-1.5 shadow-lg backdrop-blur-sm"
    >
      {NODE_COLORS.map((color) => (
        <ColorSwatch
          key={color.fill}
          color={color}
          isActive={color.fill === activeColor}
          onSelect={() => onColorChange(nodeId, color.fill)}
        />
      ))}
    </NodeToolbar>
  )
}

// rectangle, pill, and circle are plain boxes — CSS border-radius covers
// them. diamond, hexagon, and cylinder need real geometry, so they fall
// through to the SVG path below.
const CSS_SHAPES = new Set<NodeShape>(["rectangle", "pill", "circle"])

function cssBorderRadius(shape: NodeShape) {
  switch (shape) {
    case "circle":
      return "50%"
    case "pill":
      return "9999px"
    default:
      return "8px"
  }
}

export function CanvasNodeRenderer({ id, data, selected, width, height }: NodeProps<CanvasNode>) {
  const size = NODE_SHAPE_SIZES[data.shape]
  const w = width ?? size.width
  const h = height ?? size.height
  const fill = data.color
  const textColor = textColorFor(fill)
  const stroke = selected ? textColor : "var(--border)"

  const { onLabelChange } = useContext(CanvasNodeActionsContext)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = textareaRef.current
    if (isEditing && el) {
      autoResizeTextarea(el)
      el.focus()
      el.select()
    }
  }, [isEditing])

  const startEditing = () => {
    if (isEditing) return
    setDraft(data.label)
    setIsEditing(true)
  }

  return (
    <div className="group relative flex size-full items-center justify-center text-center text-sm">
      <NodeColorToolbar nodeId={id} activeColor={fill} selected={!!selected} />
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_NODE_WIDTH}
        minHeight={MIN_NODE_HEIGHT}
        handleStyle={resizeHandleStyle}
        lineStyle={resizeLineStyle}
      />
      {HANDLE_POSITIONS.map((position) => (
        <Handle
          key={position}
          type="source"
          position={position}
          id={position}
          style={handleStyle}
          className="opacity-0 transition-opacity group-hover:opacity-100"
        />
      ))}
      {CSS_SHAPES.has(data.shape) ? (
        <div
          className="absolute inset-0 size-full transition-colors"
          style={{
            backgroundColor: fill,
            borderRadius: cssBorderRadius(data.shape),
            borderWidth: 1.5,
            borderStyle: "solid",
            borderColor: stroke,
          }}
        />
      ) : (
        <svg
          className="absolute inset-0 size-full overflow-visible"
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <ShapeGeometry shape={data.shape} x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} />
        </svg>
      )}
      <div className="relative flex size-full items-center justify-center px-3" onDoubleClick={startEditing}>
        <span
          className="pointer-events-none"
          style={{ color: data.label ? textColor : "var(--muted-foreground)", opacity: isEditing ? 0 : 1 }}
        >
          {data.label || NODE_LABEL_PLACEHOLDER}
        </span>
        {isEditing && (
          <textarea
            ref={textareaRef}
            rows={1}
            className="nodrag nopan nowheel absolute inset-x-0 top-1/2 max-h-full -translate-y-1/2 resize-none overflow-hidden border-none bg-transparent px-3 text-center text-sm leading-normal outline-none"
            style={{ color: textColor }}
            value={draft}
            placeholder={NODE_LABEL_PLACEHOLDER}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
              const value = event.target.value
              setDraft(value)
              onLabelChange(id, value)
              autoResizeTextarea(event.currentTarget)
            }}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                event.currentTarget.blur()
              }
            }}
          />
        )}
      </div>
    </div>
  )
}
