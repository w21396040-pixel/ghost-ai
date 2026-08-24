"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { DragEvent } from "react"
import {
  Background,
  ConnectionMode,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStoreApi,
  type DefaultEdgeOptions,
  type EdgeMouseHandler,
} from "@xyflow/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import { useCanRedo, useCanUndo, useRedo, useUndo } from "@liveblocks/react"

import { CanvasControls } from "@/components/editor/canvas-controls"
import { CanvasCursors } from "@/components/editor/canvas-cursors"
import { CanvasEdgeActionsProvider, CanvasEdgeRenderer } from "@/components/editor/canvas-edge"
import { CanvasNodeActionsProvider, CanvasNodeRenderer } from "@/components/editor/canvas-node"
import { useRoomChrome } from "@/components/editor/room-chrome-provider"
import { ShapePanel } from "@/components/editor/shape-panel"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import { useCanvasAutosave } from "@/hooks/use-canvas-autosave"
import { useCanvasLoad } from "@/hooks/use-canvas-load"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import {
  DEFAULT_NODE_COLOR,
  EDGE_COLOR,
  SHAPE_DRAG_MIME_TYPE,
  type CanvasEdge,
  type CanvasNode,
  type NodeShape,
  type ShapeDragPayload,
} from "@/types/canvas"

// Matches the keyboard shortcuts' own zoom animation duration
// (hooks/use-keyboard-shortcuts.ts), so click and keyboard zooming feel identical.
const ZOOM_DURATION = 200

const nodeTypes = { canvasNode: CanvasNodeRenderer }
const edgeTypes = { canvasEdge: CanvasEdgeRenderer }

// Applied by xyflow's Handle component to every connection made by dragging
// between two node handles, before it reaches `onConnect` — so new edges
// get the right type/marker without a manual onConnect wrapper.
const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "canvasEdge",
  markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR, width: 16, height: 16 },
  data: { label: "" },
}

let nodeIdCounter = 0

function createNodeId(shape: NodeShape) {
  nodeIdCounter += 1
  return `${shape}-${Date.now()}-${nodeIdCounter}`
}

interface CanvasInnerProps {
  projectId: string
}

