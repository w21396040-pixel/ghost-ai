import { currentUser } from "@clerk/nextjs/server"

import { getCursorColor, getLiveblocksClient } from "@/lib/liveblocks"
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"

export async function POST(request: Request) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const liveblocks = getLiveblocksClient()

  const body = await request.json().catch(() => ({}))
  const roomId = typeof body?.room === "string" ? body.room : ""
  if (!roomId) {
    return Response.json({ error: "room is required" }, { status: 400 })
  }

  const project = await checkProjectAccess(roomId, identity)
  if (!project) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  await liveblocks.getOrCreateRoom(roomId, {
    defaultAccesses: [],
    usersAccesses: { [identity.userId]: ["room:write"] },
  })
  await liveblocks.updateRoom(roomId, {
    usersAccesses: { [identity.userId]: ["room:write"] },
  })

  const user = await currentUser()
  const name = user?.fullName || identity.email || "Anonymous"
  const avatar = user?.imageUrl ?? ""
  const color = getCursorColor(identity.userId)

  const { status, body: responseBody } = await liveblocks.identifyUser(identity.userId, {
    userInfo: { name, avatar, color },
  })

  return new Response(responseBody, { status })
}
