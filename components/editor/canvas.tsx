"use client"

import { useCallback, useMemo } from "react"
import type { DragEvent } from "react"
import {
  Background,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type MiniMapNodeProps,
} from "@xyflow/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"

import { CanvasNodeRenderer } from "@/components/editor/canvas-node"
import { ShapeGeometry } from "@/components/editor/canvas-shape"
import { ShapePanel } from "@/components/editor/shape-panel"
import {
  DEFAULT_NODE_COLOR,
  SHAPE_DRAG_MIME_TYPE,
  type CanvasEdge,
  type CanvasNode,
  type NodeShape,
  type ShapeDragPayload,
} from "@/types/canvas"

const nodeTypes = { canvasNode: CanvasNodeRenderer }

let nodeIdCounter = 0

function createNodeId(shape: NodeShape) {
  nodeIdCounter += 1
  return `${shape}-${Date.now()}-${nodeIdCounter}`
}

function CanvasInner() {
  const { screenToFlowPosition } = useReactFlow()
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })

  const shapeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node.data.shape])),
    [nodes]
  )

  const MiniMapShapeNode = useMemo(() => {
    return function MiniMapShapeNode({
      id,
      x,
      y,
      width,
      height,
      color,
      strokeColor,
      strokeWidth,
      className,
      onClick,
    }: MiniMapNodeProps) {
      return (
        <g
          className={className}
          onClick={onClick ? (event) => onClick(event, id) : undefined}
        >
          <ShapeGeometry
            shape={shapeById.get(id) ?? "rectangle"}
            x={x}
            y={y}
            width={width}
            height={height}
            fill={color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        </g>
      )
    }
  }, [shapeById])

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
    <div className="size-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        connectionMode={ConnectionMode.Loose}
        colorMode="dark"
        fitView
      >
        <MiniMap
          position="bottom-left"
          className="rounded-xl border border-border"
          bgColor="var(--popover)"
          maskColor="color-mix(in srgb, var(--background) 70%, transparent)"
          nodeColor="var(--muted-foreground)"
          nodeStrokeColor="var(--border)"
          nodeComponent={MiniMapShapeNode}
        />
        <Background bgColor="var(--background)" color="var(--border)" />
        <ShapePanel />
      </ReactFlow>
    </div>
  )
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  )
}
