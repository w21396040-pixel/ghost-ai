import { tasks } from "@trigger.dev/sdk"
import { z } from "zod"

import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import { canvasEdgeSchema, canvasNodeSchema, type generateSpec } from "@/trigger/generate-spec"
import { chatMessageSchema } from "@/types/tasks"

// Deliberately no `projectId` field — unlike app/api/ai/design/route.ts,
// which accepts a client-supplied projectId alongside roomId. This route's
// own spec calls out "do not trust a client-supplied projectId" explicitly,
// so project identity is derived entirely from `roomId` via
// checkProjectAccess (roomId and projectId are the same string by
// construction, per the 07-wire-editor-home decision).
const requestSchema = z.object({
  roomId: z.string().min(1),
  chatHistory: z.array(chatMessageSchema).default([]),
  nodes: z.array(canvasNodeSchema).default([]),
  edges: z.array(canvasEdgeSchema).default([]),
})

export async function POST(request: Request) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }
  const { roomId, chatHistory, nodes, edges } = parsed.data

  const project = await checkProjectAccess(roomId, identity)
  if (!project) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const handle = await tasks.trigger<typeof generateSpec>("generate-spec", {
    projectId: project.id,
    roomId,
    chatHistory,
    nodes,
    edges,
  })

  await prisma.taskRun.create({
    data: { runId: handle.id, projectId: project.id, userId: identity.userId },
  })

  return Response.json({ runId: handle.id }, { status: 201 })
}
