import { auth } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ projectId: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }
  if (project.ownerId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 })
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { name },
  })

  return Response.json(updated)
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }
  if (project.ownerId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.project.delete({ where: { id: projectId } })

  return new Response(null, { status: 204 })
}
