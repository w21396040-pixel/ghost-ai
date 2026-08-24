import { auth } from "@clerk/nextjs/server"

import { Prisma } from "@/app/generated/prisma/client"

import {
  addCollaborator,
  enrichCollaborators,
  findCollaboratorByEmail,
  getOwnerEntry,
  listCollaborators,
} from "@/lib/collaborators"
import { getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import { getAccessibleProject } from "@/lib/projects"

type RouteContext = { params: Promise<{ projectId: string }> }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET(_request: Request, { params }: RouteContext) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const project = await getAccessibleProject(projectId, identity.userId, identity.email)
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const [owner, collaborators] = await Promise.all([
    getOwnerEntry(project.ownerId),
    listCollaborators(projectId).then(enrichCollaborators),
  ])

  return Response.json([owner, ...collaborators])
}

export async function POST(request: Request, { params }: RouteContext) {
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
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  if (!email || !EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "A valid email is required" }, { status: 400 })
  }

  const existing = await findCollaboratorByEmail(projectId, email)
  if (existing) {
    return Response.json({ error: "Already a collaborator" }, { status: 409 })
  }

  let collaborator
  try {
    collaborator = await addCollaborator(projectId, email)
  } catch (error) {
    // Handle unique constraint violation (already a collaborator)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return Response.json({ error: "Already a collaborator" }, { status: 409 })
    }
    throw error
  }
  
  const [enriched] = await enrichCollaborators([collaborator])

  return Response.json(enriched, { status: 201 })
}
