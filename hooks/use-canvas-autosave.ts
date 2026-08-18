"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

export type CanvasSaveStatus = "idle" | "saving" | "saved" | "error"

const AUTOSAVE_DEBOUNCE_MS = 1500

interface UseCanvasAutosaveOptions {
  projectId: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  // Stays false until useCanvasLoad's own one-time load-or-skip check has
  // settled, so autosave can never fire (and overwrite a saved snapshot with
  // an empty room) before that decision is made.
  enabled: boolean
}

export interface UseCanvasAutosaveResult {
  status: CanvasSaveStatus
  // Fires the same PUT the debounced autosave uses, immediately, with the
  // latest nodes/edges — so a manual "Save" trigger and autosave can never
  // disagree about what a save does.
  save: () => void
  // TEMPORARY diagnostic: the actual HTTP status/body (or thrown error
  // message) behind an "error" status, surfaced as a tooltip on the navbar's
  // error pill so it's visible without opening DevTools. Remove once the
  // backspace-delete save-failure bug is diagnosed and fixed.
  errorDetail: string | null
}

// Debounces writes to the canvas API route: watches the same Liveblocks-backed
// nodes/edges <ReactFlow> renders, and AUTOSAVE_DEBOUNCE_MS after the last
// change, PUTs the current snapshot.
export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  enabled,
}: UseCanvasAutosaveOptions): UseCanvasAutosaveResult {
  const [status, setStatus] = useState<CanvasSaveStatus>("idle")
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const isFirstRunRef = useRef(true)

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])
  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  const save = useCallback(() => {
    setStatus("saving")
    setErrorDetail(null)
    fetch(`/api/projects/${projectId}/canvas`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes: nodesRef.current, edges: edgesRef.current }),
    })
      .then(async (response) => {
        if (response.ok) {
          setStatus("saved")
          return
        }
        const body = await response.text().catch(() => "")
        setErrorDetail(`${response.status} ${response.statusText}${body ? `: ${body}` : ""}`)
        setStatus("error")
      })
      .catch((error: unknown) => {
        setErrorDetail(error instanceof Error ? error.message : String(error))
        setStatus("error")
      })
  }, [projectId])

  useEffect(() => {
    if (!enabled) return

    // Skip the run that fires the instant autosave becomes enabled — nodes
    // and edges at that point are either the just-loaded saved snapshot or
    // the room's existing (already-persisted) content, not a new change.
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false
      return
    }

    const timeoutId = setTimeout(save, AUTOSAVE_DEBOUNCE_MS)

    return () => clearTimeout(timeoutId)
  }, [nodes, edges, enabled, save])

  return { status, save, errorDetail }
}
