import { currentUser } from "@clerk/nextjs/server"

import { ensureFeed, getCursorColor, getLiveblocksClient } from "@/lib/liveblocks"
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"
import { AI_CHAT_FEED_ID } from "@/types/tasks"

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

  // Ensured here, not lazily from the chat panel, because this route always
  // runs (and is awaited) before the client's room socket connects — so by
  // the time useCreateFeedMessage()/useFeedMessages() can run client-side,
  // "ai-chat" is guaranteed to already exist. The client SDK has no
  // equivalent to @liveblocks/node's typed LiveblocksError for telling
  // "already exists" apart from a real failure, so feed creation stays
  // server-side rather than being called from the client hook.
  await ensureFeed(liveblocks, roomId, AI_CHAT_FEED_ID)

  const user = await currentUser()
  const name = user?.fullName || identity.email || "Anonymous"
  const avatar = user?.imageUrl ?? ""
  const color = getCursorColor(identity.userId)

  const { status, body: responseBody } = await liveblocks.identifyUser(identity.userId, {
    userInfo: { name, avatar, color },
  })

  return new Response(responseBody, { status })
}
