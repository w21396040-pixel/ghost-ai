import { tasks } from "@trigger.dev/sdk"

import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import type { designAgent } from "@/trigger/design-agent"

export async function POST(request: Request) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : ""
  const roomId = typeof body?.roomId === "string" ? body.roomId : ""
  const projectId = typeof body?.projectId === "string" ? body.projectId : ""
  if (!prompt || !roomId || !projectId) {
    return Response.json(
      { error: "prompt, roomId, and projectId are required" },
      { status: 400 }
    )
  }

  const project = await checkProjectAccess(projectId, identity)
  if (!project) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const handle = await tasks.trigger<typeof designAgent>("design-agent", { prompt, roomId })

  await prisma.taskRun.create({
    data: { runId: handle.id, projectId, userId: identity.userId },
  })

  return Response.json({ runId: handle.id }, { status: 201 })
}
