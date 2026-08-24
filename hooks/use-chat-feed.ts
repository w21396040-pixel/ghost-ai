"use client"

import { useMemo, useState } from "react"
import { useCreateFeedMessage, useFeedMessages } from "@liveblocks/react"
import { useUser } from "@clerk/nextjs"

import {
  AI_AGENT_NAME,
  AI_AGENT_USER_ID,
  AI_CHAT_FEED_ID,
  chatMessageSchema,
  type ChatMessageData,
} from "@/types/tasks"

export interface ChatFeedEntry {
  id: string
  createdAt: number
  data: ChatMessageData
}

// Room-shared chat, backed by the "ai-chat" Feed (app/api/liveblocks-auth's
// route ensures it exists before any client can reach this hook — see that
// route's comment). Kept separate from hooks/use-ai-status.ts's "ai-status-feed"
// reads/writes entirely — different feed id, different payload shape, no
// shared state between the two.
export function useChatFeed() {
  const { messages } = useFeedMessages(AI_CHAT_FEED_ID)
  const createFeedMessage = useCreateFeedMessage()
  const { user } = useUser()
  const [sendError, setSendError] = useState(false)

  // Each message is validated through chatMessageSchema before being trusted
  // (feed data arrives over the wire as untrusted Json, same boundary
  // isTaskStatusMessage already guards for the status feed) — anything that
  // doesn't parse is dropped rather than rendered or crashing the panel.
  // Ordered by the feed's own `createdAt`, not array order, since messages
  // can arrive out of order as the feed streams in (same reasoning
  // use-ai-status.ts's "latest by createdAt" reduce already applied).
  const validMessages = useMemo(() => {
    const parsed: ChatFeedEntry[] = []
    for (const message of messages ?? []) {
      const result = chatMessageSchema.safeParse(message.data)
      if (result.success) {
        parsed.push({ id: message.id, createdAt: message.createdAt, data: result.data })
      }
    }
    return parsed.sort((a, b) => a.createdAt - b.createdAt)
  }, [messages])

  const currentUserId = user?.id ?? null

  const sendMessage = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return

    setSendError(false)
    try {
      await createFeedMessage(AI_CHAT_FEED_ID, {
        senderId: user?.id ?? "anonymous",
        sender: user?.fullName || user?.primaryEmailAddress?.emailAddress || "Anonymous",
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      })
    } catch {
      setSendError(true)
    }
  }

  // Same feed, same schema, "assistant" side of the pre-existing role union
  // (types/tasks.ts) — used by components/editor/ai-architect-panel.tsx to
  // post the design agent's own final message once a triggered run
  // completes, rather than a second/parallel message concept.
  const sendAssistantMessage = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return
    try {
      await createFeedMessage(AI_CHAT_FEED_ID, {
        senderId: AI_AGENT_USER_ID,
        sender: AI_AGENT_NAME,
        role: "assistant",
        content: trimmed,
        timestamp: Date.now(),
      })
    } catch {
      // Best-effort: the run itself already finished/failed and the user
      // already sees that via the status pill, so a missing final chat
      // message isn't worth surfacing as a second, separate error.
    }
  }

  return { messages: validMessages, sendMessage, sendAssistantMessage, sendError, currentUserId }
}
