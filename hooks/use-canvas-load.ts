"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import type { EdgeChange, NodeChange } from "@xyflow/react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

interface UseCanvasLoadOptions {
  projectId: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void
  onEdgesChange: (changes: EdgeChange<CanvasEdge>[]) => void
}

// Runs once per room mount. If the room already has nodes or edges — from an
// active collaborator or an earlier save this session — loading is skipped
// entirely so a stale blob snapshot can never clobber live collaboration.
// Only a genuinely empty room fetches and applies the saved snapshot.
export function useCanvasLoad({
  projectId,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
}: UseCanvasLoadOptions) {
  const [isReady, setIsReady] = useState(false)
  const hasRunRef = useRef(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (hasRunRef.current) return
    hasRunRef.current = true

    startTransition(async () => {
      if (nodes.length === 0 && edges.length === 0) {
        try {
          const response = await fetch(`/api/projects/${projectId}/canvas`)
          if (response.ok) {
            const data: { nodes: CanvasNode[]; edges: CanvasEdge[] } = await response.json()
            if (data.nodes.length > 0) {
              onNodesChange(data.nodes.map((item) => ({ type: "add", item })))
            }
            if (data.edges.length > 0) {
              onEdgesChange(data.edges.map((item) => ({ type: "add", item })))
            }
          }
        } catch {
          // No reachable saved canvas — leave the room empty.
        }
      }
      setIsReady(true)
    })
  }, [projectId, nodes, edges, onNodesChange, onEdgesChange])

  return isReady
}
