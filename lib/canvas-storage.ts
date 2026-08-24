import { get, put } from "@vercel/blob"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

export interface CanvasSnapshot {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

// Matches architecture-context.md's Storage Model: canvas snapshots live at
// this deterministic path so a project always overwrites its own blob
// instead of accumulating one per save.
function canvasBlobPath(projectId: string) {
  return `canvas/${projectId}.json`
}

export async function saveCanvasSnapshot(
  projectId: string,
  snapshot: CanvasSnapshot
): Promise<string> {
  const blob = await put(canvasBlobPath(projectId), JSON.stringify(snapshot), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return blob.url
}

export async function loadCanvasSnapshot(blobUrl: string): Promise<CanvasSnapshot | null> {
  const result = await get(blobUrl, { access: "private" })
  if (!result || result.statusCode !== 200) return null

  const data = (await new Response(result.stream).json()) as Partial<CanvasSnapshot>
  return {
    nodes: Array.isArray(data.nodes) ? data.nodes : [],
    edges: Array.isArray(data.edges) ? data.edges : [],
  }
}
