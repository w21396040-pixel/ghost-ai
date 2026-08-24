"use client"

import { useFeedMessages, useOthers } from "@liveblocks/react"

import {
  AI_AGENT_USER_ID,
  AI_STATUS_FEED_ID,
  isTaskStatusMessage,
  type TaskStatusMessage,
} from "@/types/tasks"

// Room-shared AI activity, assembled from two different Liveblocks
// primitives rather than one new bit of parallel local state (per this
// chapter's own "follow best practices for feeds/presence" instruction):
// - `isThinking` is read straight off the AI agent's own Presence entry
//   (set by trigger/design-agent.ts's setPresence calls) — presence is
//   inherently shared with everyone in the room, so no extra plumbing is
//   needed to make it "visible to everyone."
// - `status` is the latest message on the "ai-status-feed" Feed, which
//   persists (unlike a broadcastEvent) so a client that opens the sidebar
//   mid-run, or after the run has already finished, still sees the current
//   status.
export function useAiStatus() {
  const isThinking = useOthers((others) =>
    others.some((other) => other.id === AI_AGENT_USER_ID && other.presence.thinking)
  )

  const { messages } = useFeedMessages(AI_STATUS_FEED_ID)

  // Reduced by `createdAt` rather than trusting array order, since messages
  // can arrive out of order as the feed streams in.
  const latest = messages?.reduce<(typeof messages)[number] | undefined>(
    (latest, message) => (!latest || message.createdAt > latest.createdAt ? message : latest),
    undefined
  )

  const status: TaskStatusMessage | null =
    latest && isTaskStatusMessage(latest.data) ? latest.data : null

  return { isThinking, status }
}