function CanvasInner({ projectId }: CanvasInnerProps) {
  const reactFlowInstance = useReactFlow<CanvasNode, CanvasEdge>()
  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = reactFlowInstance
  const reactFlowStoreApi = useStoreApi()

  // xyflow's internal `paneDragging` flag flips true on d3-zoom's own drag
  // 'start' and is only reset on its 'end', which fires from a
  // pointerup/mouseup that d3's own listener has to actually observe. If a
  // real release happens somewhere that listener misses it — a drag that
  // ends past the window edge, over a different app/monitor, an alt-tab
  // mid-drag — 'end' never fires and paneDragging is stuck `true` for the
  // rest of the session. @liveblocks/react-flow's <Cursors> silently skips
  // every future presence broadcast while paneDragging is true (confirmed by
  // reading its source), so a stuck flag here means live cursors just stop
  // working with no error anywhere — this was reproduced and confirmed as
  // the actual cause of current-issues.md's "cursor never shows" report.
  // Any window-level pointerup/mouseup/blur means the mouse button is no
  // longer held, full stop, regardless of which element received it — so
  // force-resetting on it is always correct and never interrupts a
  // genuinely still-active drag.
  useEffect(() => {
    const resetStuckPaneDragging = () => {
      reactFlowStoreApi.setState((state) =>
        state.paneDragging ? { paneDragging: false } : state
      )
    }
    window.addEventListener("pointerup", resetStuckPaneDragging)
    window.addEventListener("mouseup", resetStuckPaneDragging)
    window.addEventListener("blur", resetStuckPaneDragging)
    return () => {
      window.removeEventListener("pointerup", resetStuckPaneDragging)
      window.removeEventListener("mouseup", resetStuckPaneDragging)
      window.removeEventListener("blur", resetStuckPaneDragging)
    }
  }, [reactFlowStoreApi])

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })

  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  const {
    isStarterTemplatesOpen,
    closeStarterTemplates,
    setSaveStatus,
    setTriggerSave,
    setSaveErrorDetail,
  } = useRoomChrome()

  // Loads the saved canvas snapshot into an empty room on mount (skipped if
  // the room already has content), then gates autosave until that one-time
  // decision has settled — so autosave can never fire before the load check
  // has had a chance to run, which would risk overwriting a saved snapshot
  // with a still-empty room.
  const isCanvasLoaded = useCanvasLoad({ projectId, nodes, edges, onNodesChange, onEdgesChange })
  const { status: saveStatus, save: triggerSaveNow, errorDetail: saveErrorDetail } = useCanvasAutosave({
    projectId,
    nodes,
    edges,
    enabled: isCanvasLoaded,
  })

  // Bridges save status and the manual-save trigger up to EditorNavbar's Save
  // button/indicator, which sits outside this Liveblocks room tree — same
  // cross-layout pattern RoomHeaderSync already uses for room
  // title/projectId/isOwner. Reset to "idle"/no-op only on unmount (a
  // separate effect, so the reset doesn't also fire on every intermediate
  // status change) so a stale status or trigger can't leak into the navbar
  // after leaving the room.
  useEffect(() => {
    setSaveStatus(saveStatus)
  }, [saveStatus, setSaveStatus])

  useEffect(() => {
    setTriggerSave(triggerSaveNow)
  }, [triggerSaveNow, setTriggerSave])

  // TEMPORARY diagnostic bridge — see errorDetail in use-canvas-autosave.ts.
  useEffect(() => {
    setSaveErrorDetail(saveErrorDetail)
  }, [saveErrorDetail, setSaveErrorDetail])

  useEffect(() => {
    return () => {
      setSaveStatus("idle")
      setTriggerSave(() => {})
      setSaveErrorDetail(null)
    }
  }, [setSaveStatus, setTriggerSave, setSaveErrorDetail])

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: ZOOM_DURATION })
  }, [zoomIn])

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: ZOOM_DURATION })
  }, [zoomOut])

  const handleFitView = useCallback(() => {
    fitView({ duration: ZOOM_DURATION })
  }, [fitView])

  useKeyboardShortcuts({ reactFlowInstance, onUndo: undo, onRedo: redo })

  // Kept out of handleNodeLabelChange's own deps (via ref, not state) so the
  // callback identity — and therefore the context value below — stays
  // stable across every keystroke instead of recreating on each nodes update.
  const nodesRef = useRef(nodes)
  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  // xyflow's own `fitView` prop only fires the first time nodes go from
  // empty to non-empty. Because the Liveblocks room always mounts with zero
  // nodes until useCanvasLoad's fetch resolves, that first flip coincides
  // with the user's own first drop on a brand new (still-empty) canvas
  // rather than with the load — producing an unwanted auto-zoom on drop.
  // Firing fitView manually, gated on the load finishing rather than on
  // nodes changing, keeps the fit-to-saved-content behavior for existing
  // projects without re-triggering on every later drop.
  const hasFitViewedOnLoadRef = useRef(false)
  useEffect(() => {
    if (!isCanvasLoaded || hasFitViewedOnLoadRef.current) return
    hasFitViewedOnLoadRef.current = true
    if (nodesRef.current.length > 0) {
      requestAnimationFrame(() => fitView())
    }
  }, [isCanvasLoaded, fitView])

  const handleNodeLabelChange = useCallback(
    (id: string, label: string) => {
      const node = nodesRef.current.find((n) => n.id === id)
      if (!node) return
      onNodesChange([{ type: "replace", id, item: { ...node, data: { ...node.data, label } } }])
    },
    [onNodesChange]
  )

  // Only the fill is stored on the node; the paired text color is derived
  // from it (via NODE_COLORS) wherever it's rendered, so updating this one
  // field is enough to update both background and text color at once.
  const handleNodeColorChange = useCallback(
    (id: string, color: string) => {
      const node = nodesRef.current.find((n) => n.id === id)
      if (!node) return
      onNodesChange([{ type: "replace", id, item: { ...node, data: { ...node.data, color } } }])
    },
    [onNodesChange]
  )

  const canvasNodeActions = useMemo(
    () => ({ onLabelChange: handleNodeLabelChange, onColorChange: handleNodeColorChange }),
    [handleNodeLabelChange, handleNodeColorChange]
  )

  // Hover/edit are cross-edge (only one edge is ever hovered or being
  // edited at a time), so both live here rather than as local state inside
  // each CanvasEdgeRenderer instance.
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)

  const edgesRef = useRef(edges)
  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  const handleEdgeMouseEnter = useCallback<EdgeMouseHandler<CanvasEdge>>((_event, edge) => {
    setHoveredEdgeId(edge.id)
  }, [])

  const handleEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeId(null)
  }, [])

  const handleEdgeDoubleClick = useCallback<EdgeMouseHandler<CanvasEdge>>((_event, edge) => {
    setEditingEdgeId(edge.id)
  }, [])

  const startEditingEdge = useCallback((id: string) => {
    setEditingEdgeId(id)
  }, [])

  // Same full-object "replace" path handleNodeLabelChange uses above —
  // Liveblocks' LiveObject.reconcile() drops any key present on the stored
  // object but missing from the replacement, so this always spreads the
  // current edge rather than sending a partial {id, data}.
  const handleEdgeLabelChange = useCallback(
    (id: string, label: string) => {
      const edge = edgesRef.current.find((e) => e.id === id)
      if (edge) {
        onEdgesChange([{ type: "replace", id, item: { ...edge, data: { ...edge.data, label } } }])
      }
      setEditingEdgeId((current) => (current === id ? null : current))
    },
    [onEdgesChange]
  )

  const canvasEdgeActions = useMemo(
    () => ({
      hoveredEdgeId,
      editingEdgeId,
      onEdgeHover: setHoveredEdgeId,
      startEditing: startEditingEdge,
      onLabelChange: handleEdgeLabelChange,
    }),
    [hoveredEdgeId, editingEdgeId, startEditingEdge, handleEdgeLabelChange]
  )

  // onDelete is a separate mutation from onNodesChange/onEdgesChange (it
  // deletes straight from the Liveblocks storage maps rather than going
  // through a "remove" NodeChange/EdgeChange, which @liveblocks/react-flow's
  // applyNodeChanges/applyEdgeChanges are no-ops for) — same function
  // <ReactFlow onDelete> already uses for selection-based delete below, just
  // called directly here with every current node/edge instead of a selection.
  const handleImportTemplate = useCallback(
    (template: CanvasTemplate) => {
      onDelete({ nodes: nodesRef.current, edges: edgesRef.current })
      onNodesChange(template.nodes.map((item) => ({ type: "add", item })))
      onEdgesChange(template.edges.map((item) => ({ type: "add", item })))
      requestAnimationFrame(() => fitView({ duration: ZOOM_DURATION }))
    },
    [onDelete, onNodesChange, onEdgesChange, fitView]
  )

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const raw = event.dataTransfer.getData(SHAPE_DRAG_MIME_TYPE)
      if (!raw) {
        return
      }

      let payload: ShapeDragPayload
      try {
        payload = JSON.parse(raw) as ShapeDragPayload
      } catch {
        return
      }

      // ShapePanel's setDragImage(preview, width / 2, height / 2) pins the
      // drag ghost so the cursor always sits at its center, regardless of
      // where inside the shape button the drag actually started — so
      // event.clientX/Y is already the intended center of the dropped node.
      // screenToFlowPosition accounts for the pane's bounding rect and the
      // current pan/zoom, but returns the node's top-left position, so the
      // half-size offset (in flow units, matching payload.width/height) has
      // to be subtracted here to land the node's center on the cursor.
      const center = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const position = {
        x: center.x - payload.width / 2,
        y: center.y - payload.height / 2,
      }

      const newNode: CanvasNode = {
        id: createNodeId(payload.shape),
        type: "canvasNode",
        position,
        width: payload.width,
        height: payload.height,
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR.fill,
          shape: payload.shape,
        },
      }

      onNodesChange([{ type: "add", item: newNode }])
    },
    [screenToFlowPosition, onNodesChange]
  )

  return (
    <CanvasNodeActionsProvider value={canvasNodeActions}>
      <CanvasEdgeActionsProvider value={canvasEdgeActions}>
        <div className="size-full" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDelete={onDelete}
            onEdgeMouseEnter={handleEdgeMouseEnter}
            onEdgeMouseLeave={handleEdgeMouseLeave}
            onEdgeDoubleClick={handleEdgeDoubleClick}
            connectionMode={ConnectionMode.Loose}
            colorMode="dark"
          >
            <Panel position="bottom-left">
              <CanvasControls
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFitView={handleFitView}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
              />
            </Panel>
            <Background bgColor="var(--background)" color="var(--border)" />
            <ShapePanel />
            <CanvasCursors />
          </ReactFlow>
        </div>
        <StarterTemplatesModal
          isOpen={isStarterTemplatesOpen}
          onClose={closeStarterTemplates}
          onImport={handleImportTemplate}
        />
      </CanvasEdgeActionsProvider>
    </CanvasNodeActionsProvider>
  )
}

interface CanvasProps {
  projectId: string
}

export function Canvas({ projectId }: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner projectId={projectId} />
    </ReactFlowProvider>
  )
}
