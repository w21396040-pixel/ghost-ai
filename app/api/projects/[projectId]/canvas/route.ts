import { loadCanvasSnapshot, saveCanvasSnapshot } from "@/lib/canvas-storage"
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import type { CanvasEdge, CanvasNode } from "@/types/canvas"

type RouteContext = { params: Promise<{ projectId: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const project = await checkProjectAccess(projectId, identity)
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  if (!project.canvasJsonPath) {
    return Response.json({ nodes: [], edges: [] })
  }

  const snapshot = await loadCanvasSnapshot(project.canvasJsonPath)
  return Response.json(snapshot ?? { nodes: [], edges: [] })
}

export async function PUT(request: Request, { params }: RouteContext) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const project = await checkProjectAccess(projectId, identity)
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const nodes: CanvasNode[] | null = Array.isArray(body?.nodes) ? body.nodes : null
  const edges: CanvasEdge[] | null = Array.isArray(body?.edges) ? body.edges : null
  if (!nodes || !edges) {
    return Response.json({ error: "nodes and edges are required" }, { status: 400 })
  }

  const blobUrl = await saveCanvasSnapshot(projectId, { nodes, edges })

  await prisma.project.update({
    where: { id: projectId },
    data: { canvasJsonPath: blobUrl },
  })

  return Response.json({ canvasJsonPath: blobUrl })
}
