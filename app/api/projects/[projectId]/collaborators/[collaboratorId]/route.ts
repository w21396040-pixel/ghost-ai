import { auth } from "@clerk/nextjs/server"

import { removeCollaborator } from "@/lib/collaborators"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ projectId: string; collaboratorId: string }> }

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId, collaboratorId } = await params
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }
  if (project.ownerId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { count } = await removeCollaborator(projectId, collaboratorId)
  if (count === 0) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return new Response(null, { status: 204 })
}
