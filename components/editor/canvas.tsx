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
  type DefaultEdgeOptions,
  type EdgeMouseHandler,
} from "@xyflow/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import { useCanRedo, useCanUndo, useRedo, useUndo } from "@liveblocks/react"

import { CanvasControls } from "@/components/editor/canvas-controls"
import { CanvasEdgeActionsProvider, CanvasEdgeRenderer } from "@/components/editor/canvas-edge"
import { CanvasNodeActionsProvider, CanvasNodeRenderer } from "@/components/editor/canvas-node"
import { useRoomChrome } from "@/components/editor/room-chrome-provider"
import { ShapePanel } from "@/components/editor/shape-panel"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
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

function CanvasInner() {
  const reactFlowInstance = useReactFlow<CanvasNode, CanvasEdge>()
  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = reactFlowInstance
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

  const { isStarterTemplatesOpen, closeStarterTemplates } = useRoomChrome()

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

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })

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
            fitView
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

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  )
}
