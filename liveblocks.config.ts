// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
import type { ChatMessageData, TaskStatusMessage } from "@/types/tasks"

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      cursor: { x: number; y: number } | null
      thinking: boolean
    }

    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: Record<string, never>

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string
      info: {
        name: string
        avatar: string
        color: string
      }
    }

    // Custom events, for useBroadcastEvent, useEventListener. Unused —
    // 24-ai-presence-state migrated the design agent's status updates onto
    // the "ai-status-feed" Feed below instead (see FeedMessageData): a Feed's
    // messages persist and are fetched on subscribe, so a client that opens
    // the sidebar mid-run or after the run finishes still sees the current
    // status, which a transient broadcastEvent can't offer.
    RoomEvent: Record<string, never>

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: Record<string, never>

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    RoomInfo: Record<string, never>

    // Custom metadata set on a feed itself, for createFeed/updateFeedMetadata.
    // Unused so far — no feed sets metadata yet.
    FeedMetadata: Record<string, never>

    // Payload for each message in a feed, for useFeedMessages/createFeedMessage.
    // One union across every feed this app uses, keyed apart by which feed id
    // a consumer subscribes to (not a discriminated union — feeds don't
    // otherwise identify themselves in the message payload): the design
    // agent publishes TaskStatusMessage to "ai-status-feed"
    // (hooks/use-ai-status.ts reads it back), and the sidebar's chat panel
    // publishes ChatMessageData to "ai-chat" (hooks/use-chat-feed.ts reads it
    // back).
    FeedMessageData: TaskStatusMessage | ChatMessageData
  }
}

export {}
