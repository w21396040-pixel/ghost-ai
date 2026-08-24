import { z } from "zod"

// Shared identity for Ghost AI's autonomous room participant — used both
// server-side (trigger/design-agent.ts, setting presence/feed messages) and
// client-side (hooks/use-ai-status.ts, matching the agent's own presence
// entry among `useOthers()`), so the two sides can never drift on the raw
// id/name strings.
export const AI_AGENT_USER_ID = "ai-agent"
export const AI_AGENT_NAME = "Ghost AI"

// The single Liveblocks feed every background task (design generation today,
// spec generation later) publishes its progress to — one feed, reused across
// task kinds, not one feed per task type.
export const AI_STATUS_FEED_ID = "ai-status-feed"

// Room-scoped collaborative chat between the humans in the room — deliberately
// a separate feed from AI_STATUS_FEED_ID (25-sidebar-chat-feed's own "keep it
// separate" requirement): status messages are ephemeral system progress the
// design agent publishes, chat messages are user-authored conversation, and
// mixing the two into one feed would make neither easy to render or reason
// about on its own.
export const AI_CHAT_FEED_ID = "ai-chat"

export const TASK_STATUSES = ["start", "processing", "complete", "error"] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

// The feed message payload shape (liveblocks.config.ts's `FeedMessageData`).
// Kept to a status enum plus an optional human-readable line so it stays
// generic enough for spec generation to reuse later without a new feed or a
// new message shape.
export interface TaskStatusMessage {
  status: TaskStatus
  text?: string
}

// Feed message `data` arrives over the wire as untrusted `Json` — the
// declared `FeedMessageData` type in liveblocks.config.ts is a compile-time
// assertion only, not a runtime guarantee (the same boundary code-standards.md
// already flags for model output) — so any consumer must validate before
// trusting/rendering it.
export function isTaskStatusMessage(value: unknown): value is TaskStatusMessage {
  if (typeof value !== "object" || value === null) return false
  const record = value as Record<string, unknown>
  if (!TASK_STATUSES.includes(record.status as TaskStatus)) return false
  if (record.text !== undefined && typeof record.text !== "string") return false
  return true
}

// The "ai-chat" feed message payload shape (liveblocks.config.ts's
// `FeedMessageData`, alongside `TaskStatusMessage`). `role` is kept as a
// `"user" | "assistant"` union — matching the pre-existing local-only
// ChatMessage shape components/editor/ai-architect-panel.tsx already used —
// even though this chapter only ever sends `"user"` messages (no AI replies
// yet, per its own scope limit), so a future chapter can append assistant
// replies to this same feed without a schema change. `senderId` isn't in the
// spec's literal "sender, role, content, timestamp" list, but is required to
// tell "my messages" from other participants' apart reliably in the UI —
// matching by the display-name `sender` string alone would misattribute
// messages between two participants who happen to share a name.
export const chatMessageSchema = z.object({
  senderId: z.string().min(1),
  sender: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
  timestamp: z.number(),
})

export type ChatMessageData = z.infer<typeof chatMessageSchema>
