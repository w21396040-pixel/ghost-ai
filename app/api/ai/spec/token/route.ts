import { auth } from "@trigger.dev/sdk"

import { getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const runId = typeof body?.runId === "string" ? body.runId : ""
  if (!runId) {
    return Response.json({ error: "runId is required" }, { status: 400 })
  }

  const taskRun = await prisma.taskRun.findUnique({ where: { runId } })
  if (!taskRun || taskRun.userId !== identity.userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const token = await auth.createPublicToken({
    scopes: { read: { runs: [runId] } },
    expirationTime: "1h",
  })

  return Response.json({ token })
}
